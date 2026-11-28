// Professor Hoshino's own idle actions, posed on top of the shared life layer (life.js runs first; these add to the
// same bones). His feel (KT): a curious, clever, excitable and passionate professor.
//   eureka   a sudden idea: freezes, eyes wide, a finger shoots up beside his head, up on his toes, then a quick double nod
//            (rare: at most once per idle spell)
//   peer     bends from the hips to look closely at something on the ground, pushes his glasses up, squints, leans in
//   chin     "hmm": one hand on his chin, the other arm folded under it, head tilted, eyes up and aside, fingers tapping
//   lecture  explaining to the air: one hand open and presenting on the beats, the other counting points, nodding, talking
//   behind   hands clasped behind his back, rocking gently heel to toe, gazing about: his calm default between fidgets
//   notebook takes a small book out of his jacket, scribbles in it (life.js poses the writing), puts it back
//   greet    she comes near (App's walker sets st.greetN): perks up onto his toes, both hands up, then beckons, delighted
// Everything is additive, frame-rate independent and fades in and out with the fidget envelope.
import { envelope, triggerBlink } from './lifeCore.js'

const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const bump = (k, n) => Math.max(0, Math.sin(k * Math.PI * n))

export function startGesture(L, g) { L.fid = g; L.fu = 0; L.fidPrev = g; L.fidN = L.P.fidgetEvery[0] + 2 }

