// When a pet offers its Pet bubble (pure). Pets follow her around, so being close isn't an invitation: the bubble shows
// after she stands still beside them for 3 s, or when the pet is asking (greeting, waiting with the stick, rubbing her
// ankles). Once it has been up and she pets them or walks away, it rests for 10 minutes. Until then the pet is a quiet
// target: E still pets them when nothing else is near, but anything else in range wins E.
export const PET_PROMPT = { stillMs: 3000, restMs: 600000 }
export const newRest = () => ({ until: -Infinity, shown: false })
export function petOffer(rest, { asking, stillMs, now }) {
  if (asking) return 'bubble'
  if (rest.shown) return 'bubble'
  if (now < rest.until) return 'quiet'
  if (stillMs >= PET_PROMPT.stillMs) { rest.shown = true; return 'bubble' }
  return 'quiet'
}
// she petted them or walked out of range: if the bubble was up, start the rest
export function petLeft(rest, now) { if (rest.shown) { rest.shown = false; rest.until = now + PET_PROMPT.restMs } }
