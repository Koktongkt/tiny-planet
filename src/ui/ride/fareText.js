// Ride overlay copy (Stage C, art-c). Station names follow liveC.js STOP_NAME, short form for the parchment card.
export const RIDE_NAMES = { village: { name: 'Lakeside', sub: 'village' }, forest: { name: 'Forest Edge', sub: 'ruins' } }
export const stopName = (id) => (RIDE_NAMES[id] || { name: id || '?', sub: '' })
/** cost 0 = first ride free; else n coins (systems/train.js fare()) */
export function fareText(cost) { return !cost ? 'First ride on the house' : cost === 1 ? 'Fare: 1 coin' : `Fare: ${cost} coins` }
/** progress 0..1 along the line -> a little status line */
export function rideStatus(progress, dwelling) { if (dwelling) return 'Waiting at the platform…'; const p = Math.max(0, Math.min(1, progress || 0)); return p < 0.08 ? 'Pulling away…' : p > 0.9 ? 'Slowing for the platform…' : 'Rattling along…' }
