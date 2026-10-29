import pw from '/opt/npm-tools/node_modules/playwright/index.js'; const { chromium } = pw;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 400 } });
await p.goto('http://127.0.0.1:5173/dev/body-test.html'); await p.waitForFunction(() => window.ready);
const r = await p.evaluate(async (code) => { return await (new Function('return (async()=>{' + code + '})()'))(); }, process.argv[2]);
console.log(JSON.stringify(r, null, 1)); await b.close();
