// Face Builder source adapters. Only the optional local studio uses these.
// No generated code or UI dependencies are imported by the game.
export const CHARACTERS = {
  her: { label: 'Main character', file: 'src/art/chibi/ChibiHer.jsx' },
  fuku: { label: 'Grandma Fuku', file: 'src/art/chibi/ChibiFuku.jsx' },
  ishi: { label: 'Grandpa Ishi', file: 'src/art/chibi/ChibiIshi.jsx' },
  hoshino: { label: 'Professor Hoshino', file: 'src/art/chibi/ChibiHoshino.jsx' },
}
const N = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[-+]?\\d+)?'
const numbers = () => new RegExp(N, 'gi')
const field = (id, label, min, max, step = .0005) => ({ id, label, min, max, step })
const colour = (id, label) => ({ id, label, type: 'color' })
const n = field
const array = (id, title, constant, fields) => ({ id, title, re: new RegExp('(?:const|,)\\s*' + constant + '\\s*=\\s*(\\[[^\\n;]+?\\])(?=\\s*(?:,\\s*[A-Z_]+\\s*=|//|\\n|$))'), fields })
const scalar = (id,title,anchor,f) => ({ id,title,re:new RegExp(anchor+'('+N+')'),fields:[f] })
const hex = (id,title,anchor) => ({ id,title,re:new RegExp(anchor+"(['\"]#[0-9a-fA-F]{6}['\"])"),fields:[colour(id,title)],hex:true })
const custom = (id,title,re,fields) => ({id,title,re,fields})
const jaw = (constant) => array('jaw','Jaw / cheeks',constant,[
  null,n('jaw.y','Vertical position',-.045,-.01),n('jaw.z','Forward position',.003,.026),n('jaw.width','Width',.036,.064),n('jaw.height','Height',.020,.041),n('jaw.depth','Depth',.025,.051),n('jaw.blend','Roundness / blend',.008,.035)
])
const ell = (id,title,name,range) => array(id,title,name,[
  n(id+'.y','Height position',range[0],range[1]),n(id+'.z','Depth position',range[2],range[3]),
  n(id+'.width','Width',.018,.062),n(id+'.height','Height',.009,.054),n(id+'.depth','Depth',.012,.065),n(id+'.blend','Blend',.005,.024)
])
const ear = (isIshi=false) => custom('ear','Ears',/const EAR = (\{[^}\n]+\})/,isIshi?
  [n('ear.y','Vertical position',-.04,-.01),n('ear.z','Depth position',-.022,.012)]:
  [n('ear.x','Distance from centre',.053,.078),n('ear.y','Vertical position',-.03,.005),n('ear.z','Depth position',-.012,.022)])
