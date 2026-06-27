---
name: add-xr-interaction
description: Use when adding or debugging WebXR/VR interaction on the Quest 3 — gaze, hand tracking, controller rays, teleport/locomotion, spatial audio, the Enter VR flow (M4 immersive prototype). Triggers on "add VR interaction", "hand tracking", "gaze trigger", "doesn't work in headset", "@react-three/xr".
---

# Add XR Interaction

Translate the screen prototype into the headset. This is the **M4 validation
gate**: does VR beat the web version enough to justify it? Build the minimum
needed to answer that honestly.

## API (this repo uses @react-three/xr v6)

- A store is created once: `const store = createXRStore()` (see `App.tsx`).
- Enter via `store.enterVR()`; the scene tree is wrapped in `<XR store={store}>`.
- **R3F `onClick` already maps to XR `select`** (controller trigger / pinch), so
  the existing `StoryNode` markers work in VR with no change. Verify this first
  before adding anything custom.

## Adding capability

- **Hands / controllers**: configure on the store
  (`createXRStore({ hands: true, controllers: true })`). Use the default input
  visuals before building custom ones.
- **Gaze trigger**: raycast from the camera/head; dwell timer activates the node
  whose `trigger === 'gaze'`. Show a small progress reticle so dwell is legible.
- **Proximity trigger**: in `useFrame`, compare head/controller world position to
  node position; fire when within a threshold for `trigger === 'proximity'`.
- **Spatial audio**: upgrade `audio/useAudio.ts` to positional audio
  (`THREE.PositionalAudio` attached to the node group, or Howler stereo pos) so
  narration comes *from* the story node.
- **Locomotion**: prefer the viewer staying put for a contemplative single
  artwork. Add teleport (drei/xr helpers) only when navigating between works
  (M6).

## Comfort & exhibition realities

- Keep content within a comfortable arc; avoid forcing big head turns.
- No sudden acceleration, flashing, or vection — this is contemplative art, and
  visitors wear it briefly. Comfort first.
- Test seated and standing.

## Workflow

1. Confirm existing `onClick` nodes work in VR unchanged.
2. Add only the interaction the narrative needs; respect each node's `trigger`.
3. Test on device every change via `deploy-quest` — XR cannot be validated from
   a desktop build.

## Done means

Targeted interaction works in the headset (state which), comfortable, build
passes. Record the M4 gate verdict: VR clearly better than web — yes/no.
