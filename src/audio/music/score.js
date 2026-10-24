// The score: four original pieces in a Ghibli-ish folk/waltz idiom (written for Tiny Planet), as chords + a singable
// melody, and how each is arranged by place, time of day, season and rain. Pure data + parsers (unit-tested).
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m6: [0, 3, 7, 9], 6: [0, 4, 7, 9], sus: [0, 5, 7], '7sus': [0, 5, 7, 10],
  'ø7': [0, 3, 6, 10], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 'maj7#11': [0, 4, 7, 11, 18], dim7: [0, 3, 6, 9] }
const pc = (s) => (PC[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0) + 12) % 12
/** 'Gm7/D' -> { root: 7, iv: [0,3,7,10], bass: 2 } */
export function chord(sym) {
  const [main, sl] = sym.split('/'), m = /^([A-G][#b]?)(.*)$/.exec(main); if (!m || !(m[2] in QUAL)) throw new Error('chord ' + sym)
  const root = pc(m[1]); return { sym, root, iv: QUAL[m[2]], bass: sl ? pc(sl) : root }
}
/** note name -> midi ('C5' = 72, 'Bb4', 'F#5'); 'r' = rest (null) */
export function note(s) { if (s === 'r') return null; const m = /^([A-G][#b]?)(-?\d)$/.exec(s); if (!m) throw new Error('note ' + s); return (+m[2] + 1) * 12 + pc(m[1]) }
/** 'C5 F5:2 r:.5' -> [[beat, midi, dur], ...] (rests dropped); a token without :dur lasts 1 beat */
export function line(s) { let b = 0; const out = []; for (const tok of s.trim().split(/\s+/)) { if (!tok) continue; const [n, d] = tok.split(':'), dur = d ? +d : 1, m = note(n); if (m != null) out.push([b, m, dur]); b += dur } return { notes: out, beats: b } }
/** parse a piece: chords 'F | Am | Gm7 C7 |...' (two chords split the bar, the first takes the larger half), melody likewise */
export function parse(P) {
  const cb = P.chords.split('|').map(s => s.trim()), mb = P.melody.split('|'), bars = []
  if (cb.length !== mb.length) throw new Error(`${P.id}: ${cb.length} chord bars vs ${mb.length} melody bars`)
  for (let i = 0; i < cb.length; i++) {
    const syms = cb[i].split(/\s+/), L = line(mb[i]), half = Math.ceil(P.meter / 2)
    if (Math.abs(L.beats - P.meter) > 1e-6) throw new Error(`${P.id} bar ${i + 1}: ${L.beats} beats`)
    bars.push({ ch: syms.map((s, k) => ({ ...chord(s), at: k ? half : 0, len: syms.length === 1 ? P.meter : k ? P.meter - half : half })), mel: L.notes })
  }
  return { ...P, bars }
}

// ---------------------------------------------------------------------------------------------------------------------
// Outdoors: 'Little Planet Waltz' — a bright 3/4 village waltz (accordion, pizzicato, flute) with a borrowed iv (Bbm)
// and a minor-key middle that climbs back home. F major, 138 bpm, 32 bars.
export const OUTDOOR = parse({ id: 'outdoor', meter: 3, bpm: 138, send: 0.3,
  chords: 'F | Am | Bb | C | F | Dm | Gm7 | C7 | F | A7 | Dm | Bbm | F/C | Gm7 C7 | F | F | Dm | Bb | C | F | Dm | Gm | A7 | A7 | Bb | C | Am | Dm | Gm7 | C7sus C7 | F | F',
  melody: 'C5 F5 G5 | A5:2 G5 | F5 D5 F5 | E5:3 | C5 F5 G5 | A5 C6 A5 | G5 Bb5 A5:.5 G5:.5 | G5:3 |' +
    'C5 F5 G5 | A5:2 G5 | F5 E5 D5 | Db5:2 C5 | C5 A4 C5 | A5 G5 E5 | F5:3 | r:1.5 C5:.5 E5:.5 G5:.5 |' +
    'A5:1.5 G5:.5 F5 | D5:2 F5 | E5 G5 C6 | A5:3 | A5:1.5 Bb5:.5 A5 | G5 D5 G5 | E5 A5 C#6 | A5:3 |' +
    'D6 C6 Bb5 | C6:2 G5 | C6 A5 E5 | F5:2 A5 | Bb5 A5 G5 | E5 F5 G5 | F5:3 | r:2 A4:.5 Bb4:.5' })
// Her house: 'Lamplight' — slow music box + nylon guitar, lydian #11 on IV, a borrowed Fm6 sigh. C major, 72 bpm, 16 bars.
export const HOUSE = parse({ id: 'house', meter: 4, bpm: 72, send: 0.26,
  chords: 'Cmaj7 | Am7 | Fmaj7 | G7sus G7 | Em7 | A7 | Dm7 | G7 | Fmaj7 | Em7 | Dm7 | Cmaj7 | Fm6 | Em7 A7 | Dm7 G7 | C',
  melody: 'E5 G5 B5:1.5 A5:.5 | G5:2 E5:2 | A5 C6 B5 A5 | G5:3 r | E5 G5 D6:1.5 C6:.5 | B5 A5 G5:2 | F5 A5 D6 C6 | B5:2 G5:2 |' +
    'A5:1.5 G5:.5 A5 C6 | B5:2 G5:2 | A5:1.5 G5:.5 F5 A5 | G5:4 | Ab5:2 F5 D5 | G5:2 E5:2 | F5:2 D5 B4 | C5:4' })
// Museum: 'Professor Hoshino's Cabinet' — curious chamber piece: harpsichord Alberti, walking pizzicato, celesta tune with
// dorian 6ths, a Neapolitan Bb and a lydian Fmaj7#11. A minor, 96 bpm, 16 bars.
export const MUSEUM = parse({ id: 'museum', meter: 4, bpm: 96, send: 0.45,
  chords: 'Am | F | Dm6 | E7 | Am | Bb | Fmaj7#11 | E7sus E7 | C | G/B | Am | F#ø7 | Fmaj7 | E7 | Am | Amadd9',
  melody: 'E5:.5 A5:.5 B5:.5 C6 B5:.5 A5 | C6:1.5 A5:.5 F5:2 | D5:.5 F5:.5 A5:.5 B5 A5:.5 F5 | G#5:2 B5 D6 |' +
    'C6:.5 B5:.5 A5:.5 E5:1.5 A5 | D6:1.5 C6:.5 Bb5 F5 | A5 B5 C6 E6 | E6:2 D6:.5 C6:.5 B5 |' +
    'E5:.5 G5:.5 C6 B5:.5 A5:.5 G5 | D6:2 B5 G5 | C6 A5 E5 A5 | C6:1.5 A5:.5 F#5:2 | E5 F5 A5 C6 | B5:1.5 G#5:.5 E5 G#5 | A5:3 r | r:4' })
// The little train: 'Rails Through the Meadow' — a travelling 4/4 folk tune, guitar strums, shaker chug. G major, 132 bpm.
export const TRAIN = parse({ id: 'train', meter: 4, bpm: 132, send: 0.22,
  chords: 'G | Em | C | D | G | Em | Am7 | D7 | C | D | Bm7 | Em | Am7 | D7 | G | G',
  melody: 'D5 G5 B5 A5:.5 G5:.5 | B5:2 G5 E5 | E5 G5 C6:1.5 B5:.5 | A5:3 D5 | D5 G5 B5 D6 | B5:1.5 A5:.5 G5 E5 | C6 B5 A5 G5 | F#5:2 A5:2 |' +
    'E5 G5 C6:2 | B5 A5 F#5:2 | D5 F#5 A5 B5 | G5:3 r | E5 A5 C6 B5 | A5:2 F#5:2 | G5:4 | r:4' })
export const THEMES = { outdoor: OUTDOOR, house: HOUSE, museum: MUSEUM, train: TRAIN }

// ---------------------------------------------------------------------------------------------------------------------
// Arrangement: which parts play, chosen per 8-bar section from the place's piece, the cycle (each pass changes the lead),
// time of day, season and rain. Parts: mel (lead), dbl (lead doubled an octave down), ctr (answers in the lead's long
// notes), waltz (bass + two chord stabs), arp (8th-note arpeggio), alb (Alberti), strum (offbeat chords), bass (root /
// fifth / walk), pad (held chord), perc (shaker / triangle / woodblock / bells), spk (celesta sparkles).
const SEASON = { spring: { tr: 0, lead: 'flute', tm: 1 }, summer: { tr: 2, lead: 'ocarina', tm: 1.02 }, autumn: { tr: -3, lead: 'clarinet', tm: 0.94 }, winter: { tr: -2, lead: 'celesta', tm: 0.9 } }
export function arrange(id, s, cycle, sec) {
  const S = SEASON[s.season] || SEASON.spring, rain = (s.rain || 0) > 0.5, per = s.period || 'day', alt = cycle % 2
  if (id === 'house') return { tr: 0, tm: per === 'night' ? 0.92 : 1, swing: 0.06, parts: [
    { k: 'mel', i: alt ? 'piano' : 'celesta', v: alt ? 0.62 : 0.75 }, alt ? { k: 'ctr', i: 'celesta', o: 12, v: 0.35 } : null,
    { k: 'arp', i: 'guitar', v: per === 'night' ? 0.32 : 0.42, pat: [0, 2, 3, 2, 1, 2, 3, 2] }, { k: 'bass', i: 'piano', v: 0.42, st: 'half' },
    { k: 'pad', i: 'strings', v: rain ? 0.7 : 0.5 }, sec === 1 && !alt ? { k: 'spk', i: 'celesta', v: 0.18, p: 0.3 } : null] }
  if (id === 'museum') return { tr: 0, tm: 1, swing: 0.05, parts: [
    { k: 'mel', i: alt ? 'clarinet' : 'celesta', v: alt ? 0.8 : 0.72 }, alt ? { k: 'ctr', i: 'celesta', o: 12, v: 0.3 } : { k: 'ctr', i: 'pizz', o: -12, v: 0.4 },
    { k: 'alb', i: 'harpsi', v: 0.34 }, { k: 'bass', i: 'pizz', v: 0.55, st: 'walk' }, { k: 'pad', i: 'strings', v: 0.35 },
    { k: 'perc', i: 'wood', v: 0.3, on: [1, 3] }, sec === 1 ? { k: 'spk', i: 'celesta', v: 0.2, p: 0.35 } : null] }
  if (id === 'train') return { tr: 0, tm: 1, swing: 0.1, parts: [
    { k: 'mel', i: alt ? 'flute' : 'ocarina', v: 0.8 }, alt ? { k: 'ctr', i: 'celesta', o: 12, v: 0.32 } : null,
    { k: 'strum', i: 'guitar', v: 0.3 }, { k: 'bass', i: 'pizz', v: 0.6, st: 'rootfifth' }, { k: 'pad', i: 'accordion', v: 0.4 },
    { k: 'perc', i: 'shaker', v: 0.55, eighths: true }] }
  // outdoors
  const base = { tr: S.tr, tm: S.tm, swing: 0, lilt: 0.05 }
  if (rain) return { ...base, tm: S.tm * 0.82, lilt: 0.02, parts: [
    { k: 'mel', i: 'piano', v: 0.55 }, { k: 'arp', i: 'piano', v: 0.22, pat: [0, 1, 2, 3, 2, 1] }, { k: 'bass', i: 'piano', v: 0.34, st: 'bar' }, { k: 'pad', i: 'strings', v: 0.55 }] }
  if (per === 'night') return { ...base, tm: S.tm * 0.76, lilt: 0.02, parts: [
    { k: 'mel', i: 'celesta', v: 0.62 }, { k: 'arp', i: 'guitar', v: 0.28, pat: [0, 1, 2, 3, 2, 1] }, { k: 'bass', i: 'piano', v: 0.3, st: 'bar' },
    { k: 'pad', i: 'strings', v: 0.4 }, sec === 1 ? { k: 'spk', i: 'celesta', v: 0.14, p: 0.25 } : null] }
  const lead = S.lead, c3 = cycle % 3
  const evening = per === 'evening', tm = evening ? 0.88 : 1
  const lead1 = c3 === 0 ? 'piano' : c3 === 1 ? lead : 'accordion'
  return { ...base, tm: S.tm * tm, parts: [
    { k: 'mel', i: lead1, v: lead1 === 'piano' ? 0.66 : 0.8 }, c3 === 2 ? { k: 'dbl', i: 'piano', o: -12, v: 0.3 } : null,
    c3 === 1 ? { k: 'ctr', i: 'celesta', o: 12, v: 0.36 } : c3 === 2 ? { k: 'ctr', i: lead === 'celesta' ? 'flute' : lead, o: 0, v: 0.5 } : null,
    { k: 'waltz', bass: evening ? 'piano' : 'pizz', stab: evening ? 'guitar' : c3 === 0 ? 'accordion' : c3 === 1 ? 'pizz' : 'piano', v: evening ? 0.4 : 0.5 },
    { k: 'pad', i: c3 === 0 && !evening ? 'accordion' : 'strings', v: c3 === 0 ? 0.3 : 0.42 },
    sec === 1 || sec === 3 ? { k: 'arp', i: 'guitar', v: 0.2, pat: [0, 1, 2, 3, 2, 1] } : null,
    evening ? { k: 'perc', i: 'tri', v: 0.35, every: 4 } : { k: 'perc', i: s.season === 'winter' ? 'bells' : 'shaker', v: s.season === 'summer' ? 0.6 : 0.45, on: [0, 1, 2] },
    !evening && c3 !== 1 && (sec === 2 || sec === 3) ? { k: 'spk', i: 'celesta', v: 0.18, p: 0.3 } : null] }
}
