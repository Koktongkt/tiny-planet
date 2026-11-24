# Pet locomotion: lifelike movement for Mochi and Pip

## Intent

Mochi (cat) and Pip (dog) do many things, but the way they move gives them away as machines: speed changes in
visible steps, they pivot on the spot, the body ignores turns and acceleration, feet slide, and Pip shadows every
small move she makes. The goal is movement **as close to a real cat and dog as the stylised rig allows**. This comes
before any deeper behaviour work (needs, routines, quirks), which will sit on top of it.

The user reviews the result before anything further is built on it.

## Goals

- **Real gaits.** A four-beat walk (one foot at a time, lateral sequence: hind, fore on the same side, then the other side),
  a trot (diagonal pairs) and a run (dog: gallop; cat: bound). They blend smoothly by speed, with no snap.
- **Planted feet.** During the stance phase each paw stays put on the ground. During the swing it lifts and
  reaches forward. Stride length follows speed.
- **Smooth acceleration and steering.** Speed changes continuously. Turns follow arcs whose tightness depends on speed. A sharp
  turn at low speed is a few small re-stepping steps, never a frozen-legs pivot.
- **The body responds to motion.** Head leads a turn (looks first, then shoulders, then hips). The body leans into turns
  at speed, dips slightly when braking, and pushes slightly forward when starting off. The head stays steady
  in space against body bob. The tail trails turns and speed changes.
- **Natural following (Pip).** He ignores her small adjustments, catches up at a speed that matches the gap,
  anticipates where she is heading, switches sides along a gradual arc, and settles differently each time she stops.
- **Natural floor movement (Mochi).** He curves around furniture instead of snapping between fixed directions,
  slows into arrivals, and turns by stepping instead of spinning in place.
- **Varied pose timing.** Sitting, lying and standing each have their own timing and a little settle, not the same
  ease rate for everything.

## Non-goals

- New behaviours (needs, routines, quirks, bond). Those are the next project.
- New art: no change to heads, coats, colours or silhouettes.
- Hand-authored animation clips.

## Anti-goals (a failure even if it technically works)

- Movement that looks more "busy" but not more real: jitter, overshoot that wobbles, over-exaggerated lean.
- Pip lagging so far or reacting so slowly that following feels unresponsive in play.
- Any frame-rate cost the player can notice (pets are on screen most of the time).
- Regressions in existing states: fetch, dig, splash, river crossings, bike crate, door wait, photo mode, `?cat=` / `?dog=` holds.

## Constraints

- The rig is procedural (`src/pets/Quadruped.jsx`), driven by a pose-goal object the brains fill each frame.
  Legs are single tapered columns (no knee) with an SDF-blended root in the torso. That geometry stays.
- Pip moves on the planet's sphere (normal + forward vectors, colliders, river/lake rules). Mochi moves on a flat room
  floor (x, z, yaw) with furniture hops. The shared module has to work in both.
- Everything runs inside the existing per-frame `useFrame` loops. No physics engine.

## Approaches considered

- **A. Fix each problem where it is.** Fastest, but leaves the fixes scattered across `Dog.jsx` and `Cat.jsx`, and the
  next behaviour project would re-solve motion each time.
- **B. One shared locomotion module (chosen).** Brains say *where* to go and *how eagerly*. One module turns that
  into speed, heading, gait and body motion for both pets. More work up front, but both pets improve together and
  later behaviours plug into it.
- **C. Hand-authored clips.** Clashes with the procedural, spring-based style. Rejected.

## Design

### 1. Motor (new, `src/pets/motor.js`, pure and unit-tested)

Works in a local 2D frame (heading angle + speed), so it can serve both the sphere and the room:

- Input each frame: desired direction (or a target point already in local terms), desired speed, an "eagerness"
  0..1, and the pet's limits (max accel, max decel, turn rate as a function of speed).
- Output: new speed, new heading, angular velocity, longitudinal acceleration, and a `look` direction for the head.
- **Arrival:** speed eases down with distance (a smooth braking curve, not a cut-off). A dead zone with hysteresis means small
  target moves do not restart walking.
