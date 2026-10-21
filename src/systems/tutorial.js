// Stage C first-day tutorial note (pure; unit-tested). State G.s.tutorial = { done: { [step]: true }, dismissed }.
// Shown on day 0 until dismissed (or all done); Settings can reopen it any day.
export const STEPS = [
  { id: 'move', icon: 'leaf', text: 'Walk with WASD or the arrow keys', textTouch: 'Walk with the stick, bottom left' },
  { id: 'look', icon: 'sun', text: 'Drag to look around, scroll to zoom', textTouch: 'Drag to look, pinch to zoom' },
  { id: 'gather', icon: 'hand', text: 'Press E near things that shimmer', textTouch: 'Tap ✋ near things that shimmer' },
  { id: 'craft', icon: 'book', text: 'Craft something at the bench by Home' },
  { id: 'talk', icon: 'chat', text: 'Say hello to a villager' },
  { id: 'garden', icon: 'seedpack', text: 'Plant a seed in the garden beds' },
  { id: 'sleep', icon: 'moon', text: 'Sleep in your bed to start a new day' },
]
export const STEP_IDS = STEPS.map(s => s.id)
export const freshTutorial = () => ({ done: {}, dismissed: false })
export const mark = (t, id) => { if (!STEP_IDS.includes(id) || t.done[id]) return false; t.done[id] = true; return true }
export const allDone = (t) => STEP_IDS.every(id => t.done[id])
export const visible = (t, day, reopened = false) => reopened || (day === 0 && !t.dismissed && !allDone(t))
export const steps = (t) => STEPS.map(s => ({ ...s, done: !!t.done[s.id] }))
