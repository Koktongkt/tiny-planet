// Her own action poses (anim pass 4, KT: "they all look the same"). Called from the shared rig through cfg.ext.act
// before its generic poses; returns true when it handled the action. Gathering picks a gesture from the item
// (src/game/actItems.js); petting differs for Pip (a two-handed ruffle) and Mochi (slow gentle strokes); placing decor
// ends with a step back to admire it. Sets st.actMood for the face: 'strain' | 'calm' | 'wow' (life.js reads it).
// Conventions (her rig): x < 0 swings a limb forward; upR z > 0 swings the +x arm out/up, upL z < 0 the other one.
// mix(bone, axis, v) eases a rotation toward v by the action weight w; positions are added scaled by w.
import { gestureOf } from '../../game/actItems.js'

const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, k) => a + (b - a) * k

// a crouch toward something on the ground in front; d = depth 0..1 (1 = the old pick crouch)
function crouch(B, mix, w, d) {
  B.root.position.y -= 0.075 * w * d; mix(B.root, 'x', 0.3 * d); mix(B.chest, 'x', 0.34 * d)
  mix(B.thL, 'x', -1.25 * d); mix(B.shLn, 'x', 1.55 * d); mix(B.thR, 'x', -0.55 * d); mix(B.shRn, 'x', 1.05 * d); mix(B.ftL, 'x', -0.25 * d); mix(B.ftR, 'x', -0.25 * d)
}
// both knees down (lower and steadier than a crouch)
function kneel(B, mix, w, d) {
  B.root.position.y -= 0.09 * w * d; mix(B.root, 'x', 0.12 * d); mix(B.chest, 'x', 0.22 * d)
  for (const k of ['L', 'R']) { mix(B['th' + k], 'x', 0.05 * d); mix(B['sh' + k + 'n'], 'x', 1.6 * d); mix(B['ft' + k], 'x', 0.6 * d) }
}
// arm helper: s = 'L' | 'R'; x forward swing, z outward (sign handled), f forearm bend (negative = bend up/forward)
function arm(B, mix, s, x, z, f) { const sd = s === 'R' ? 1 : -1; mix(B['up' + s], 'x', x); mix(B['up' + s], 'z', sd * z); mix(B['fo' + s], 'x', f) }

