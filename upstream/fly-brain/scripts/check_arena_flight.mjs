// Actual UI request -> brain/physics worker -> airborne geometry -> contact landing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const out=args.out||'/tmp/fly-arena-flight';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={browser:browser.version(),errors:[],gpu:args.gpu!=='0'};
try {
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))report.errors.push(m.text());});
  await page.goto(`${args.url||'http://localhost:5173'}/arena.html${args.gpu==='0'?'?gpu=0':''}`);
  await page.waitForFunction(()=>window.__arena?.flies[0]?.last,null,{timeout:120000});
  await page.click('#takeoff');
  await page.waitForFunction(()=>__arena.flies[0].last.takeoffPending);
  await page.waitForFunction(()=>document.querySelector('#takeoff').textContent.includes('press Run'));
  await page.evaluate(()=>{
    window.__flightTrace=[];
    window.__flightSampler=setInterval(()=>{const f=__arena.flies[0],s=f.last;if(!s)return;
      __flightTrace.push({t:s.t,z:s.pos[2],flying:s.flying,phase:s.cmd?.flight,flights:s.flights,
        up:__arena.THREE?f.bodies.thorax.matrix.elements[10]:null,pending:s.takeoffPending});},50);
  });
  await page.click('#play');
  await page.waitForFunction(()=>__arena.flies[0].last.flying&&__arena.flies[0].last.pos[2]>.25,null,{timeout:120000});
  report.airborne=await page.evaluate(()=>{
    const f=__arena.flies[0],s=f.last;
    return {t:s.t,z:s.pos[2],flights:s.flights,pending:s.takeoffPending,
      blur:f.wingBlur.every(w=>w.blur.visible&&!w.src.visible&&w.blur.count===8)};
  });
  assert.ok(report.airborne.blur&&!report.airborne.pending);
  await page.screenshot({path:`${out}/airborne.png`});
  await page.waitForFunction(()=>!__arena.flies[0].last.flying&&__arena.flies[0].last.flights>=1,null,{timeout:120000});
  await page.click('#play');
  report.landed=await page.evaluate(()=>{
    clearInterval(__flightSampler);const f=__arena.flies[0];
    return {t:f.last.t,z:f.last.pos[2],flying:f.last.flying,up:f.bodies.thorax.matrix.elements[10],
      restored:f.wingBlur.every(w=>!w.blur.visible&&w.src.visible),trace:__flightTrace};
  });
  assert.ok(report.landed.z<.2&&report.landed.up>.75&&report.landed.restored);
  assert.ok(report.landed.trace.some(s=>s.phase==='flying'),'Must enter cruise');
  assert.ok(report.landed.trace.some(s=>s.phase==='landing'),'Must enter landing');
  await page.screenshot({path:`${out}/landed.png`});
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify({airborne:report.airborne,landed:{...report.landed,trace:report.landed.trace.length}}));
} finally {await browser.close();await fs.writeFile(`${out}/results.json`,JSON.stringify(report,null,2)+'\n');}
