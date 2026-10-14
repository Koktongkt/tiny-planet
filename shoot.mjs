import {chromium} from 'playwright'
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errs=[];const only=(process.argv[2]||'day,dusk,night,character-closeup,cape-back,details').split(',')
const url={day:'?t=day&view=orbit',dusk:'?t=dusk&view=orbit',night:'?t=night&view=orbit','character-closeup':'?t=day','cape-back':'?t=day',details:'?t=day&view=detail'}
for(const t of only){const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
 await p.goto('http://localhost:5190/'+url[t]);await p.waitForTimeout(13000)
 if(t==='character-closeup'){await p.keyboard.down('w');await p.waitForTimeout(2500);await p.keyboard.down('a');await p.waitForTimeout(600);await p.keyboard.up('a');await p.waitForTimeout(1500)}
 if(t==='cape-back'){await p.keyboard.down('w');await p.waitForTimeout(3500);await p.keyboard.down('d');await p.waitForTimeout(700);await p.keyboard.up('d')}
 await p.screenshot({path:`screenshots/${t}.png`,timeout:120000});console.log(t);await p.close()}
console.log('ERR',errs.join('\n'));await b.close()
