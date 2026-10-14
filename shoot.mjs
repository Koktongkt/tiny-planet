// Screenshot runner. node shoot.mjs [name,name,...]   (extra: node shoot.mjs --custom '[["out.png","?query",holdW]]')
import {chromium} from 'playwright'
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errs=[]
const url={day:'?t=day&view=orbit',dusk:'?t=dusk&view=orbit',night:'?t=night&view=orbit','character-closeup':'?t=day&view=hero',villagers:'?t=day&view=lineup',details:'?t=day&view=detail',
 'zones-lake-waterfall':'?t=day&view=zone&z=lake-waterfall','zones-terraces-train':'?t=day&view=zone&z=terraces-train&trainAt=2.75','zones-harbour-ruins':'?t=day&view=zone&z=harbour-ruins','zones-forest-giant':'?t=day&view=zone&z=forest-giant','zones-meadow-mills':'?t=day&view=zone&z=meadow-mills',
 'village-square':'?t=day&view=zone&z=square','harbour-villagers':'?t=day&view=zone&z=harbour-people'}
let jobs
if(process.argv[2]==='--custom') jobs=JSON.parse(process.argv[3]).map(([f,qs,keys,vw])=>({f,qs,keys,vw}))
else jobs=(process.argv[2]?process.argv[2].split(','):Object.keys(url)).map(t=>({f:`screenshots/${t}.png`,qs:url[t],keys:t==='character-closeup',vw:[1280,800]}))
for(const j of jobs){const [w,h]=j.vw||[1000,700];const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
 const t0=Date.now();await p.goto('http://localhost:5190/'+j.qs);await p.waitForFunction(()=>window.__calls>0,null,{timeout:120000}).catch(()=>{});const ready=Date.now()-t0
 await p.waitForTimeout(14000);if(j.keys){await p.keyboard.down('w');await p.waitForTimeout(9000)}
 const st=await p.evaluate(()=>({calls:window.__calls,tris:window.__tris,bake:window.__bake}))
 await p.screenshot({path:j.f,timeout:120000});console.log(j.f,'firstFrame',ready+'ms',JSON.stringify(st));await p.close()}
console.log('ERR',errs.slice(0,5).join('\n'));await b.close()
