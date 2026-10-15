// node measure.mjs [port] : time to first rendered frame (window.__calls>0) on the built app via vite preview
import {chromium} from 'playwright'
const port=process.argv[2]||5191, runs=+(process.argv[3]||2)
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
for(let i=0;i<runs;i++){const p=await b.newPage({viewport:{width:1280,height:800}});const t0=Date.now()
 await p.goto(`http://localhost:${port}/?nosave`);const fcp=await p.evaluate(()=>new Promise(r=>{const o=new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')r(e.startTime)});o.observe({type:'paint',buffered:true});setTimeout(()=>r(-1),20000)}))
 await p.waitForFunction(()=>window.__calls>0,null,{timeout:180000,polling:100});const ff=Date.now()-t0
 const marks=await p.evaluate(()=>JSON.stringify(window.__loadMarks||{}))
 console.log(`run${i} firstPaint=${Math.round(fcp)}ms firstFrame=${ff}ms marks=${marks}`);await p.close()}
await b.close()
