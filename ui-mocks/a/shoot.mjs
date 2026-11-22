import {chromium} from 'playwright'
import path from 'node:path'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})
const dir=path.resolve('ui-mocks/a'), [,, ...only]=process.argv
const shots=[['A2-hud-day','hud.html?t=day&in=desk'],['A2-hud-touch','hud.html?t=day&in=touch&wx=breezy'],['A2-hud-night','hud.html?t=night&in=desk'],['A2-bag','hud.html?t=day&scene=bag'],['A2-system','system.html',1400]]
for(const [n,u,h] of shots){ if(only.length&&!only.includes(n))continue
const p=await b.newPage({viewport:{width:1280,height:h||720},deviceScaleFactor:1.5})
await p.goto('file://'+dir+'/'+u);await p.waitForTimeout(700)
await p.screenshot({path:dir+'/'+n+'.jpg',quality:90,fullPage:true});await p.close()}
await b.close()
