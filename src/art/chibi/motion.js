// Motion profiles: everything about HOW a chibi character behaves, as data. A new character = copy HER_MOTION with
// motionProfile(HER_MOTION, { ...only what differs }) and pass it to makeLife(rnd, profile). The life layer (life.js),
// the item gestures (acts.js) and the tools read these fields; nothing else needs editing for a different personality.
// What they LOOK like (size, shape, colours) lives in the character's cfg (body / outfit / hair); how they WALK is
// cfg.walk (stride, bounce, sway, rate...). Times are seconds; [a, b] means a random time between a and b.
export const HER_MOTION = {
  name: 'her',
  lively: 1, // scales every extra motion (fidgets, reactions, breathing, springs): 0.6 = calm elder, 1.2 = bouncy kid

  // idle fidgets she can do, and how long each takes (poses are in life.js; add a pose there to add a new name)
  fidgets: { look: 3.4, stretch: 2.6, rock: 2.8, satchel: 2.0, hum: 3.6, pebble: 2.6, hands: 2.8, tiptoe: 2.4, catch: 3.2, shiver: 1.6, yawn: 2.6, tummy: 2.8, growl: 1.8, peek: 2.6 },
  // which ones she picks from in each situation (repeat a name to make it more likely)
  sets: {
    day: ['look', 'stretch', 'rock', 'satchel', 'hum', 'pebble', 'hands', 'tiptoe'],
    rain: ['catch', 'shiver', 'catch', 'look', 'satchel', 'hands'],
    night: ['yawn', 'look', 'rock', 'yawn', 'hum'],
    seated: ['look', 'hum', 'look'],
    hungry: ['tummy', 'growl', 'peek', 'tummy', 'look'],
  },
  fidgetAfter: 2.5, // first fidget after standing still this long
  fidgetEvery: [5, 11],

  // long idle: sit down, then sometimes lie back and watch the sky, then get sleepy
  sitAfter: 18,
  lieChance: 0.35, // one roll per idle spell, once seated
  lieAfter: 32,
  sleepyAfter: 25,

  // reactions: switch any off for a character who would not do it
  can: { skip: true, skid: true, wave: true, dodge: true, sit: true, lie: true, rainHunch: true, glanceAtCamera: true },
  skipEvery: [9, 21], // on a long fine-weather walk
  skidAfterRun: 1.2, // skid only when stopping hard after sprinting at least this long
  skidChance: 0.7, // ...and only sometimes (a stop that does not skid waits 10 s before it can roll again)
  skidEvery: [120, 240], // cooldown after a skid: a few minutes
  waveEvery: [40, 70], // cooldown between waves at villagers
  sighEvery: [6, 12], // when tired

  // energy (the game's 0-100): tired walk below tiredBelow (full at 5), hungry fidgets at or below hungryAt
  tiredBelow: 35,
  hungryAt: 25,

  // pose sizes
  yawnUp: 1.75, // how far the arms go up in a yawn (keep the hands beside the hair, not in it)
  lieLift: 0.012, // lift the body off the ground when lying back (bigger heads / bellies need more)

  // item -> gesture overrides on top of src/game/actItems.js (e.g. { wood: 'pluck' } for a strong grandpa)
  gestures: {},
}

/** a new profile from a base: shallow-merges the top level and the nested objects (fidgets, sets, can, gestures) */
export function motionProfile(base, over = {}) {
  const out = { ...base, ...over }
  for (const k of ['fidgets', 'sets', 'can', 'gestures']) out[k] = { ...base[k], ...(over[k] || {}) }
  return out
}
export const between = (rnd, [a, b]) => a + rnd() * (b - a)
