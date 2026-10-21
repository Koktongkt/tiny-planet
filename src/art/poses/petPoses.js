// Pet photo poses for Pip (Shiba Inu) and Mochi (cat) (Stage C, art-c). Pure data over Quadruped.jsx POSE0 keys:
// sit, lie, curl, stretch, crouch, roll, headPitch, headYaw, headTilt, earBack, eyes, mouth, tongue, tailUp, tailWag,
// tailSpeed, pawL, pawR, sniff, bodyYaw, hop, purr, happy, pant. Codor freezes each pet's brain in a 'photo' state and calls
// applyPetPose(st, 'pip'|'mochi', id) once (writes st.goal; the rig eases there on its own).
// PAIR_POSES place both pets around her: at = [x right, z toward the camera] in her local frame (world units), yaw radians.
export const PET_POSES = {
  pip: {
    sit: { sit: 1, tailUp: 0.85, tailWag: 0.45, happy: 0.5, mouth: 0.25, pant: 0.3 },
    lie: { lie: 1, headPitch: -0.1, tailWag: 0.25, happy: 0.3 },
    happy: { happy: 1, mouth: 0.7, tongue: 0.8, pant: 1, tailUp: 1, tailWag: 1, tailSpeed: 10 },
    tilt: { sit: 1, headTilt: 0.6, headPitch: -0.1, earBack: 0, tailWag: 0.4, mouth: 0.15 },
    beg: { sit: 1, pawL: 0.85, pawR: 0.7, headPitch: -0.3, tailWag: 0.9, tailSpeed: 9, happy: 0.7, mouth: 0.4, tongue: 0.4 },
    play_bow: { crouch: 1, stretch: 0.5, headPitch: -0.2, tailUp: 1, tailWag: 1, tailSpeed: 11, happy: 0.9, mouth: 0.6, tongue: 0.5 },
    roll: { roll: 1, lie: 1, pawL: 0.6, pawR: 0.6, happy: 1, mouth: 0.5, tongue: 0.6, tailWag: 0.8 },
  },
  mochi: {
    sit: { sit: 1, tailUp: 0.35, tailWag: 0.12, eyes: 0.85 },
    lie: { lie: 1, headPitch: 0, tailWag: 0.15 },
    happy: { sit: 1, eyes: 0.35, purr: 1, happy: 1, headTilt: 0.2, tailUp: 0.9, tailWag: 0.2 },
    tilt: { sit: 1, headTilt: -0.55, eyes: 1.1, tailUp: 0.5 },
    loaf: { lie: 1, eyes: 0.5, purr: 1, headPitch: 0.05, tailUp: 0 },
    stretch: { stretch: 1, tailUp: 1, mouth: 0.7, eyes: 0.25 },
    roll: { roll: 1, lie: 0.6, pawL: 0.5, pawR: 0.75, headTilt: 0.4, eyes: 1 },
    paw_wave: { sit: 1, pawR: 1, headTilt: 0.3, eyes: 1, tailUp: 0.6 },
  },
}
export const PET_POSE_IDS = { pip: Object.keys(PET_POSES.pip), mochi: Object.keys(PET_POSES.mochi) }
export const PET_POSE_LABELS = { sit: 'Sit', lie: 'Lie down', happy: 'Happy', tilt: 'Head tilt', beg: 'Beg', play_bow: 'Play bow', roll: 'Belly up', loaf: 'Loaf', stretch: 'Big stretch', paw_wave: 'Paw wave' }
export const PAIR_POSES = {
  side_by_side: { label: 'Side by side', her: 'kneel', pip: { pose: 'sit', at: [0.17, 0.1], yaw: -0.25 }, mochi: { pose: 'sit', at: [-0.15, 0.1], yaw: 0.3 } },
  cuddle: { label: 'Cuddle', her: 'sit', pip: { pose: 'lie', at: [0.14, 0.06], yaw: -1.2 }, mochi: { pose: 'loaf', at: [-0.12, 0.1], yaw: 0.9 } },
  playtime: { label: 'Playtime', her: 'twirl', pip: { pose: 'play_bow', at: [0.2, 0.14], yaw: -0.9 }, mochi: { pose: 'paw_wave', at: [-0.18, 0.12], yaw: 0.8 } },
  pose_off: { label: 'Look at us!', her: 'peace', pip: { pose: 'beg', at: [0.16, 0.12], yaw: -0.15 }, mochi: { pose: 'tilt', at: [-0.15, 0.12], yaw: 0.15 } },
  naptime: { label: 'Nap time', her: 'sit', pip: { pose: 'roll', at: [0.16, 0.08], yaw: -0.6 }, mochi: { pose: 'loaf', at: [0.02, 0.17], yaw: 0.2 } },
}
export const PAIR_POSE_IDS = Object.keys(PAIR_POSES)
/** write a pose into a pet's goal (st from Quadruped newPet()); unknown ids fall back to 'sit'. POSE0 resets unlisted keys. */
export function applyPetPose(st, pet, id, POSE0) {
  const p = (PET_POSES[pet] || PET_POSES.pip)[id] || (PET_POSES[pet] || PET_POSES.pip).sit
  if (POSE0) Object.assign(st.goal, POSE0); Object.assign(st.goal, p); st.speed = 0; return st.goal
}