/** run after lifeStep: poses his own fidgets, the greeting, and how far the notebook is out (L.book 0..1) */
export function hoshinoActs(L, B, st, dt) {
  const FID = L.P.fidgets, idleOk = (st.move || 0) < 0.2
  L.book = 0
  // she came near: the walker bumps st.greetN (and turns him toward her)
  if (st.greetN && st.greetN !== L.greetSeen) { L.greetSeen = st.greetN; if (idleOk) { startGesture(L, 'greet'); triggerBlink(L.blink) } }
  // eureka at most once per idle spell: a second roll becomes a chin stroke
  if (L.idle < 0.5) L.eurekaSpell = 0
  if (L.fid === 'eureka' && L.seenFid !== 'eureka') { if (L.eurekaSpell) startGesture(L, 'chin'); else L.eurekaSpell = 1 }
  L.seenFid = L.fid
  if (!L.fid || !idleOk) return
  const d = FID[L.fid]; if (!d) return
  const k = L.fu / d
  if (L.fid === 'eureka') {
    const e = envelope(L.fu, d, 0.25), frz = sst(0, 0.1, k) * (1 - sst(0.16, 0.24, k)), up = sst(0.12, 0.24, k) * (1 - sst(0.62, 0.8, k)), nod = bump(Math.min(1, Math.max(0, (k - 0.55) / 0.35)), 2)
    // the idea lands: a tiny start, then the finger up beside his head (forward and out, clear of the hair)
    B.root.position.y += 0.006 * up + 0.002 * frz; B.ftL.rotation.x += 0.45 * up; B.ftR.rotation.x += 0.45 * up
    B.chest.rotation.x -= 0.05 * up // (no head pitch up: tipping his big head back hides the face decal; the eyes look up instead)
    B.upR.rotation.x -= 1.5 * up; B.upR.rotation.z += 0.12 * up; B.foR.rotation.x -= 0.9 * up
    B.upL.rotation.z -= 0.18 * up; B.foL.rotation.x -= 0.25 * up // the other arm flings out a little
    B.head.rotation.x += 0.16 * nod * e; B.chest.rotation.x += 0.03 * nod * e
    if (L.fu - dt < d * 0.12 && L.fu >= d * 0.12) triggerBlink(L.blink)
    L.mood = 'excited'; L.blush = Math.max(L.blush, up); L.squint = 0; L.gy = 0.5 * up
  } else if (L.fid === 'peer') {
    const e = envelope(L.fu, d, 0.6), lean = e * (0.75 + 0.25 * sst(0.4, 0.6, k) * (1 - sst(0.8, 0.95, k))), g = sst(0.28, 0.38, k) * (1 - sst(0.5, 0.6, k)) * e
    // bends from the hips (the root), chest and head following, looking down at something by his feet
    B.root.rotation.x += 0.12 * lean; B.chest.rotation.x += 0.16 * lean; B.head.rotation.x += 0.08 * lean
    B.thL.rotation.x -= 0.1 * lean; B.thR.rotation.x -= 0.1 * lean // the hips sit back a little to balance
    B.upL.rotation.x += 0.45 * e; B.upL.rotation.z += 0.15 * e; B.foL.rotation.x -= 0.4 * e // one hand behind him
    B.upR.rotation.x -= 0.35 * e + 0.75 * g; B.foR.rotation.x -= 0.3 * e + 0.95 * g; B.upR.rotation.z -= 0.12 * g // the other pushes his glasses up mid-way
    if (L.fu - dt < d * 0.42 && L.fu >= d * 0.42) triggerBlink(L.blink)
    L.gy = -0.95 * e; L.gx = 0.15 * Math.sin(L.fu * 1.7) * e; L.squint = Math.max(L.squint, 0.45 * lean); L.mood = 'focus'
  } else if (L.fid === 'chin') {
    const e = envelope(L.fu, d, 0.6), tap = Math.sin(L.fu * 7) * sst(0.3, 0.4, k) * (1 - sst(0.75, 0.85, k)) * e
    B.upR.rotation.x -= 1.2 * e; B.upR.rotation.z -= 0.38 * e; B.foR.rotation.x -= 1.95 * e; B.foR.rotation.z += 0.06 * tap // hand to the chin
    B.upL.rotation.x -= 0.4 * e; B.upL.rotation.z += 0.42 * e; B.foL.rotation.x -= 1.25 * e // forearm across his middle, under the elbow
    B.head.rotation.z += 0.13 * e; B.head.rotation.y += 0.12 * e; B.chest.rotation.y -= 0.05 * e
    L.gx = 0.55 * e; L.gy = 0.6 * e; L.mood = 'focus'
  } else if (L.fid === 'lecture') {
    const e = envelope(L.fu, d, 0.4), beat = Math.max(0, Math.sin(L.fu * 5.2)), cnt = Math.floor(sst(0.15, 0.9, k) * 3.99)
    B.chest.rotation.x += 0.05 * e - 0.03 * beat * e; B.root.rotation.x += 0.03 * e
    B.upR.rotation.x -= 0.8 * e + 0.15 * beat * e; B.upR.rotation.z += 0.32 * e; B.foR.rotation.x -= 0.75 * e; B.foR.rotation.y += (0.5 + 0.35 * Math.sin(L.fu * 2.6)) * e // open hand, presenting
    B.upL.rotation.x -= 0.75 * e; B.upL.rotation.z += 0.3 * e; B.foL.rotation.x -= 1.25 * e; B.foL.rotation.z -= 0.08 * cnt * e // counting points off
    B.head.rotation.x += 0.07 * beat * e; B.head.rotation.y += 0.22 * Math.sin(L.fu * 1.1) * e; B.chest.rotation.y += 0.07 * Math.sin(L.fu * 1.1) * e
    L.mood = Math.sin(L.fu * 9.5) > -0.2 && e > 0.3 ? 'excited' : 'happy'; L.blush = Math.max(L.blush, 0.6 * e); L.gx = 0.4 * Math.sin(L.fu * 1.1) * e
  } else if (L.fid === 'behind') {
    const e = envelope(L.fu, d, 0.8), rk = Math.sin(L.fu * 2.4) * e
    B.upL.rotation.x += 0.6 * e; B.upR.rotation.x += 0.6 * e; B.upL.rotation.z += 0.22 * e; B.upR.rotation.z -= 0.22 * e; B.foL.rotation.x -= 0.3 * e; B.foR.rotation.x -= 0.3 * e
    B.root.position.y += 0.0025 * Math.max(0, rk); B.ftL.rotation.x += 0.22 * Math.max(0, rk); B.ftR.rotation.x += 0.22 * Math.max(0, rk); B.root.rotation.x -= 0.03 * rk
    B.chest.rotation.x -= 0.03 * e; B.head.rotation.y += 0.3 * Math.sin(L.fu * 0.8) * e
    L.gy = 0.35 * e; L.gx = 0.5 * Math.sin(L.fu * 0.8) * e
  } else if (L.fid === 'notebook') {
    // life.js poses the writing; this adds the reach to the jacket pocket at both ends and shows the book in between
    const take = bump(sst(0, 0.16, k), 1), stow = bump(sst(0.84, 1, k), 1)
    B.upL.rotation.x += 0.5 * (take + stow); B.foL.rotation.x += 0.6 * (take + stow); B.upL.rotation.z += 0.2 * (take + stow); B.chest.rotation.y += 0.08 * (take + stow)
    L.book = sst(0.07, 0.13, k) * (1 - sst(0.88, 0.94, k)); L.mood = 'focus'
    const w = L.book // his arms are short: bring the book in to his middle and the pencil hand over it
    B.upL.rotation.z += 0.4 * w; B.upR.rotation.x -= 0.1 * w; B.upR.rotation.z -= 0.12 * w; B.foR.rotation.x += 0.1 * w
    if (k > 0.45 && k < 0.5) L.mood = 'happy' // a pleased little smile at what he wrote
  } else if (L.fid === 'greet') {
    const e = envelope(L.fu, d, 0.2), pop = bump(sst(0, 0.3, k), 1), beck = sst(0.3, 0.42, k) * (1 - sst(0.85, 1, k)) * e
    B.root.position.y += 0.007 * pop; B.ftL.rotation.x += 0.5 * pop; B.ftR.rotation.x += 0.5 * pop; B.chest.rotation.x -= 0.06 * pop
    B.upL.rotation.x -= 1.05 * e; B.upL.rotation.z -= 0.08 * e; B.foL.rotation.x -= 0.7 * e // both hands up, open, a little out
    B.upR.rotation.x -= 1.05 * e + 0.2 * beck; B.upR.rotation.z += 0.08 * e; B.foR.rotation.x -= 0.85 * e + 0.6 * beck * (0.5 + 0.5 * Math.sin(L.fu * 11)) // then beckons: "come, come!"
    B.chest.rotation.x += 0.05 * beck; B.head.rotation.z += 0.1 * Math.sin(L.fu * 3.4) * e
    L.mood = 'excited'; L.blush = Math.max(L.blush, e); L.squint = 0.1
  }
}