- **Turning:** turn rate is capped and shrinks with speed (wide arcs when fast). For a big turn from standstill, the
  motor emits a "step-turn" (slow speed, high turn) so the legs keep stepping.
- Each brain keeps only its space-specific part: Pip converts sphere vectors into the local frame and
  applies colliders/banks as now; Mochi uses the room floor and furniture avoidance (made continuous, see 4).

### 2. Rig motion (`src/pets/Quadruped.jsx`)

- **Gait engine.** One continuous phase. Per-leg phase offsets and duty factor (time on ground) are interpolated
  between walk (lateral sequence), trot and gallop/bound by speed. This replaces the 0/1 `run` switch.
  Per-species values live in the existing cfg (e.g. cat walk is lower and smoother, dog trot is springier).
- **Foot planting without a knee.** During stance the leg's pitch is set so the paw stays on its ground point
  (angle from the hip to the foot's position relative to the body). During swing the leg shortens a little (scale) to lift
  the paw and arcs forward to the next footfall. Stride length follows speed, so the feet do not slide.
- **Body dynamics.** Spring-damped (second-order) lean from lateral acceleration (turning at speed), pitch from forward
  acceleration (braking dip, start-off push), plus a small gait-locked roll and weight shift.
- **Head.** Leads turns (yaw toward `look`, clamped), counter-rotates against body bob and pitch to stay steady, and has
  the walk's small nod.
- **Tail.** A lagged follower of body yaw rate and speed, layered on top of the existing wag.
- **Pose transitions.** The single exponential ease becomes per-pose spring settings (stiffness + damping), so sitting
  down, lying down and getting up each have their own timing and a slight settle.

### 3. Pip's following (`src/pets/Dog.jsx`)

- **Desired speed** is a continuous function of the gap and her speed (replacing the four steps), with matched pace when
  close behind her.
- **Follow spot** is smoothed and partly predicted from her heading. A dead zone ignores small repositioning.
- **Side switches** move the spot along an arc behind her over about a second.
- **Settling when she stops** is picked from a few variations with a little randomness: sit straight away; stand and look
  around, then sit; sniff a small circle and lie down; and so on. Timings vary.
- **While sitting or lying** he follows her with his head first. He only stands and step-turns when she moves well
  outside his view.

### 4. Mochi's floor movement (`src/pets/Cat.jsx`)

- Uses the motor for speed and turns (acceleration, arrival, step-turns).
- Furniture avoidance becomes a weighted blend of directions that are clear, instead of the first free one among
  seven fixed offsets. This removes the direction snaps near furniture.
- Turning to face something while sitting turns the head first, then a stand, step-turn and sit if needed.
- Rubbing around her ankles follows a looser, varied path rather than an exact circle.

### 5. Review and verification

- **Before/after clips** of the same scenarios (Pip following a walk with stops and turns, Pip catching up from
  far, Pip during a side switch; Mochi wandering, crossing the room, zoomies, approaching her) recorded with Playwright
  so the user can compare them side by side.
- **Unit tests** for the motor (no speed steps, arrival without overshoot, dead-zone hysteresis, turn rate bounded
  by speed) and for the gait engine (each blended gait keeps each foot's stance/swing timing consistent).
- **Regression run** of `shoot-pets.mjs` and the existing tests. Frame-time check against the current build.

## Decided with the user

- Approach B: a shared locomotion module.
- Movement must be as close to real as possible, and comes before deeper behaviours.
- The user reviews the result before further work builds on it.

## Calls made by Claude (open to correction)

- Keep the single-column legs and fake foot planting with angle + length, instead of adding a knee (no art change).
- Gait set: lateral-sequence walk, trot, and gallop (dog) / bound (cat).
- Pip's settle variations and their weights are tuned by eye during the work.

## Left to the builder

- Exact spring constants, accel limits, turn-rate curves and gait thresholds (tune against the clips).
- How the motor state is stored on the existing `D` / `c` objects.
