// Real Chrome rendering checks + reproducible warm-frame profiling. Start `npm run dev` first.
// Optional: --baseline=/path/to/original/source/directory (fly.js and arena.js), --frames=180, --dpr=2.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const args = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const baseline = args.baseline;
const out = args.out || '/tmp/fly-rendering';
const frames = Number(args.frames || 180);
const base = args.url || 'http://localhost:5173';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args:args.uncapped==='1'?['--disable-frame-rate-limit','--disable-gpu-vsync']:[] });
const errors = [], results = [], fixtures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: Number(args.dpr || 1) });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /WebGL|shader|THREE/.test(m.text())) errors.push(m.text()); });
  if (baseline) for (const name of ['fly', 'arena']) {
    let source = await fs.readFile(path.join(baseline, `${name}.js`), 'utf8');
    if (name === 'arena') source = source.replace('camera, controls, flies, env, THREE };', 'camera, controls, flies, env, THREE, renderer, scene };');
    // Let the running Vite server resolve bare imports/workers for the original source as well.
    const fixture = `src/.render-baseline-${name}-${process.pid}.js`;
    await fs.writeFile(fixture, source); fixtures.push(fixture);
    await page.route(`**/src/${name}.js*`, async route => {
      const response = await route.fetch({ url: `${base}/${fixture}` });
      await route.fulfill({ response });
    });
  }
  async function open(name, query = '') {
    await page.goto(`${base}/${name}.html${query}`);
    await page.waitForFunction(n => n === 'fly' ? !!window.__fly : !!window.__arena?.flies[0]?.last, name, { timeout: 120000 });
    await page.waitForTimeout(1200);
  }
  async function measure(name, handle) {
    await page.waitForTimeout(args.target ? 5000 : 1000);
    const result = await page.evaluate(async ({ handle, frames, gpuTimers }) => {
      const h = window[handle], renderer = h.renderer, gl = renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      // ANGLE/Metal query instrumentation serialises GPU work on some drivers. Keep it opt-in
      // and never use instrumented frame intervals as the ordinary FPS measurement.
      const timer = gpuTimers ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
      const target = h.composer || renderer, original = target.render;
      const cpu = [], gpu = [], draws = [], triangles = [], queued = [], intervals = [];
      const startCounters = h.metrics && { ...h.metrics };
      renderer.info.autoReset = false;
      function collect() {
        while (queued.length && gl.getQueryParameter(queued[0], gl.QUERY_RESULT_AVAILABLE)) {
          const query = queued.shift();
          if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(query);
        }
      }
      target.render = function (...args) {
        if (timer) collect();
        const query = timer && queued.length < 8 ? gl.createQuery() : null;
        if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        renderer.info.reset(); const t = performance.now();
        try { return original.apply(this, args); } finally {
          cpu.push(performance.now() - t); draws.push(renderer.info.render.calls); triangles.push(renderer.info.render.triangles);
          if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); queued.push(query); }
        }
      };
      let last = performance.now();
      for (let i = 0; i < frames; i++) { await new Promise(requestAnimationFrame); const t = performance.now(); intervals.push(t - last); last = t; }
      target.render = original;
      if (timer) { collect(); for (const q of queued) gl.deleteQuery(q); }
      const stats = values => {
        if (!values.length) return null;
        values.sort((a, b) => a - b);
        return { median: +values[Math.floor(values.length * .5)].toFixed(3), p95: +values[Math.floor(values.length * .95)].toFixed(3), mean: +(values.reduce((a,b)=>a+b,0)/values.length).toFixed(3) };
      };
      return { frameMs: stats(intervals), cpuSubmitMs: stats(cpu), gpuMs: stats(gpu), calls: stats(draws), triangles: stats(triangles),
        gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), dpr: renderer.getPixelRatio(),
        viewport: [innerWidth, innerHeight], ao: h.gtao?.enabled, detail: h.flies?.map(f => f.getDetail?.()),
        counters: h.metrics && Object.fromEntries(['shadowUpdates', 'brainUploads', 'brainDraws'].filter(k=>k in h.metrics).map(k=>[k,h.metrics[k]-startCounters[k]])),
      };
    }, { handle, frames, gpuTimers: args.gpuTimers === '1' });
    results.push({ name, ...result }); console.log(name, JSON.stringify(result));
    if(args.target && 1000/result.frameMs.mean<Number(args.target)) errors.push(`${name}: ${(1000/result.frameMs.mean).toFixed(1)} FPS is below ${args.target}`);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  }
  await open('fly');
  if (!baseline) assert.equal(await page.evaluate(() => {
    const texture = __fly.appearance.meshes.find(m => m.name === 'head').material.userData.u.uCuticleDetail?.value;
    return texture?.image?.width === 512 && texture.generateMipmaps;
  }), true, 'Blender detail tile must be loaded with mipmaps');
  await measure('fly-rest', '__fly');
  await page.click('[data-wings=flight]'); await page.click('[data-bg=dark]');
  await page.waitForTimeout(2000); await measure('fly-flight-dark', '__fly');
  await page.click('[data-sex=f]'); await page.click('[data-wings=spread]');
  await page.uncheck('#dof'); await page.uncheck('#hairs'); await page.check('#labels');
  await page.mouse.move(730, 440); await page.waitForTimeout(1000);
  assert.equal(await page.locator('#sexLabel').textContent(), 'female');
  assert.equal(await page.evaluate(() => __fly.bokeh.enabled), false);
  if (!baseline) assert.equal(await page.evaluate(() => __fly.appearance.sexComb.every(m => !m.visible)), true);
  await page.screenshot({ path: path.join(out, 'fly-female-spread.png') });

  await open('arena'); await measure('arena-default-paused', '__arena');
  await page.evaluate(() => {
    document.querySelector('#follow').checked = false;
    const {camera,controls,flies} = __arena, p = flies[0].last.pos;
    controls.target.set(p[0],p[1],.12); camera.position.set(p[0]+.55,p[1]-.62,.48); controls.update();
  });
  await measure('arena-macro-paused', '__arena');
  if (!baseline) {
    const result = await page.evaluate(() => {
      const f = __arena.flies[0];
      return { level: f.getDetail(), hairs: f.hairs.reduce((n,m)=>n+(m.visible?m.count:0),0), films: f.meshes.filter(m=>/membrane/.test(m.name)).every(m=>m.visible&&!m.castShadow&&m.material.forceSinglePass) };
    });
    assert.equal(result.level, 2); assert.ok(result.hairs > 30000); assert.ok(result.films);
  }
  await page.check('#follow');
  await page.click('#play'); const t0 = await page.evaluate(() => __arena.flies[0].last.t);
  await measure('arena-macro-running', '__arena');
  await page.waitForFunction(t => __arena.flies[0].last.t > t, t0, {timeout:30000});
  await page.click('#play');
  await page.waitForTimeout(500); // Drain the last in-flight worker pose after pausing.
  if (!baseline) {
    // Renderer-only flight fixture: exercises the worker pose format without claiming a takeoff occurred.
    await page.evaluate(() => {
      const {camera,controls,flies}=__arena, f=flies[0], p=f.last.pos;
      window.__savedPose=f.last; f.last={...f.last,flying:true};
      controls.target.set(...p); camera.position.set(p[0]+.55,p[1]-.62,p[2]+.36); controls.update();
    });
    await measure('arena-flight-fixture', '__arena');
    assert.equal(await page.evaluate(() => __arena.flies[0].wingBlur.every(w=>w.blur.visible&&!w.src.visible&&w.blur.count===8)), true);
    await page.evaluate(() => { __arena.flies[0].last=window.__savedPose; delete window.__savedPose; });
  }
  await page.evaluate(() => {
    document.querySelector('#follow').checked=false;
    const {camera,controls} = __arena; controls.target.set(0,0,.1);camera.position.set(3,-4,4);controls.update();
  });
  await measure('arena-wide-paused', '__arena');
  if (!baseline) assert.equal(await page.evaluate(() => __arena.flies[0].getDetail()), 0);

  await open('arena', '?env=social');
  if (!baseline) {
    const shared = await page.evaluate(() => {
      const [a,b]=__arena.flies;
      return a.meshes[0].userData.high===b.meshes[0].userData.high && a.hairs[0].instanceMatrix===b.hairs[0].instanceMatrix
        && a.meshes[0].material.userData.u.uCuticleDetail.value===b.meshes[0].material.userData.u.uCuticleDetail.value;
    });
    assert.ok(shared, 'Flies should share immutable surface and hair buffers');
  }
  await measure('arena-social-paused', '__arena');
  const socialStart = await page.evaluate(() => __arena.flies.map(f => f.last.t));
  await page.click('#play'); await measure('arena-social-running', '__arena'); await page.click('#play');
  assert.equal(await page.evaluate(start => __arena.flies.every((f, i) => f.last.t > start[i]), socialStart), true,
    'All social simulation workers must advance');
  if (!baseline) {
    await page.evaluate(async()=>{
      const f=await __arena.addFly([0,0],0,'f');
      document.querySelector('#follow').checked=false;
      const {camera,controls}=__arena; controls.target.set(0,0,.12);camera.position.set(.55,-.62,.48);controls.update();
    });
    await page.waitForTimeout(1500);
    const sex = await page.evaluate(()=>{
      const a=__arena.flies[0],b=__arena.flies.at(-1),get=(f,n)=>f.meshes.find(m=>m.name===n).material.userData.u.uBand.value.z;
      return {male:get(a,'abdomen_6'),female:get(b,'abdomen_6'),comb:b.sexComb.some(m=>m.visible)};
    });
    assert.ok(sex.male>1 && sex.female<1 && !sex.comb);
    const before=await page.evaluate(()=>__arena.renderer.info.memory);
    await page.evaluate(()=>{for(let i=0;i<5;i++) __arena.rebuildEnv();}); await page.waitForTimeout(200);
    const after=await page.evaluate(()=>__arena.renderer.info.memory);
    assert.ok(after.geometries<=before.geometries+1 && after.textures<=before.textures+1,'Placement must release old environment GPU resources');
    await page.setViewportSize({width:900,height:700});await page.waitForTimeout(500);
    assert.ok(await page.evaluate(()=>Math.abs(__arena.camera.aspect-900/700)<1e-6));
    await page.screenshot({path:path.join(out,'arena-female-resized.png')});
  }
  assert.deepEqual(errors, [], 'No JavaScript or shader errors');
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ baseline: !!baseline, browser: browser.version(), frames, results, errors }, null, 2));
  await browser.close();
  for (const fixture of fixtures) await fs.unlink(fixture);
}
