// Real-camera interaction, Cycles asset loading, phone controls and warm rendering performance.
// node scripts/check_fly_page.mjs --url=http://localhost:5173 --out=/tmp/fly-page
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const args = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const base = args.url || 'http://localhost:5173', out = args.out || '/tmp/fly-page';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: Number(args.dpr || 1) });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGL|THREE/.test(m.text())) errors.push(m.text()); });
  const start = performance.now();
  await page.goto(`${base}/fly.html`);
  await page.waitForFunction(() => !!window.__fly, null, { timeout: 120000 });
  report.readyMs = Math.round(performance.now() - start);
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#viewerMode, #flyPhoto, #renderedView, [data-view-mode]').count(), 0, 'The default must be one 3D canvas, without a photo mode');
  report.assets = await page.evaluate(() => {
    const a = __fly.appearance;
    return { generator: a.blender.generator, parts: a.meshes.length, triangles: a.meshes.reduce((n,m)=>n+m.geometry.index.count/3,0),
      irradiance: a.meshes.every(m => !!m.geometry.attributes.aCyclesLight),
      bakedHairs: a.hairGroups.reduce((n,m)=>n+(m.geometry.attributes.aHairLight ? m.count : 0),0),
      lights: __fly.areaLights.length, ao: __fly.gtao?.enabled ?? false };
  });
  assert.match(report.assets.generator, /Blender.*Cycles/); assert.equal(report.assets.parts, 85);
  assert.equal(report.assets.triangles, 1169030); assert.ok(report.assets.irradiance); assert.ok(report.assets.bakedHairs > 35000);
  assert.equal(report.assets.lights, 4); assert.equal(report.assets.ao, false);
  assert.equal(page.workers().length, 0, 'The decoding worker must release its temporary memory after loading');
  report.resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname, bytes: r.transferSize })));
  assert.ok(!report.resources.some(r => /body\/renders\//.test(r.name)));
  async function profile(name) {
    await page.waitForTimeout(1500);
    const result = await page.evaluate(async () => {
      const times = []; let last = performance.now();
      for (let i=0; i<300; i++) { await new Promise(requestAnimationFrame); const now=performance.now(); times.push(now-last); last=now; }
      times.sort((a,b)=>a-b);
      const gl=__fly.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
      return { fps: 1000/(times.reduce((a,b)=>a+b,0)/times.length), medianMs:times[150], p95Ms:times[285],
        dpr:__fly.renderer.getPixelRatio(), gpu:ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL), metrics:{...__fly.metrics} };
    });
    report[name] = result;
  }
  async function assertBodyFits() {
    const bounds = await page.evaluate(() => {
      const h=__fly, p=h.camera.position.clone(); let minX=1,minY=1,maxX=-1,maxY=-1;
      for(const m of h.appearance.meshes) {
        const a=m.geometry.attributes.position;
        for(let i=0;i<a.count;i+=3) { p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).project(h.camera); minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y); }
      }
      return {minX,minY,maxX,maxY};
    });
    assert.ok(Object.values(bounds).every(v=>Math.abs(v)<.99), `Whole fly should fit: ${JSON.stringify(bounds)}`);
  }
  await assertBodyFits(); await profile('fullBody'); await page.screenshot({ path: `${out}/full-body.png` });
  const before = await page.evaluate(() => __fly.camera.position.toArray());
  await page.mouse.move(650,450); await page.mouse.down(); await page.mouse.move(970,490,{steps:24}); await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => __fly.camera.position.toArray());
  assert.ok(before.some((v,i)=>Math.abs(v-after[i])>.1), 'Dragging must orbit the actual 3D camera');
  await page.screenshot({ path: `${out}/orbit.png` });
  await page.click('#headDetail'); await profile('headDetail'); await page.screenshot({ path: `${out}/head-detail.png` });
  const oldDistance = await page.evaluate(() => __fly.camera.position.distanceTo(__fly.controls.target));
  await page.mouse.move(600,400); await page.mouse.wheel(0,-140); await page.waitForTimeout(700);
  assert.ok(await page.evaluate(d => __fly.camera.position.distanceTo(__fly.controls.target)<d, oldDistance));
  await page.click('#fullBody'); await page.click('[data-sex=f]'); await page.click('[data-wings=spread]'); await page.click('[data-bg=dark]');
  await page.uncheck('#dof'); await page.uncheck('#hairs'); await page.check('#labels');
  assert.equal(await page.evaluate(() => __fly.bokeh.enabled), false);
  assert.ok(await page.evaluate(() => __fly.appearance.sexComb.every(m=>!m.visible)));
  await page.waitForTimeout(800); await page.screenshot({ path: `${out}/female-spread-dark.png` });
  await page.check('#hairs'); await page.click('[data-wings=flight]'); await page.waitForTimeout(2000);
  assert.ok(await page.evaluate(() => __fly.state.flight>.95)); await profile('flying'); await page.screenshot({ path: `${out}/flying.png` });
  await page.click('[data-wings=rest]'); await page.click('[data-sex=m]'); await page.click('[data-bg=light]'); await page.check('#dof');
  await page.setViewportSize({ width:390,height:844 });
  await page.evaluate(() => document.querySelector('#controls').open=false); await page.click('#fullBody'); await page.waitForTimeout(1500);
  await assertBodyFits();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth), false);
  await page.screenshot({ path:`${out}/phone.png` });
  const distance = await page.evaluate(() => __fly.camera.position.distanceTo(__fly.controls.target));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:420,id:1},{x:260,y:420,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:80,y:420,id:1},{x:310,y:420,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(600);
  assert.ok(await page.evaluate(d=>__fly.camera.position.distanceTo(__fly.controls.target)<d,distance), 'Pinch should zoom the 3D camera');
  await page.click('#controls summary'); await page.click('[data-wings=spread]');
  assert.equal(await page.evaluate(()=>__fly.state.wings), 'spread');
  assert.deepEqual(errors, []); report.passed = true;
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ ...report, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed:report.passed, fullBody:report.fullBody, headDetail:report.headDetail, flying:report.flying, errors, out }));
