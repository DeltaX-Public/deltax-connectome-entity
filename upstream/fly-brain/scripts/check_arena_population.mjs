// Twelve independent brains/physics worlds, fixed placement/camera, real Chrome warm-frame timing.
// npm run dev; node scripts/check_arena_population.mjs [--baseline=1] [--frames=300]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const args = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const out = args.out || '/tmp/fly-arena-population', frames = +(args.frames || 300);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { browser: browser.version(), frames, baseline: args.baseline === '1', errors: [], backends: [], samples: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: +(args.dpr || 1) });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) report.errors.push(m.text());
    if (/brain backend|falling back/.test(m.text())) report.backends.push(m.text());
  });
  await page.goto(`${args.url || 'http://localhost:5173'}/arena.html${args.gpu === '0' ? '?gpu=0' : ''}`);
  await page.waitForFunction(() => window.__arena?.flies[0]?.last, null, { timeout: 120000 });
  await page.evaluate(() => { document.querySelector('#follow').checked = false; });
  async function measure(name) {
    await page.waitForTimeout(2500);
    const sample = await page.evaluate(async ({ name, frames }) => {
      const h = __arena, gl = h.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      const start = h.flies.map(f => f.last.t), time = performance.now();
      const interval = [], calls = [], triangles = [], cpu = [];
      let minFlying=Infinity,maxFlying=0;
      let last = time;
      for (let k = 0; k < frames; k++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(); interval.push(now - last); last = now;
        calls.push(h.metrics.calls); triangles.push(h.metrics.triangles); cpu.push(h.metrics.renderMs);
        const flying=h.flies.filter(f=>f.last.flying).length;minFlying=Math.min(minFlying,flying);maxFlying=Math.max(maxFlying,flying);
      }
      const stats = v => { v.sort((a,b) => a-b); return { mean: v.reduce((a,b) => a+b,0)/v.length, p95:v[Math.floor(v.length*.95)] }; };
      return { name, interval:stats(interval), calls:stats(calls), triangles:stats(triangles), cpu:stats(cpu),
        dpr:h.renderer.getPixelRatio(), gpu:ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
        detail:h.flies.map(f => f.getDetail()), simMs:h.flies.map((f,i) => f.last.t-start[i]), wallMs:last-time,
        memory:h.renderer.info.memory, batches:h.batches?.stats, minFlying,maxFlying };
    }, { name, frames });
    report.samples.push(sample); console.log(JSON.stringify(sample));
    await page.screenshot({ path: `${out}/${name}.png` });
    if (name.includes('running')) assert.ok(sample.simMs.every(t => t > 0), 'Every fly must advance');
  }
  await measure('one-paused');
  await page.evaluate(async () => {
    for (let i = 1; i < 12; i++) {
      const a = (i-1) * Math.PI * 2 / 11;
      await __arena.addFly([.8*Math.cos(a),.8*Math.sin(a)],a+Math.PI,i%3===0?'f':'m');
    }
    const { camera, controls } = __arena;
    controls.target.set(0,0,.12); camera.position.set(2.2,-3,2.5); controls.update();
  });
  await page.waitForFunction(() => __arena.flies.length === 12 && __arena.flies.every(f => f.last));
  await measure('twelve-paused');
  if(args.takeoff==='1') await page.evaluate(()=>{for(const f of __arena.flies)f.worker.postMessage({type:'takeoff'});});
  await page.click('#play'); await page.waitForTimeout(10000);
  if(args.takeoff==='1') await page.waitForFunction(()=>__arena.flies.filter(f=>f.last.flying).length>=6,null,{timeout:120000});
  await measure('twelve-running');
  await page.click('#play'); await page.waitForTimeout(500);
  await page.evaluate(() => {
    const {camera,controls,flies}=__arena, p=flies[0].last.pos;
    controls.target.set(...p); camera.position.set(p[0]+.48,p[1]-.5,p[2]+.3); controls.update();
  });
  await measure('twelve-macro-paused');
  if (!report.baseline) {
    const checks = await page.evaluate(() => {
      const h=__arena, a=h.flies[0], b=h.flies[3], head=a.meshes.find(m=>m.name==='head');
      const band=f=>f.meshes.find(m=>m.name==='abdomen_6').material;
      return { proxies:h.flies.every(f=>f.bodyNames.filter(n=>n.startsWith('proxy')).length===11),
        baked:!!head.geometry.attributes.aCyclesLight, high:head.userData.high.index.count,
        low:head.userData.low.index.count, shared:a.meshes[0].userData.high===b.meshes[0].userData.high,
        male:band(a).userData.u.uBand.value.z, female:band(b).userData.u.uBand.value.z,
        femaleBake:band(b).customProgramCacheKey().includes('cycles'),
        hairBake:a.hairs.filter(m=>m.visible).every(m=>!!m.geometry.attributes.aHairLight) };
    });
    report.checks=checks;
    assert.ok(checks.proxies && checks.baked && checks.low<checks.high && checks.shared && checks.femaleBake && checks.hairBake);
    assert.ok(checks.male>1 && checks.female<1);
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await fs.writeFile(`${out}/results.json`,JSON.stringify(report,null,2)+'\n');
}
