import pw from '/opt/npm-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import fs from 'fs';
const [,, out, Nstr, only] = process.argv; const N = +Nstr;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://127.0.0.1:5173/dev/hero-render.html'); await p.waitForFunction(() => window.ready, null, { timeout: 90000 });
const frames = only ? only.split(',').map(Number) : [...Array(N).keys()];
const t0 = Date.now();
for (const i of frames) {
  const d = await p.evaluate(([i, N]) => window.frame(i, N), [i, N]);
  fs.writeFileSync(`${out}/f_${String(i).padStart(4, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
  if (i % 20 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await b.close();
