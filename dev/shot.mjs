import pw from '/opt/npm-tools/node_modules/playwright/index.js'; const { chromium } = pw;
const [,, url, out, ...cmds] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ deviceScaleFactor: 1, viewport: { width: Number(process.env.W||1400), height: Number(process.env.H||900) } });
const seen=new Set(); p.on('console', m => { const k=m.text().slice(0,80); if(seen.has(k)) return; seen.add(k); if (['error','warning'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0,300)); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
if (process.env.MOCK_AI) { const fs = await import('fs'); const b64 = fs.readFileSync(process.env.MOCK_AI).toString('base64'); await p.route('**/api/generate', async (r) => { await new Promise(res => setTimeout(res, 3000)); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: 'data:image/png;base64,' + b64, provider: 'mock', colour: false }) }); }); }
await p.goto(url, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' }).catch(()=>{});
await p.waitForFunction(() => window.ready === true, null, { timeout: 60000 }).catch(()=>console.log('no ready flag'));
let i = 0;
for (const c of cmds) {
  if (c.startsWith('js:')) { await p.evaluate("(async()=>{" + c.slice(3) + "})()"); await p.waitForTimeout(Number(process.env.WAIT||700)); }
  else if (c.startsWith('wait:')) { await p.waitForTimeout(Number(c.slice(5))); }
  else if (c.startsWith('file:')) { const [sel, f] = c.slice(5).split('|'); await p.setInputFiles(sel, f); await p.waitForTimeout(1500); }
  else if (c.startsWith('click:')) { await p.click(c.slice(6)); await p.waitForTimeout(500); }
  else if (c.startsWith('shot:')) { await p.screenshot({ path: c.slice(5), fullPage: false, timeout: 90000 }); console.log('saved', c.slice(5)); }
  else if (c.startsWith('full:')) { await p.screenshot({ path: c.slice(5), fullPage: true }); console.log('saved', c.slice(5)); }
}
if (out && out !== '-') await p.screenshot({ path: out });
await b.close();
