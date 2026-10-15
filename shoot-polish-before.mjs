import {chromium} from 'playwright'
const PORT=5196, OUT='/workspace/tiny-planet-perf/polish/before'
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errs=[]
const J=[
  ['home','?t=day&out&at=home&nosave',5000],
  ['forest','?t=day&out&at=forest&nosave',5000],
  ['lake','?t=day&out&at=lake&nosave',5000],
  ['orbit','?t=day&view=orbit&nosave',4000],
  ['interior','?t=day&nosave',7000],
  ['cat-close','?t=day&nosave&cat=sitnear&petcam=-1.0',8000],
  ['dog-close','?t=day&nosave&out&dog=sit&dogcam=0.8',8000],
  ['pets-together','?t=day&nosave&out&dog=sit&dogcam=1.2',6000], // just dog outdoors; cat is indoors
  ['cat-distant','?t=day&nosave&cat=sitnear&petcam=2.8',8000],
  ['dog-distant','?t=day&nosave&out&dog=sit&dogcam=2.5',8000],
  ['village','?t=day&out&at=village&nosave',9000],
  ['mobile-out','?t=day&out&at=home&nosave&touch=1',5000,null,0,null,0,[390,844]],
]
for(const [name,qs,wait,js,jsWait,key,keyMs,vw] of J){
  const [w,h]=vw||[1280,800]
  const p=await b.newPage({viewport:{width:w,height:h},...(vw?{isMobile:true,hasTouch:true,deviceScaleFactor:2}:{})})
  p.on('pageerror',e=>errs.push(name+': '+e.message)); p.on('console',m=>m.type()==='error'&&errs.push(name+': '+m.text()))
  await p.goto(`http://localhost:${PORT}/${qs}&enter`); await p.waitForFunction(()=>window.__calls>0,null,{timeout:120000}).catch(()=>{})
  await p.waitForTimeout(wait)
  if(key){await p.keyboard.down(key);await p.waitForTimeout(keyMs);await p.keyboard.up(key);await p.waitForTimeout(400)}
  if(js){await p.evaluate(js);await p.waitForTimeout(jsWait||1500)}
  const st=await p.evaluate(()=>({calls:window.__calls,tris:window.__tris,cat:window.__cat?.state,dog:window.__dog?.state}))
  await p.screenshot({path:`${OUT}/${name}.png`}); console.log(name,JSON.stringify(st)); await p.close()
}
console.log('ERR',errs.slice(0,10).join('\n')); await b.close()