const GATHER = {
  // small things off the ground: reach, pinch, bring it up to look at it
  pluck(B, mix, w, k, at) { const r = sst(0, 0.35, k), l = sst(0.55, 0.85, k)
    crouch(B, mix, w, 1 - 0.45 * l); arm(B, mix, 'R', lerp(-1.35 * r, -0.75, l), lerp(0.1, -0.2, l), lerp(-0.35, -1.55, l)); arm(B, mix, 'L', -0.3, -0.15, -0.7)
    mix(B.head, 'x', lerp(0.38, 0.16, l)); return l > 0.3 ? 'wow' : null },
  // flowers and herbs: pick, then up to her nose with her eyes closed
  sniff(B, mix, w, k, at) { const r = sst(0, 0.28, k), l = sst(0.38, 0.62, k)
    crouch(B, mix, w, 1 - 0.75 * l); arm(B, mix, 'R', lerp(-1.35 * r, -0.95, l), lerp(0.1, -0.42, l), lerp(-0.35, -2.05, l)); arm(B, mix, 'L', lerp(-0.3, -0.45, l), -0.15, lerp(-0.7, -1.1, l))
    mix(B.head, 'x', lerp(0.38, -0.06, l)); mix(B.head, 'z', 0.1 * l); return l > 0.4 ? 'calm' : null },
  // berries / tea / rice: standing at a bush, both hands picking in turn at chest height
  bush(B, mix, w, k, at) { const a = Math.sin(at * 10), e = sst(0, 0.2, k)
    mix(B.chest, 'x', 0.14 * e); mix(B.root, 'x', 0.05 * e); arm(B, mix, 'R', -1.15 + 0.15 * a, -0.1, -0.45 - 0.2 * Math.max(0, a)); arm(B, mix, 'L', -1.15 - 0.15 * a, -0.1, -0.45 - 0.2 * Math.max(0, -a))
    mix(B.head, 'x', 0.22); return 'wow' },
  // reeds / bamboo: grip low with both hands, then lean back and pull it free (a little hop back)
  pull(B, mix, w, k, at) { const g = sst(0, 0.3, k), p = sst(0.4, 0.7, k), done = sst(0.72, 0.9, k)
    crouch(B, mix, w, 0.7 * (1 - p)); mix(B.root, 'x', lerp(0.21, -0.14, p) * (1 - done * 0.6)); mix(B.chest, 'x', lerp(0.24, -0.18, p))
    arm(B, mix, 'R', -1.2 * g + 0.2 * p, -0.15, -0.3 - 0.4 * p); arm(B, mix, 'L', -1.2 * g + 0.2 * p, -0.15, -0.3 - 0.4 * p)
    B.root.position.y += 0.006 * w * Math.sin(Math.min(1, Math.max(0, (k - 0.68) / 0.2)) * Math.PI); mix(B.head, 'x', lerp(0.3, -0.05, p)); return p < 0.9 && g > 0.5 ? 'strain' : 'wow' },
  // wood / stone: a deep squat, both hands under it, lift with effort and hug it to her chest
  heavy(B, mix, w, k, at) { const r = sst(0, 0.3, k), lift = sst(0.42, 0.78, k)
    crouch(B, mix, w, 1.1 * (1 - 0.8 * lift)); mix(B.chest, 'x', lerp(0.38, -0.08, lift))
    arm(B, mix, 'R', lerp(-1.3 * r, -0.65, lift), lerp(-0.12, -0.3, lift), lerp(-0.2, -1.35, lift)); arm(B, mix, 'L', lerp(-1.3 * r, -0.65, lift), lerp(-0.12, -0.3, lift), lerp(-0.2, -1.35, lift))
    const wob = lift > 0.05 && lift < 0.95 ? Math.sin(at * 30) * 0.012 : 0; mix(B.head, 'x', lerp(0.35, 0.02, lift) + wob); return r > 0.5 && lift < 0.9 ? 'strain' : 'wow' },
  // shells / clay: kneel, scoop with both hands, lift and give it a little shake
  scoop(B, mix, w, k, at) { const r = sst(0, 0.32, k), l = sst(0.45, 0.72, k), sh = l > 0.6 ? Math.sin(at * 22) * 0.18 * (1 - sst(0.85, 1, k)) : 0
    kneel(B, mix, w, 1 - 0.3 * l); arm(B, mix, 'R', lerp(-1.25 * r, -0.95, l), lerp(-0.25, -0.32, l), lerp(-0.15, -1.1, l)); arm(B, mix, 'L', lerp(-1.25 * r, -0.95, l), lerp(-0.25, -0.32, l), lerp(-0.15, -1.1, l))
    B.foL.rotation.y += sh * w; B.foR.rotation.y -= sh * w; mix(B.head, 'x', lerp(0.4, 0.12, l)); return l > 0.3 ? 'wow' : null },
  // crystals / shards: kneel, steady it with one hand, three taps with the other, then hold it up to admire
  chip(B, mix, w, k, at) { const tapK = sst(0.15, 0.25, k) * (1 - sst(0.58, 0.66, k)), tap = Math.max(0, Math.sin(at * 16)), up = sst(0.66, 0.85, k)
    kneel(B, mix, w, 1 - 0.5 * up); arm(B, mix, 'L', lerp(-1.25, -1.25, up), lerp(-0.1, -0.25, up), lerp(-0.3, -1.25, up))
    arm(B, mix, 'R', lerp(-1.0 - 0.35 * tap * tapK, -1.25, up), lerp(0.1, -0.25, up), lerp(-0.9 + 0.4 * tap * tapK, -1.25, up))
    mix(B.head, 'x', lerp(0.4, -0.12, up)); return up > 0.3 ? 'wow' : tapK > 0.3 ? 'strain' : null },
  // fireflies / fluff: reach up with cupped hands, clap them shut, peek inside at her chest
  catch(B, mix, w, k, at) { const up = sst(0, 0.3, k) * (1 - sst(0.42, 0.6, k)), peek = sst(0.45, 0.68, k)
    B.root.position.y += 0.008 * w * up; mix(B.ftL, 'x', 0.4 * up); mix(B.ftR, 'x', 0.4 * up)
    arm(B, mix, 'R', lerp(-2.5 * up - 0.6 * (1 - up) * sst(0, 0.3, k), -0.8, peek), lerp(0.35 * up, -0.38, peek), lerp(-0.1, -1.3, peek)); arm(B, mix, 'L', lerp(-2.5 * up - 0.6 * (1 - up) * sst(0, 0.3, k), -0.8, peek), lerp(0.35 * up, -0.38, peek), lerp(-0.1, -1.3, peek))
    mix(B.head, 'x', lerp(-0.18 * up, 0.25, peek)); mix(B.chest, 'x', 0.1 * peek - 0.08 * up); return 'wow' },
  // wool: a pat on the sheep with one hand, then a gentle tug with the other
  wool(B, mix, w, k, at) { const pat = Math.sin(at * 9) * (1 - sst(0.45, 0.55, k)), tug = sst(0.5, 0.68, k) * (1 - sst(0.8, 1, k))
    mix(B.chest, 'x', 0.12); arm(B, mix, 'L', -1.1 + 0.12 * pat, -0.05, -0.3); arm(B, mix, 'R', -1.15 + 0.5 * tug, 0.1, -0.35 - 0.6 * tug)
    mix(B.root, 'x', -0.08 * tug); mix(B.head, 'x', 0.18); mix(B.head, 'z', 0.08); return 'wow' },
}

