import pw from '/opt/npm-tools/node_modules/playwright/index.js'; const { chromium } = pw;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => { if (m.type()==='error') console.log('[console]', m.text().slice(0,200)); });
await p.goto(process.argv[2]); await p.waitForFunction(() => window.ready, null, {timeout: 60000});
for (const code of process.argv.slice(3)) { const r = await p.evaluate("(async()=>{" + code + "})()"); if (r !== undefined) console.log(JSON.stringify(r)); }
await b.close();
