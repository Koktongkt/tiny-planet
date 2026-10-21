// Garden logic (Stage B, contract v2). Pure: no DOM, no three.js, so node unit tests can import it.
// Plot: { id, yaw?, pos:[x,y,z], cropId, stage, watered, plantedDay, grown } — `grown` counts watered days (extra field).
// A crop grows one step for each new in-game day it starts watered. Dry days just pause it (a cozy garden: nothing dies
// of thirst). A ripe crop left unpicked for WITHER_DAYS mornings withers; a withered plot is cleared by hand.
export const CROP = {
  //        days to ripe, harvest [item, n], seed item it's planted from
  skyseed: { days: 5, yields: [['skyberry', 3]], seed: 'skyseed', bonus: ['skyseed', 1] },
  turnip: { days: 3, yields: [['turnip', 2]], seed: 'seedpack' },
  carrot: { days: 4, yields: [['carrot', 2]], seed: 'seedpack' },
  herb: { days: 2, yields: [['herbs', 3]], seed: 'seedpack' },
}
export const PACK_CROPS = ['turnip', 'carrot', 'herb'] // a seed packet holds one of these (picked per plot + day)
export const WITHER_DAYS = 3
export const emptyPlot = (id, pos = [0, 1, 0], yaw = 0) => ({ id, yaw, pos, cropId: null, stage: 'seed', watered: false, plantedDay: -1, grown: 0 })
export function stageFor(cropId, grown) {
  const c = CROP[cropId]; if (!c) return 'seed'
  if (grown <= 0) return 'seed'
  if (grown >= c.days) return 'ripe'
  const f = grown / c.days; return f < 0.4 ? 'sprout' : f < 0.75 ? 'young' : 'mature'
}
// which crop a seed packet gives in this plot today (deterministic, so a reload can't re-roll it)
export const packCrop = (plotIdx, day) => PACK_CROPS[((plotIdx * 7 + day * 3) % 3 + 3) % 3]
export function plant(p, cropId, day) {
  if (p.cropId || !CROP[cropId]) return false
  Object.assign(p, { cropId, stage: 'seed', watered: false, plantedDay: day, grown: 0, ripeDays: 0 }); return true
}
export function water(p) { if (!p.cropId || p.watered || p.stage === 'ripe' || p.stage === 'withered') return false; p.watered = true; return true }
// -> [[item, n], ...] or null. Empties the plot.
export function harvest(p) {
  if (!p.cropId || p.stage !== 'ripe') return null
  const c = CROP[p.cropId], out = c.yields.map(([k, n]) => [k, n]); if (c.bonus) out.push(c.bonus)
  clear(p); return out
}
export function clear(p) { Object.assign(p, { cropId: null, stage: 'seed', watered: false, plantedDay: -1, grown: 0, ripeDays: 0 }) }
// one morning passes for a plot
export function growDay(p) {
  if (!p.cropId || p.stage === 'withered') { p.watered = false; return }
  if (p.stage === 'ripe') { p.ripeDays = (p.ripeDays || 0) + 1; if (p.ripeDays >= WITHER_DAYS) p.stage = 'withered'; p.watered = false; return }
  if (p.watered) { p.grown = (p.grown || 0) + 1; p.stage = stageFor(p.cropId, p.grown) }
  p.watered = false
}
// bring the garden up to `day` (handles several days at once, e.g. a long sleep or a reload a few days on)
export function advanceTo(garden, day) {
  let n = 0
  while (garden.day < day && n < 60) { garden.day++; n++; for (const p of garden.plots) growDay(p) }
  if (garden.day < day) garden.day = day
  return n
}