export function herAct(a, B, mix, st, t, w) {
  const at = st.actT || 0, dur = st.actDur || 1, k = Math.min(1, at / dur)
  st.actMood = null
  if (a === 'water' || (a === 'cast' && st.actItem === 'rod') || (a === 'reel' && (st.actItem === 'caught' || st.actItem === 'slipped'))) return true // fishing.js poses these
  if (a === 'pick') { const g = GATHER[gestureOf(st.actItem)] || GATHER.pluck; st.actMood = g(B, mix, w, k, at); return true }
  if (a === 'pet' && st.actItem === 'dog') { // Pip: crouch, both hands ruffling his head, fast and happy
    const r = Math.sin(at * 13), e = sst(0, 0.2, k); crouch(B, mix, w, 0.85)
    arm(B, mix, 'R', -1.2 + 0.18 * r, 0.05, -0.4 + 0.15 * r); arm(B, mix, 'L', -1.2 - 0.18 * r, 0.05, -0.4 - 0.15 * r)
    mix(B.head, 'x', 0.3); mix(B.head, 'z', 0.1 * Math.sin(at * 6) * e); st.actMood = 'wow'; return true }
  if (a === 'pet' && st.actItem === 'cat') { // Mochi: kneel low, one hand in long slow strokes, eyes softly closed
    const s = Math.sin(at * 3.6); kneel(B, mix, w, 0.9)
    arm(B, mix, 'R', -1.1 + 0.32 * s, 0.05, -0.25 - 0.12 * s); arm(B, mix, 'L', -0.35, -0.12, -0.9)
    mix(B.head, 'x', 0.32); mix(B.head, 'z', 0.14); st.actMood = 'calm'; return true }
  if (a === 'place') { // decor: careful set-down with both hands, then up and a step back to admire it
    const down = sst(0, 0.3, k) * (1 - sst(0.5, 0.7, k)), adm = sst(0.6, 0.85, k)
    crouch(B, mix, w, 0.9 * down); arm(B, mix, 'R', -1.2 * down - 0.15 * adm, lerp(-0.1, -0.35, adm), lerp(-0.4, -1.5, adm)); arm(B, mix, 'L', -1.2 * down - 0.15 * adm, lerp(-0.1, -0.35, adm), lerp(-0.4, -1.5, adm))
    mix(B.root, 'x', -0.06 * adm); mix(B.head, 'x', lerp(0.35, 0.08, adm)); mix(B.head, 'z', 0.16 * adm); st.actMood = adm > 0.3 ? 'wow' : null; return true }
  if (a === 'feed') { // a bowl down for Pip, then an open-palm "here you go"
    const down = sst(0, 0.35, k) * (1 - sst(0.6, 0.8, k)), offer = sst(0.62, 0.8, k)
    crouch(B, mix, w, 0.8 * down + 0.3 * offer); arm(B, mix, 'R', -1.2 * down - 0.7 * offer, 0.05 + 0.3 * offer, -0.4 + 0.1 * offer); arm(B, mix, 'L', -1.2 * down, -0.1, -0.4)
    mix(B.head, 'x', 0.3 * down + 0.15 * offer); st.actMood = offer > 0.3 ? 'wow' : null; return true }
  return false
}
