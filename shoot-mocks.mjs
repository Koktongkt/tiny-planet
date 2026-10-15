import {chromium} from 'playwright'
const b=await chromium.launch();const [,, ...ms]=process.argv
for(const m of ms){for(const [s,p] of [['early',.06],['mid',.5],['ready',1]]){const pg=await b.newPage({viewport:{width:1280,height:800}});await pg.goto(`file:///workspace/tiny-planet/loader-mocks/${m}.html?p=${p}`);await pg.waitForTimeout(2800);await pg.screenshot({path:`/workspace/tiny-planet/loader-mocks/mock-${m}-${s}.png`});await pg.close()}}
await b.close()
