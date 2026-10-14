import {chromium} from 'playwright'
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errs=[]
const url={day:'?t=day&view=orbit',dusk:'?t=dusk&view=orbit',night:'?t=night&view=orbit','character-closeup':'?t=day&view=hero',villagers:'?t=day&view=lineup',details:'?t=day&view=detail',
 'zones-lake-waterfall':'?t=day&view=zone&z=lake-waterfall','zones-terraces-train':'?t=day&view=zone&z=terraces-train&trainAt=2.75','zones-harbour-ruins':'?t=day&view=zone&z=harbour-ruins','zones-forest-giant':'?t=day&view=zone&z=forest-giant','zones-meadow-mills':'?t=day&view=zone&z=meadow-mills'}
const only=process.argv[2]?process.argv[2].split(','):Object.keys(url)
for(const t of only){const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
 await p.goto('http://localhost:5190/'+url[t]);await p.waitForTimeout(16000)
 if(t==='character-closeup'){await p.keyboard.down('w');await p.waitForTimeout(2500)}
 await p.screenshot({path:`screenshots/${t}.png`,timeout:120000});console.log(t);await p.close()}
console.log('ERR',errs.slice(0,5).join('\n'));await b.close()
