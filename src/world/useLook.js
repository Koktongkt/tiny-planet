// useLook(): the lazily loaded look-A module (src/world/lookA.js), or null until it arrives; the first call starts the load
import { useEffect, useState } from 'react'
let mod = null, pending = null
const load = () => (pending ??= import('./lookA.js').then(m => (mod = m)))
export function useLook() {
  const [m, set] = useState(mod)
  useEffect(() => { if (!m) load().then(set) }, [])
  return m
}