const faceScalar=(id,label,min,max,step=.01)=>scalar(id,'Face details','\\b'+id+':\\s*',n(id,label,min,max,step))
const her = [
  jaw('CHEEK'),
  custom('profile','Nose / chin profile',/const MIDFACE = (\[\[[^\n]+\]\])/,[
    n('nose.y','Nose height',-.037,-.017),n('nose.z','Nose projection',.026,.048,.0006),n('nose.width','Nose width',.020,.038),n('nose.height','Nose vertical extent',.003,.013),n('nose.depth','Nose depth',.008,.020),n('nose.blend','Nose blend',.0008,.008,.0002),n('nose.edge','Nose edge rounding',.0005,.003,.0002),
    n('chin.y','Chin height',-.045,-.025),n('chin.z','Chin projection',.019,.040,.0006),n('chin.width','Chin width',.020,.044),n('chin.height','Chin height radius',.011,.023),n('chin.depth','Chin depth',.016,.034),n('chin.blend','Chin blend',.003,.012)
  ]),
  scalar('fade','Nose / chin profile','const MID_FADE =\\s*',n('profile.fade','Side blending',0,28,.5)),
  scalar('eyeX','Eyes and face','E10X =\\s*',n('eye.offsetX','Eye spacing offset',-.006,.004,.0002)),
  scalar('eyeY','Eyes and face','E10Y =\\s*',n('eye.offsetY','Face height offset',-.010,.002,.0002)),
  scalar('eyeRx','Eyes and face','rx:\\s*(?='+N+'\\s*\\* FS)',n('eye.width','Eye width radius',.008,.015,.0002)),
  scalar('eyeRy','Eyes and face','ry:\\s*(?='+N+'\\s*\\* FS)',n('eye.height','Eye height radius',.009,.017,.0002)),
  ear(),
  custom('earSize','Ears',/EAR\.z\], (\[[^\]]+\])/,[
    n('ear.width','Ear thickness',.003,.009),n('ear.height','Ear height',.007,.018),n('ear.depth','Ear depth',.004,.012)]),
  array('hair','Hair','RH',[n('hair.width','Hair width',.058,.080),n('hair.height','Hair height',.060,.086),n('hair.depth','Hair depth',.055,.080)]),
  scalar('flare','Hair','const FL =\\s*',n('hair.flare','Side bob flare',.10,.55,.01)),
  scalar('flareBack','Hair','FL_BACK =\\s*',n('hair.backFlare','Back bob flare',.10,.45,.01)),
  hex('skin','Skin colour','outfit: \\{ \\.\\.\\.TRAVELLER\\.outfit, skin:\\s*'),
  // Her hair shader colour is separate from the body config; expose only verified linked controls.
]
const fuku = [
  jaw('FUKU_CHEEK'),ear(),
  faceScalar('eyeS','Eye size',.75,1.3),
  faceScalar('defaultSquint','Resting squint',0,.5),
  faceScalar('blush','Blush intensity',0,1),
  custom('bunPosition','Hair',/part\(ball, (\[0,\s*[-.\d]+,\s*[-.\d]+\]), \[[^\]]+\]\),\n\s*part\(ring/,[
    null,n('bun.y','Bun height',.05,.09),n('bun.z','Bun depth',-.025,.018)]),
  hex('skin','Skin colour','const SKIN =\\s*'),hex('hairColor','Hair colour','const HAIR_C =\\s*'),hex('glasses','Glasses colour','const GLASS =\\s*')
]
const ishi = [
  array('skull','Skull','HEAD_S',[n('head.width','Skull width',.85,1.12,.01),n('head.height','Skull height',.86,1.14,.01),n('head.depth','Skull depth',.91,1.20,.01)]),
  jaw('JAW'),ell('crown','Crown','CRANIUM',[0,.025,-.020,.012]),
  ell('chin','Chin','CHIN',[-.065,-.035,.012,.039]),
  ell('back','Back of head','OCCIPUT',[-.035,-.003,-.037,-.010]),
  faceScalar('eyeS','Eye size',.8,1.35),faceScalar('defaultSquint','Resting squint',0,.5),faceScalar('blush','Blush intensity',0,1),
  ear(true),scalar('earTilt','Ears','const EAR_TILT =\\s*',n('ear.tilt','Ear rotation (radians)',.3,1,.01)),
  scalar('mWidth','Moustache','\\.map\\(\\(\\[x, y\\]\\) => \\[x \\*\\s*',n('mustache.width','Moustache width factor',.85,1.45,.02)),
  scalar('mHeight','Moustache','\\(y \\+ 0\\.0336\\) \\*\\s*',n('mustache.height','Moustache length factor',.8,1.55,.02)),
  custom('noseSize','Nose',/add\(onFace\(ball, 0, -0\.0284, 0\.0042, (\[[^\]]+\])/,[
    n('nose.width','Nose width',.008,.016),n('nose.height','Nose height',.005,.012),n('nose.depth','Nose depth',.006,.014)]),
  hex('skin','Skin colour','const SKIN =\\s*'),hex('hairColor','Hair colour','const HAIR_C =\\s*')
]
// Keep the professor's head and decal in sync without touching the other cast.
const hoshino = [
  array('skull','Skull','HOSHINO_HEAD_S',[n('head.width','Skull width',.89,1.13,.01),n('head.height','Skull height',.89,1.13,.01),n('head.depth','Skull depth',.89,1.13,.01)]),
  jaw('HOSHINO_CHEEK'),
  custom('profile','Nose / chin profile',/const HOSHINO_MIDFACE = (\[\[[^\n]+\]\])/,[
    n('nose.y','Nose height',-.037,-.017),n('nose.z','Nose projection',.026,.048,.0006),n('nose.width','Nose width',.020,.038),n('nose.height','Nose vertical extent',.003,.013),n('nose.depth','Nose depth',.008,.020),n('nose.blend','Nose blend',.0008,.008,.0002),n('nose.edge','Nose edge rounding',.0005,.003,.0002),
    n('chin.y','Chin height',-.045,-.025),n('chin.z','Chin projection',.019,.040,.0006),n('chin.width','Chin width',.020,.044),n('chin.height','Chin height radius',.011,.023),n('chin.depth','Chin depth',.016,.034),n('chin.blend','Chin blend',.003,.012)
  ]),
  scalar('fade','Nose / chin profile','const HOSHINO_MID_FADE =\\s*',n('profile.fade','Side blending',0,28,.5)),
  faceScalar('eyeS','Eye size',.75,1.3),
  faceScalar('defaultSquint','Resting squint',0,.5),
  faceScalar('blush','Blush intensity',0,1),
  ear(),
  custom('earSize','Ears',/EAR\.z\], (\[[^\]]+\])/,[
    n('ear.width','Ear thickness',.003,.010),n('ear.height','Ear height',.007,.018),n('ear.depth','Ear depth',.004,.012)
  ]),
  custom('hairCentre','Hair cloud',/const DOME = \{ c: (\[[^\]]+\])/,[
    n('hair.cloud.x','Cloud sideways shift',-.008,.008,.0002),n('hair.cloud.y','Cloud height',-.004,.020,.0002),n('hair.cloud.z','Cloud forward / back',-.022,.002,.0002)
  ]),
  custom('hairSize','Hair cloud',/const DOME = \{ c: \[[^\]]+\], r: (\[[^\]]+\])/,[
    n('hair.cloud.width','Cloud width',.052,.072,.0002),n('hair.cloud.height','Cloud height radius',.042,.062,.0002),n('hair.cloud.depth','Cloud depth',.052,.072,.0002)
  ]),
  scalar('specR','Glasses','const SPEC = \\{ r:\\s*',n('glasses.size','Lens size',.011,.019,.0002)),
  hex('specWire','Glasses wire colour',"const SPEC = \\{ r: "+N+", wire:\\s*"),
  hex('specInk','Glasses rim ink',"const SPEC = \\{[^}\\n]*ink:\\s*"),
  hex('skin','Skin colour','const SKIN =\\s*'),hex('hairColor','Hair colour','const HAIR_C =\\s*'),
  hex('hairGrey','Grey streak colour','const HAIR_GREY =\\s*'),hex('hairBand','Hair highlight colour','const HAIR_BAND =\\s*')
]
const groups = {her,fuku,ishi,hoshino}

