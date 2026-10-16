// r7 minimap: the only thing App imports. Everything else is in the lazy chunk (Minimap.jsx), so startup pays a few bytes.
import { lazy } from 'react'
export const MinimapLazy = lazy(() => import('./Minimap.jsx'))
