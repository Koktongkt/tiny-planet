import {createServer, mergeConfig} from 'vite'
import original from '../../vite.config.js'
import {readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash, randomBytes} from 'node:crypto'
import {CHARACTERS, inspect, apply, validate} from './schema.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv=process.argv.slice(2)
const selected=argv.includes('--char')?argv[argv.indexOf('--char')+1]:'ishi'
const wait=argv.includes('--wait')
if(!CHARACTERS[selected]) throw new Error('Choose --char her, fuku or ishi')
const token=randomBytes(24).toString('hex')
const hash=s=>createHash('sha256').update(s).digest('hex')
const submissions=resolve(root,'docs/characters/facebuilder-submissions')
const read=id=>readFileSync(resolve(root,CHARACTERS[id].file),'utf8')
const snapshots=new Map(Object.keys(CHARACTERS).map(id=>[id,read(id)]))
for(const [id,src] of snapshots) inspect(id,src)
let server, closing=false
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8')
function respond(res,status,data) {
  res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))
}
async function requestBody(req) {
  let body=''
  for await(const c of req){body+=c;if(body.length>65536) throw new Error('Request too large')}
  return JSON.parse(body)
}
function atomic(path,data) {
  const temp=path+'.facebuilder-'+process.pid+'.tmp'
  try {writeFileSync(temp,data,{flag:'wx'});renameSync(temp,path)}
  finally {if(existsSync(temp))unlinkSync(temp)}
}
const plugin={
  name:'tiny-planet-facebuilder',enforce:'pre',apply:'serve',
  transform(code,id){
    const path=id.replaceAll('\\','/').split('?')[0]
    for(const [char,cfg] of Object.entries(CHARACTERS)){
      if(path.endsWith('/'+cfg.file)) return {code:apply(char,code,{},{preview:true}),map:null}
    }
  },
  configureServer(vite){
    vite.middlewares.use(async(req,res,next)=>{
      const u=new URL(req.url,'http://127.0.0.1:5191')
      if(u.pathname==='/facebuilder' && req.method==='GET'){
        res.setHeader('Content-Type','text/html; charset=utf-8')
        res.setHeader('Cache-Control','no-store')
        res.end(html.replace('__FB_TOKEN__',token));return
      }
      if(!u.pathname.startsWith('/__facebuilder/'))return next()
      if(req.headers['x-facebuilder-token']!==token)return respond(res,403,{error:'Open the editor from its local URL.'})
      try{
        if(u.pathname==='/__facebuilder/schema' && req.method==='GET'){
          const id=u.searchParams.get('char')
          if(!CHARACTERS[id])return respond(res,400,{error:'Unknown character'})
          const raw=snapshots.get(id)
          return respond(res,200,{character:id,label:CHARACTERS[id].label,sourceHash:hash(raw),fields:inspect(id,raw)})
        }
        if(u.pathname==='/__facebuilder/submit' && req.method==='POST'){
          if(closing)return respond(res,409,{error:'Already submitted'})
          const {character:id,sourceHash,values,locks,notes}=await requestBody(req)
          if(!CHARACTERS[id])return respond(res,400,{error:'Unknown character'})
          const before=snapshots.get(id),current=read(id)
          if(hash(before)!==sourceHash || current!==before) return respond(res,409,{error:'Character source changed since this session began. Restart Face Builder to avoid overwriting agent changes.'})
          const changes=validate(id,before,values)
          const fields=inspect(id,before)
          const known=new Set(fields.map(f=>f.id))
          if(!Array.isArray(locks)||locks.some(k=>typeof k!=='string'||!known.has(k)))throw new Error('Invalid feature locks')
          const nextSource=apply(id,before,changes)
          // Reinspect output before changing any file.
          const final=inspect(id,nextSource)
          const stamp=new Date().toISOString()
          const receipt={schemaVersion:1,status:'approved',character:id,submittedAt:stamp,
            source:CHARACTERS[id].file,sourceHashBefore:hash(before),sourceHashAfter:hash(nextSource),
            changed:Object.fromEntries(Object.keys(changes).map(k=>[k,{before:fields.find(f=>f.id===k).value,after:changes[k]}])),
            approvedValues:Object.fromEntries(final.map(f=>[f.id,f.value])),
            lockedParameters:final.map(f=>f.id),editorLocks:locks,notes:String(notes||'').slice(0,2000),
            agentInstruction:'The user approved this appearance. Preserve the recorded values and existing rendering/animation pipeline. Review the source diff and regression screenshots; do not retune locked parameters without explicit user approval.'}
          mkdirSync(submissions,{recursive:true})
          const filename=id+'-'+stamp.replace(/[:.]/g,'-')+'.json'
          const receiptPath=resolve(submissions,filename)
          const charPath=resolve(root,CHARACTERS[id].file)
          if(existsSync(receiptPath))throw new Error('Submission already exists')
          let wrote=false
          try{
            if(nextSource!==before){atomic(charPath,nextSource);wrote=true}
            atomic(receiptPath,JSON.stringify(receipt,null,2)+'\n')
          }catch(error){if(wrote)atomic(charPath,before);throw error}
          snapshots.set(id,nextSource)
          const relative='docs/characters/facebuilder-submissions/'+filename
          const handoff={character:id,receipt:relative,source:CHARACTERS[id].file,changes:receipt.changed}
          console.log('\nFACE_BUILDER_SUBMITTED '+JSON.stringify(handoff)+'\n')
          respond(res,200,handoff)
          if(wait){closing=true;setTimeout(async()=>{await server.close();process.exit(0)},1500)}
          return
        }
        return respond(res,404,{error:'Unknown editor endpoint'})
      }catch(error){return respond(res,400,{error:error.message})}
    })
  }
}
const config=mergeConfig(original,{
  configFile:false,root,mode:'development',
  plugins:[plugin],
  server:{host:'127.0.0.1',port:5191,strictPort:true,open:false,hmr:false}
})
server=await createServer(config)
await server.listen()
console.log('\nTiny Planet • Face Builder\nOpen: http://127.0.0.1:5191/facebuilder?char='+selected+
  '\n'+(wait?'Waiting for approved submission; the command exits after handoff.':'Submit writes approved values and an agent receipt. Ctrl+C to close.')+'\n')
