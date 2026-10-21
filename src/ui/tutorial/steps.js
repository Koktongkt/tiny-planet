// Default first-day steps for <TutorialNote> (Stage C, art-c). Codor passes the same ids with `done` flags; text can be
// overridden per step. Step: { id, text, textTouch?, icon, done }. Ids are final: move, look, gather, craft, talk, garden, sleep.
export const TUTORIAL_SIGNER = { npcId: 'grandma', name: 'Grandma Fuku' }
export const TUTORIAL_STEPS = [
  { id: 'move', icon: 'move', text: 'Stretch your legs: WASD or the arrow keys, Space to hop.', textTouch: 'Stretch your legs: push the little stick, or tap the ground.' },
  { id: 'look', icon: 'look', text: 'Look about you. Drag to turn, scroll to come closer.', textTouch: 'Look about you. Drag to turn, pinch to come closer.' },
  { id: 'gather', icon: 'gather', text: 'Pick something pretty. Press E when it sparkles.', textTouch: 'Pick something pretty. Tap ✋ when it sparkles.' },
  { id: 'craft', icon: 'craft', text: 'Make something with your hands. C opens the recipes.', textTouch: 'Make something with your hands. Open the recipe book.' },
  { id: 'talk', icon: 'talk', text: 'Say hello to a neighbour. We do like visitors.' },
  { id: 'garden', icon: 'garden', text: 'Plant a seed in the beds by your door, and water it.' },
  { id: 'sleep', icon: 'sleep', text: 'When the lamps come on, sleep in your own bed.' },
]
/** merge Codor's progress ({id: true} or Step[]) onto the default text */
export function withProgress(done = {}) {
  const d = Array.isArray(done) ? Object.fromEntries(done.map(s => [s.id, !!s.done])) : done
  return TUTORIAL_STEPS.map(s => ({ ...s, done: !!d[s.id] }))
}
