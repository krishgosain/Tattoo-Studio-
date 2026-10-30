import pw from '/opt/npm-tools/node_modules/playwright/index.js'; const { chromium } = pw;
const [,, url, outPrefix, ...fracs] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +(process.env.W||1280), height: +(process.env.H||720) }, deviceScaleFactor: 1 });
const seen = new Set();
p.on('console', m => { const k = m.text().slice(0, 90); if ((m.type()==='error'||m.type()==='warning') && !seen.has(k)) { seen.add(k); console.log('[console]', m.type(), m.text().slice(0, 240)); } });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(url, { waitUntil: 'load' });
await p.addStyleTag({ content: '*{backdrop-filter:none!important}' });
if (process.env.PRE) { await p.waitForTimeout(+process.env.PRE); await p.screenshot({ path: `${outPrefix}_pre.png`, timeout: 120000 }); }
await p.waitForFunction(() => window.ready === true, null, { timeout: 180000 }).catch(() => console.log('no ready'));
for (const f of fracs) {
  if (f.startsWith('#')) { await p.evaluate((sel) => { const el = document.querySelector(sel); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); }, f); }
  else { await p.evaluate((fr) => { const film = document.querySelector('[data-film]'); const span = film.offsetHeight - innerHeight * 2; window.scrollTo(0, span * fr); if (window.__film) { window.__film.p = window.__film.target = fr; } }, +f); }
  await p.waitForTimeout(+(process.env.WAIT || 3500));
  await p.screenshot({ path: `${outPrefix}_${f.replace('#','')}.png`, timeout: 120000 });
  console.log('shot', f);
}
await b.close();
