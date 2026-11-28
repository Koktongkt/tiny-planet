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
    indoor: ['look', 'stretch', 'rock', 'satchel', 'hum', 'hands', 'tiptoe'], // her house: no pebbles to kick, no rain to catch
    stove: ['hum', 'look', 'hum', 'rock', 'hands'], // by the warm stove she hums more
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
  skidAfterRun: 5, // skid only when stopping hard after running at least this long
  skidChance: 0.3, // ...and then only this often (each such stop rolls once; no cooldown)
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

// Grandma Fuku: calmer, slower fidgets, no skip/skid/lie. restActs lets the bench sit/chat
// poses still run the seated fidgets (the game marks those as st.act, which would otherwise count as "busy").
export const FUKU_MOTION = motionProfile(HER_MOTION, {
  name: 'fuku',
  lively: 0.6,
  // (pass 40) gentle, wise, caring: a fond look, a contented hum with closed eyes, a knowing nod
  fidgets: { hum: 4.6, nod: 3.2, fond: 4.4 },
  humEyes: 0.85,
  sets: {
    day: ['fond', 'hum', 'nod', 'look', 'fond', 'rock'],
    rain: ['look', 'hum', 'nod'],
    night: ['yawn', 'hum', 'nod'],
    seated: ['fond', 'hum', 'nod', 'look'],
    hungry: ['look', 'hum', 'nod'],
    indoor: ['fond', 'hum', 'nod', 'look'],
    stove: ['hum', 'fond', 'hum', 'nod'],
  },
  fidgetAfter: 3.5,
  fidgetEvery: [8, 16],
  sitAfter: 8,
  lieChance: 0,
  can: { skip: false, skid: false, wave: true, dodge: false, sit: false, lie: false, rainHunch: true, glanceAtCamera: true },
  waveEvery: [20, 30],
  yawnUp: 1.2,
  restActs: ['sit', 'chat'],
})

// Professor Hoshino: checks his notebook, pushes up his glasses. A little livelier than Fuku, still an elder.
export const HOSHINO_MOTION = motionProfile(HER_MOTION, {
  name: 'hoshino',
  lively: 0.75,
  fidgets: { notebook: 3.8, glasses: 2.0 },
  sets: {
    day: ['look', 'notebook', 'glasses', 'look', 'hands'],
    rain: ['look', 'glasses', 'shiver'],
    night: ['yawn', 'look', 'notebook'],
    seated: ['look', 'notebook', 'glasses'],
    hungry: ['look', 'notebook'],
    indoor: ['look', 'notebook', 'glasses', 'hands'],
    stove: ['look', 'notebook', 'hum'],
  },
  fidgetAfter: 3.0,
  fidgetEvery: [6, 14],
  sitAfter: 22,
  lieChance: 0,
  can: { skip: false, skid: false, wave: true, dodge: false, sit: true, lie: false, rainHunch: true, glanceAtCamera: true },
  waveEvery: [30, 50],
  yawnUp: 1.35,
  restActs: ['look', 'sit'],
})

// Grandpa Ishi: slow, chill and loud. Leans on his cane, puffs his pipe, and now and then laughs out loud ("ho ho ho",
// leaning way back). His own idle actions (smoke, laugh) are posed in ChibiIshi.jsx on top of this life layer.
export const ISHI_MOTION = motionProfile(HER_MOTION, {
  name: 'ishi',
  lively: 0.6,
  fidgets: { smoke: 6.5, laugh: 3.0, nod: 2.2, ponder: 3.4, point: 2.6, thump: 2.2, chuckle: 2.6 },
  // dozing off (rolled once per idle spell after dozeAfter s still): standing at night, or sitting (more likely at night)
  dozeAfter: 10, doze: { standNight: 0.4, sitNight: 0.75, sitDay: 0.35 },
  sets: {
    day: ['smoke', 'look', 'laugh', 'ponder', 'smoke', 'look', 'laugh', 'nod'],
    rain: ['look', 'smoke', 'shiver'],
    night: ['smoke', 'look', 'smoke', 'ponder', 'laugh'],
    seated: ['smoke', 'look', 'laugh', 'nod', 'ponder'],
    hungry: ['look', 'smoke'],
    indoor: ['smoke', 'look', 'laugh'],
    stove: ['smoke', 'look'],
  },
  fidgetAfter: 3,
  fidgetEvery: [4, 9],
  sitAfter: 999,
  lieChance: 0,
  can: { skip: false, skid: false, wave: true, dodge: false, sit: false, lie: false, rainHunch: true, glanceAtCamera: true },
  waveEvery: [25, 45],
  yawnUp: 1.0,
  restActs: ['sit', 'chat'],
})
