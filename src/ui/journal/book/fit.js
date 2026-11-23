// The journal book is laid out in its art's own pixels (1448x1086) and scaled to fit, like the Bag satchel.
// Below MIN_SCALE (portrait phones) it is too small to read: J opens the old notebook and Recipes the old Recipe Book.
export const W = 1448, H = 1086, MIN_SCALE = 0.5
export const bookScale = (w, h) => Math.min(1, (w - 16) / W, (h - 16) / H)
export const bookFits = () => typeof innerWidth !== 'undefined' && bookScale(innerWidth, innerHeight) >= MIN_SCALE
