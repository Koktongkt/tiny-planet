# Camera and movement: orbit camera, camera-relative walking, zoom

## Why
On desktop, movement is tank-style (W/S forward and back, A/D turn), and the camera is locked behind her, so the view
depends on her facing. Desktop has no mouse look or wheel zoom at all, although the tutorial promises "Drag to look
around, scroll to zoom". The touch stick is camera-relative indoors but facing-relative outdoors. The goal is friendly
controls and a camera that shows her surroundings.

## Decisions (approach A, chosen by the user)
- **Camera-relative movement everywhere (keyboard and stick, indoors and out).** W/A/S/D and the arrows move her up,
  left, down and right on screen. She turns smoothly toward the way she's walking. When she reverses, she turns first
  and walks slowly until she faces the new way. Shift runs and Space jumps, as now. Click or tap a spot to walk there.
- **Orbit camera.** The camera follows her position. Its rotation is the player's: drag with the mouse (left or right
  button; a click without a drag still walks) or one finger to orbit (sideways) and tilt (up and down). It never swings
  back behind her by itself. The existing tree / house occlusion pull-in stays.
- **Zoom:** wheel or pinch, from a close shoulder view to a wide view of the surroundings. **The default starts wider
  than today.**
- **Indoors:** the same keys, drag and zoom. The orbit is limited to about ±40° around the front, because the room is a
  cut-away built to be seen from the front. Zoom runs from close-up to the whole room; at the widest it centres on the
  room.
- **Leaving the house:** the camera lands in front of her, looking at her face, with the door behind her. Entering
  resets the indoor orbit to the front.
- Photo mode keeps its own camera and wheel.

## Non-goals
The museum interior's own controls, the bicycle's feel beyond what camera-relative steering gives, and a fully
detached free camera (approach B).

## Approaches considered
A (chosen): orbit plus camera-relative. B: a detached free camera that only follows when she nears the screen edge;
on a small round planet it's easy to lose her. C: tank controls plus mouse look; doesn't fix the movement.
