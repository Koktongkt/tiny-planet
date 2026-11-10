// Where the bicycle control is drawn. Phones keep the screen clear of a second
// chip above the joystick; Ride and Hop off live in the Menu. Desktop is unchanged.
export function rideShows({ touch, mode }) {
  if (mode !== 'on' && mode !== 'off') return { chip: false, menu: false, label: null }
  const label = mode === 'off' ? 'Hop off' : 'Ride'
  return touch ? { chip: false, menu: true, label } : { chip: true, menu: false, label }
}
