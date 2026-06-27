---
name: build-scene
description: Use when building or extending an R3F artwork scene from layers — parallax depth, layer animation, lighting, postprocessing, composition (M3 web prototype). Triggers on "build the scene", "add parallax", "animate a layer", "scene looks flat".
---

# Build / Extend an Artwork Scene

The R3F scene that turns flat layers into a layered, spatial, contemplative
object. This is the M3 prototype where the **narrative is proven on a screen
before going to headset** — get the emergence working here; it is cheap.

## Where things are

- `src/scene/ArtworkScene.tsx` — assembles layers + story nodes, owns selection.
- `src/scene/Layer.tsx` — one depth plane; pointer parallax; missing-asset
  fallback. Extend here for layer animation (drift, breathing opacity, displaced
  geometry, Lottie/sequence playback).
- `src/scene/StoryNode.tsx` — interactive fragment marker + billboard text.
- `src/App.tsx` — Canvas, lights, camera, OrbitControls, XR store.

## Patterns

- **Depth** comes from per-layer `z` plus parallax. On screen, parallax is
  pointer-driven (already wired). Don't over-parallax — subtle reads as depth,
  strong reads as a gimmick.
- **Animation**: drive it in a `useFrame` inside the layer/component using
  `state.clock.elapsedTime`. Keep it slow and contemplative, matching the
  artwork's tone. Avoid per-frame allocation — reuse vectors (`useMemo`).
- **Lighting**: layers use `meshBasicMaterial` (unlit) by default so etching
  tone is preserved exactly. Only switch to lit materials if a layer has real 3D
  geometry that should respond to light.
- **Postprocessing** (vignette, grain, subtle bloom) via
  `@react-three/postprocessing` — add only if it serves the mood, and test cost
  on the Quest (fill-rate is limited).
- **Performance budget**: this must also run at 72–90 fps on a standalone
  headset. Watch draw calls, texture sizes, transparent overdraw.

## Workflow

1. Get layers in via `asset-pipeline` / `add-artwork`.
2. Compose depth and motion on screen until the interpretive "emergence" lands.
3. `npm run build`; keep TypeScript strict-clean.
4. Only then take it to the headset (`add-xr-interaction`, `deploy-quest`).

## Done means

Scene reads as layered and alive on screen, fps headroom for headset, build
passes. Note what you verified on screen vs device.
