// Compare production builds at the same viewport/DPR. GPU timers are a separate diagnostic:
// ANGLE/Metal can serialize timer queries, so their frame intervals are not ordinary FPS.
// node scripts/profile_fly_browser.mjs --url=http://127.0.0.1:5174 --out=/tmp/fly-before
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const args = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const base = args.url || 'http://127.0.0.1:5173', out = args.out || '/tmp/fly-profile';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: args.uncapped==='1' ? ['--disable-frame-rate-limit','--disable-gpu-vsync'] : [] });
const report = { browser: browser.version(), uncapped:args.uncapped==='1', adaptive:args.adaptive==='1', loads: [], frames: [], errors: [] };
const stats = a => { a.sort((a,b)=>a-b); return { mean:a.reduce((a,b)=>a+b,0)/a.length, median:a[Math.floor(a.length*.5)], p95:a[Math.floor(a.length*.95)], max:a.at(-1) }; };
try {
  // Fresh contexts disable the HTTP cache; OS/driver caches are intentionally not flushed.
  for (const rate of args.gpu === '1' ? [1] : [1, 1, 1, 4]) {
    const context = await browser.newContext({ viewport:{width:1400,height:900}, deviceScaleFactor:Number(args.dpr || 1) });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    page.on('pageerror', e=>report.errors.push(e.message));
    page.on('console', m=>{ if(m.type()==='error' && /THREE|WebGL|shader/i.test(m.text())) report.errors.push(m.text()); });
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled:true });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.addInitScript(() => {
      window.__loadTasks=[];
      new PerformanceObserver(list => __loadTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
      window.__frameAfterReady = new Promise(resolve => {
        function frame(){ if(window.__fly) resolve(performance.now()); else requestAnimationFrame(frame); } requestAnimationFrame(frame);
      });
    });
    await page.goto(`${base}/fly.html`);
    const readyMs = await page.evaluate(()=>__frameAfterReady);
    await page.waitForTimeout(500);
    report.loads.push(await page.evaluate(({rate,readyMs})=>({ rate, readyMs,
      longTasks:__loadTasks.filter(t=>t.start<readyMs),
      heapBytes:performance.memory?.usedJSHeapSize,
      phases:performance.getEntriesByType('mark').filter(m=>m.name.startsWith('fly:')).map(m=>({name:m.name,ms:m.startTime})),
      resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize})),
    }),{rate,readyMs}));
    if (report.loads.length===1 && args.loadOnly!=='1') {
      // Disable adaptive resolution during comparisons; the actual pixel count stays fixed.
      if(args.adaptive!=='1') await page.evaluate(()=>{ __fly.resolution.update=()=>{}; });
      for (const name of args.target ? ['full-body','head-detail','orbit','flight'] : ['full-body','head-detail','orbit']) {
        if (name==='head-detail') await page.click('#headDetail');
        if (name==='orbit') await page.evaluate(()=>{ __fly.controls.autoRotate=true; __fly.controls.autoRotateSpeed=3; });
        if (name==='flight') { await page.evaluate(()=>{__fly.controls.autoRotate=false;__fly.fullBody();});await page.click('[data-wings=flight]'); }
        await page.waitForTimeout(args.target ? 5000 : 1800);
        report.frames.push(await page.evaluate(async ({name,gpu,frames})=>{
          const h=__fly,r=h.renderer,gl=r.getContext(),ext=gpu&&gl.getExtension('EXT_disjoint_timer_query_webgl2');
          const debug=gl.getExtension('WEBGL_debug_renderer_info'),original=h.composer.render;
          const cpu=[],triangles=[],calls=[],interval=[],gpuMs=[],pending=[]; let last=performance.now();
          const shadows=h.metrics.shadowUpdates;
          function collect(){ while(pending.length && gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)) {
            const q=pending.shift(); if(!gl.getParameter(ext.GPU_DISJOINT_EXT)) gpuMs.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6); gl.deleteQuery(q);
          } }
          h.composer.render=function(...a){
            if(ext)collect(); const q=ext && pending.length<8 ? gl.createQuery():null;
            if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
            const t=performance.now(); original.apply(this,a);
            cpu.push(performance.now()-t); calls.push(r.info.render.calls);triangles.push(r.info.render.triangles);
            if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}
          };
          try { for(let i=0;i<frames;i++){ await new Promise(requestAnimationFrame);const t=performance.now();interval.push(t-last);last=t;} }
          finally { h.composer.render=original; if(ext){collect();for(const q of pending)gl.deleteQuery(q);} }
          return {name,cpu,triangles,calls,interval,gpuMs,shadowUpdates:h.metrics.shadowUpdates-shadows,
            dpr:r.getPixelRatio(),targetFps:h.resolution.targetFps,refreshInterval:h.resolution.refreshInterval,
            gpu:debug&&gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),geometry:r.info.memory};
        },{name,gpu:args.gpu==='1',frames:Number(args.frames||240)}));
        const f=report.frames.at(-1);
        for(const key of ['cpu','triangles','calls','interval','gpuMs'])f[key]=f[key].length?stats(f[key]):null;
        await page.screenshot({path:`${out}/${name}.png`});
        console.log(JSON.stringify(f));
        if(args.target && 1000/f.interval.mean<Number(args.target)) report.errors.push(`${name}: ${(1000/f.interval.mean).toFixed(1)} FPS is below ${args.target}`);
      }
    }
    await context.close();
    console.log('load', JSON.stringify({rate,readyMs,longTasks:report.loads.at(-1).longTasks}));
  }
} finally { await browser.close(); await fs.writeFile(`${out}/results.json`,JSON.stringify(report,null,2)+'\n'); }
if(report.errors.length) throw new Error(report.errors.join('\n'));
