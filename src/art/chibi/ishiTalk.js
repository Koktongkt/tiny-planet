// Grandpa Ishi's talking gestures (pure, unit-tested): which of his animations fits a line of dialogue.
// laugh: a joke or a cheeky line; thump: a grumble ("Hmph", the young these days); point: telling a story (jabs the pipe);
// ponder: a question or a musing (strokes his mustache); smoke: anything about his pipe; nod: everything else (mm-hm);
// chuckle: thanking you for a gift he loves (pats his belly).
export const ISHI_GESTURES = ['chuckle', 'laugh', 'thump', 'point', 'ponder', 'smoke', 'nod']
const RULES = [
  ['chuckle', /love this|for me\?|how thoughtful/i], // a gift he loves: a happy belly-pat chuckle
  ['smoke', /\bpipe\b|smok|tobacco/i],
  ['thump', /\bhmph\b|harrumph|\byoung\b|too fast|so fast|nonsense|back in my day|shouting|creak/i],
  ['laugh', /\bha\b|haha|ho ho|funny|joke|pretend|decorative|orders|soft that way|\bpride\b/i],
  ['point', /\bstor(y|ies)\b|\btales?\b|once upon|hear this|listen|\bsit\b|remember|history|rehears/i],
  ['ponder', /\?|\bhmm\b|wonder|funny, that|never ends|forgotten|punctuation/i],
]
/** the gesture for one line; avoid: the previous gesture (so two lines in a row do not repeat, unless the line insists) */
export function ishiGesture(line = '', avoid = null) {
  const hits = RULES.filter(([, re]) => re.test(line)).map(([g]) => g)
  if (hits.length) return hits.find(g => g !== avoid) || hits[0]
  return avoid === 'nod' ? 'ponder' : 'nod'
}
