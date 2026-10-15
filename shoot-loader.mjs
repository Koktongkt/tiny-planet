// Loader screenshots on a throttled profile (Fast 3G + 4x CPU) so each stage is visible for real.
import {chromium} from 'playwright'
const url=process.argv[2]||'http://localhost:5191/?nosave', out=process.argv[3]||'screenshots', pfx=process.argv[4]||'loader'
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const ctx=await b.newContext({viewport:{width:1280,height:800}}),p=await ctx.newPage(),c=await ctx.newCDPSession(p)
await c.send('Network.enable');await c.send('Network.setCacheDisabled',{cacheDisabled:true})
await c.send('Network.emulateNetworkConditions',{offline:false,latency:562.5,downloadThroughput:1.6e6/8*.9,uploadThroughput:750e3/8*.9});await c.send('Emulation.setCPUThrottlingRate',{rate:4})
const t0=Date.now();const mp=await ctx.newPage();mp.goto(url+'&bootpause=shaders').catch(()=>{});await mp.waitForFunction(()=>window.__loader&&window.__loader.P.shaders>=1,null,{timeout:120000});await mp.waitForTimeout(1500);await mp.screenshot({path:`${out}/${pfx}-mid.png`});console.log('mid',await mp.evaluate(()=>window.__loader.p));await mp.close()
p.goto(url).catch(()=>{})
await p.waitForSelector('#ld',{timeout:60000});await p.waitForTimeout(1200);await p.screenshot({path:`${out}/${pfx}-early.png`});console.log('early',Date.now()-t0)
await p.waitForSelector('#go.on',{timeout:180000});await p.waitForTimeout(900);await p.screenshot({path:`${out}/${pfx}-ready.png`});console.log('ready',Date.now()-t0,await p.evaluate(()=>JSON.stringify(window.__loadMarks)))
await p.keyboard.press("Enter");await p.waitForTimeout(450);await p.screenshot({path:`${out}/${pfx}-enter.png`});await p.waitForTimeout(2000);await p.screenshot({path:`${out}/${pfx}-entered.png`});console.log('entered, loader gone:',await p.evaluate(()=>!document.getElementById('ld')))
await b.close()
