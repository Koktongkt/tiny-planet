// Tiny listeners for values that used to be polled. Time-based work stays on its own timer.
const viewSubs = new Set()
const stickSubs = new Set()

export function subscribeView(fn) { viewSubs.add(fn); return () => viewSubs.delete(fn) }
export function emitView(mode) { for (const fn of viewSubs) fn(mode) }

export function subscribeStick(fn) { stickSubs.add(fn); return () => stickSubs.delete(fn) }
export function emitStick(hidden) { for (const fn of stickSubs) fn(hidden) }

// One-shot: fire now if the flag is already true, otherwise on the next matching event.
export function watchReady(isReady, subscribe, onReady) {
  if (isReady()) { onReady(); return () => {} }
  let stop = () => {}
  stop = subscribe(() => { if (!isReady()) return; stop(); onReady() })
  return () => stop()
}
