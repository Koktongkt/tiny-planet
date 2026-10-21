// Per-species look for the Stage C fish (art-c). Model units: length 1, nose +X, up +Y.
// body: depth (height) and width relative to length, hump = where the body is deepest (0 nose .. 1 tail root),
//       tail = tail-root thickness, belly = lower-profile fullness (1 = symmetric).
// colours: back, belly, fin, pat (pattern ink). pattern: 0 none, 1 spots, 2 bars, 3 koi patches, 4 wavy bands,
//          5 speckle, 6 lateral stripe, 7 big scales. patScale = density, patAmt = strength.
// fins: tail 'fork'|'round'|'fan'|'moon', dorsal 'low'|'tall'|'spiny'|'long'|'none', extras: whiskers, spikes, flat (flounder).
export const FISH_ART = {
  minnow: { depth: 0.2, width: 0.13, hump: 0.32, tail: 0.18, back: '#7d9aa6', belly: '#eef3f0', fin: '#b9cdd2', pat: '#3c5662', pattern: 6, patScale: 1, patAmt: 0.85, tailFin: 'fork', dorsal: 'low' },
  crucian: { depth: 0.42, width: 0.17, hump: 0.4, tail: 0.2, back: '#8a7238', belly: '#e9d39a', fin: '#a88a4c', pat: '#5f4c22', pattern: 7, patScale: 1, patAmt: 0.45, tailFin: 'fork', dorsal: 'long' },
  koi: { depth: 0.3, width: 0.19, hump: 0.36, tail: 0.18, back: '#fbf3e6', belly: '#fffaf2', fin: '#f6e7d6', pat: '#e2552f', pattern: 3, patScale: 1, patAmt: 1, tailFin: 'fan', dorsal: 'long', whiskers: 0.6 },
  catfish: { depth: 0.2, width: 0.2, hump: 0.25, tail: 0.17, back: '#5d5a4a', belly: '#d9d2bb', fin: '#4d4a3e', pat: '#3a382e', pattern: 1, patScale: 1.2, patAmt: 0.55, tailFin: 'round', dorsal: 'low', whiskers: 1, flatHead: 1 },
  lake_lord: { depth: 0.3, width: 0.2, hump: 0.33, tail: 0.18, back: '#5e7148', belly: '#e3d7a4', fin: '#c6a24e', pat: '#3f5232', pattern: 7, patScale: 0.85, patAmt: 0.7, tailFin: 'fan', dorsal: 'long', whiskers: 1.5, glow: 1 },
  ayu: { depth: 0.2, width: 0.12, hump: 0.33, tail: 0.17, back: '#8a8d55', belly: '#f1ecd2', fin: '#d6c46a', pat: '#f0c43a', pattern: 1, patScale: 0.25, patAmt: 1, tailFin: 'fork', dorsal: 'tall' },
  char: { depth: 0.22, width: 0.14, hump: 0.35, tail: 0.18, back: '#5f6b4c', belly: '#e9a774', fin: '#d6835a', pat: '#f3e6c4', pattern: 5, patScale: 1, patAmt: 0.95, tailFin: 'round', dorsal: 'low' },
  loach: { depth: 0.13, width: 0.11, hump: 0.4, tail: 0.24, back: '#8c7a5a', belly: '#e2d3b0', fin: '#a7966f', pat: '#4d402c', pattern: 5, patScale: 1.4, patAmt: 0.75, tailFin: 'round', dorsal: 'low', whiskers: 0.7 },
  mackerel: { depth: 0.22, width: 0.15, hump: 0.38, tail: 0.13, back: '#3f8f8c', belly: '#eef2ee', fin: '#9fb7b4', pat: '#1f3f48', pattern: 4, patScale: 1, patAmt: 0.95, tailFin: 'moon', dorsal: 'low' },
  sea_bream: { depth: 0.44, width: 0.16, hump: 0.36, tail: 0.17, back: '#e2706a', belly: '#f8d9cc', fin: '#e88a7c', pat: '#6fb4d6', pattern: 5, patScale: 0.8, patAmt: 0.9, tailFin: 'fork', dorsal: 'spiny' },
  flounder: { depth: 0.08, width: 0.44, hump: 0.45, tail: 0.25, back: '#9a8566', belly: '#f3ece0', fin: '#a8936f', pat: '#5d4c36', pattern: 1, patScale: 1.6, patAmt: 0.55, tailFin: 'round', dorsal: 'none', flat: 1 },
  pufferfish: { depth: 0.46, width: 0.42, hump: 0.48, tail: 0.14, back: '#c7b46a', belly: '#fbf6e4', fin: '#e0cf8a', pat: '#4d4628', pattern: 1, patScale: 1.1, patAmt: 0.85, tailFin: 'round', dorsal: 'low', spikes: 1 },
}
