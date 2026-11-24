// Dev-only switch: ?world=old keeps the pre-rework planet layout reachable for comparison (and forces no-save).
// Safe in node (no location there -> false).
export const OLD_WORLD = typeof location !== 'undefined' && new URLSearchParams(location.search).get('world') === 'old'
