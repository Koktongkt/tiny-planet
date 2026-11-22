import {chromium} from 'playwright'
import path from 'node:path'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})
const f='file://'+path.resolve('ui-mocks/mock.html')
for(const s of ['A','B'])for(const sc of ['hud','bag']){
const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1.5})
await p.goto(`${f}?s=${s}&scene=${sc}`);await p.waitForTimeout(800)
await p.screenshot({path:`ui-mocks/${s}-${sc}.jpg`,quality:90});await p.close()}
await b.close()
