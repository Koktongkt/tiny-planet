import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CHARACTERS,inspect,apply,validate} from '../../tools/facebuilder/schema.mjs'
const read=cfg=>readFileSync(new URL('../../'+cfg.file,import.meta.url),'utf8')
for(const [id,cfg] of Object.entries(CHARACTERS)){
  test('face builder '+id+' adapters preserve untouched source and round-trip all controls',()=>{
    const source=read(cfg), fields=inspect(id,source)
    assert.equal(apply(id,source,{}),source)
    assert.equal(new Set(fields.map(f=>f.id)).size,fields.length)
    assert.ok(fields.length>=15)
    const values={}
    for(const f of fields){
      const value=f.type==='color'?'#123456':Number((f.value+(f.value+f.step<=f.max?f.step:-f.step)).toFixed(8))
      const next=inspect(id,apply(id,source,{[f.id]:value}))
      for(const item of next)assert.equal(item.value,item.id===f.id?value:fields.find(other=>other.id===item.id).value,item.id)
      values[f.id]=value
    }
    const result=inspect(id,apply(id,source,values))
    for(const f of result)assert.equal(f.value,values[f.id])
    assert.match(apply(id,source,{},{preview:true}),/__fbValue/)
    assert.throws(()=>validate(id,source,{unknown:1}),/Unknown/)
    const numeric=fields.find(f=>f.type!=='color')
    assert.throws(()=>apply(id,source,{[numeric.id]:Infinity}),/Out of range/)
    assert.throws(()=>apply(id,source,{[numeric.id]:9999}),/Out of range/)
  })
}
test('Fuku custom jaw stays local and feeds both mesh and face decal',()=>{
  const result=apply('fuku',read(CHARACTERS.fuku),{'jaw.width':.051})
  assert.match(result,/const FUKU_CHEEK = \[/)
  assert.match(result,/shape: \{ cheek: FUKU_CHEEK \}/)
  assert.match(result,/cheek: FUKU_CHEEK, midface: MIDFACE/)
})

test('Hoshino has private face and skull values wired to both mesh and face decal',()=>{
  const src=read(CHARACTERS.hoshino), result=apply('hoshino',src,{'jaw.width':.051,'head.width':1.01,'nose.z':.0403})
  assert.match(result,/const HOSHINO_CHEEK = \[/)
  assert.match(result,/shape: \{ headS: HOSHINO_HEAD_S, cheek: HOSHINO_CHEEK, midface: HOSHINO_MIDFACE, fade: HOSHINO_MID_FADE \}/)
  assert.match(result,/headS: HOSHINO_HEAD_S, cheek: HOSHINO_CHEEK, midface: HOSHINO_MIDFACE, midfaceFade: HOSHINO_MID_FADE/)
})