// Fuku originally inherits the shared face silhouette. Give only Fuku her own
// jaw and use it in BOTH the body spec and the projected face decal.
function prepare(id, source) {
  if (id === 'hoshino') {
    if (source.includes('const HOSHINO_CHEEK =')) return source
    const anchor = "const Face = makeFace({ kind: 'hoshino', glasses: GLASS, wire: { ...SPEC, ear: [0.0575, -0.021, 0.004] }, defaultSquint: 0.06, blush: 0.55 })"
    if (!source.includes(anchor) || !source.includes('cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE')) throw new Error('Hoshino face adapter needs updating for this source revision.')
    return source.replace('import { CHEEK, MIDFACE, MID_FADE, makeFace }','import { makeFace }')
      .replace(anchor, [
        'const HOSHINO_HEAD_S = [1, 1, 1]',
        'const HOSHINO_CHEEK = [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]',
        'const HOSHINO_MIDFACE = [[-0.0278, 0.0397, 0.02, 0.0058, 0.014, 0.0012, 0.001], [-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]]',
        'const HOSHINO_MID_FADE = 0',
        "const Face = makeFace({ kind: 'hoshino', glasses: GLASS, wire: { ...SPEC, ear: [0.0575, -0.021, 0.004] }, defaultSquint: 0.06, blush: 0.55, shape: { headS: HOSHINO_HEAD_S, cheek: HOSHINO_CHEEK, midface: HOSHINO_MIDFACE, fade: HOSHINO_MID_FADE }, eyeS: 1 })"
      ].join('\n'))
      .replace('cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE','headS: HOSHINO_HEAD_S, cheek: HOSHINO_CHEEK, midface: HOSHINO_MIDFACE, midfaceFade: HOSHINO_MID_FADE')
  }
  if (id !== 'fuku' || source.includes('const FUKU_CHEEK =')) return source
  const anchor = 'const Face = makeFace({ kind: \'fuku\', glasses: GLASS, defaultSquint: 0.1, blush: 0.72 })'
  if (!source.includes(anchor) || !source.includes('cheek: CHEEK, midface: MIDFACE')) throw new Error('Fuku face adapter needs updating for this source revision.')
  return source.replace('import { CHEEK, MIDFACE, MID_FADE, makeFace }','import { MIDFACE, MID_FADE, makeFace }')
    .replace(anchor, "const FUKU_CHEEK = [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]\nconst Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.1, blush: 0.72, shape: { cheek: FUKU_CHEEK }, eyeS: 1 })")
    .replace('cheek: CHEEK, midface: MIDFACE','cheek: FUKU_CHEEK, midface: MIDFACE')
}
function locate(source, group) {
  const m = group.re.exec(source)
  if (!m || !m[1]) throw new Error('Face Builder cannot find source anchor: '+group.id)
  const offset = m.index + m[0].lastIndexOf(m[1])
  const tokens = group.hex ? [{value:m[1].slice(1,-1),index:0,raw:m[1]}] :
    [...m[1].matchAll(numbers())].map(x=>({value:Number(x[0]),index:x.index,raw:x[0]}))
  if (tokens.length !== group.fields.length) throw new Error('Face Builder anchor shape changed: '+group.id)
  return {offset,tokens}
}
export function inspect(id, raw) {
  if (!CHARACTERS[id]) throw new Error('Unknown character')
  const source=prepare(id,raw)
  return groups[id].flatMap(g=>locate(source,g).tokens.flatMap((t,i)=>{
    const f=g.fields[i]; return f ? [{...f,group:g.title,value:t.value}] : []
  }))
}
export function validate(id,raw,values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid values')
  const fs=inspect(id,raw), known=new Map(fs.map(f=>[f.id,f]))
  const out={}
  for (const [key,value] of Object.entries(values)) {
    const f=known.get(key)
    if (!f) throw new Error('Unknown parameter: '+key)
    if (f.type==='color' ? typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value) :
        typeof value!=='number'||!Number.isFinite(value)||value<Math.min(f.min,f.value)-1e-9||value>Math.max(f.max,f.value)+1e-9)
      throw new Error('Out of range: '+key)
    if (value!==f.value) out[key]=value
  }
  return out
}
export function apply(id,raw,values,{preview=false}={}) {
  const changes=preview?{}:validate(id,raw,values)
  if (!preview && !Object.keys(changes).length) return raw
  let source=prepare(id,raw)
  const edits=[]
  for (const g of groups[id]) {
    const {offset,tokens}=locate(source,g)
    tokens.forEach((t,i)=>{
      const f=g.fields[i]; if (!f || (!preview && !(f.id in changes))) return
      const value=preview ? '__fbValue('+JSON.stringify(f.id)+','+ t.raw+')' : JSON.stringify(changes[f.id])
      edits.push({start:offset+t.index,end:offset+t.index+t.raw.length,value})
    })
  }
  edits.sort((a,b)=>b.start-a.start)
  for(const e of edits) source=source.slice(0,e.start)+e.value+source.slice(e.end)
  if(preview) source='const __fbDraft = (() => { try { const d=JSON.parse(sessionStorage.getItem("tiny-planet-facebuilder")||"null"); return d?.character === '+JSON.stringify(id)+' ? d.values : null } catch { return null } })();\nconst __fbValue = (key, fallback) => __fbDraft?.[key] ?? fallback;\n'+source
  return source
}
