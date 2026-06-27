# AGENTS.md — Immersive Etchings

Guidance for AI agents working in this repo. Read this before making changes.

## What this is

A **physical-print-anchored VR exhibition**. The original etching is exhibited
physically on the wall; the headset experience is **fully digital VR** rendered
from the artwork's separated layers. The headset never looks at the print
through passthrough — that would destroy the fine linework. Hold this
distinction; it is the project's core decision (see
`docs/immersive-exhibition-abstract.md`).

One codebase targets **browser and Meta Quest 3** via WebXR. No Unity, no C#.

## Stack & conventions

- **React 18 + TypeScript + Vite.** Strict mode is on; keep it compiling
  (`npm run typecheck`). No unused locals/params.
- **react-three-fiber** for the 3D scene; **@react-three/xr** (v6, the
  `createXRStore` / `<XR store>` API) for VR; **drei** for helpers.
- **Data-driven.** An artwork is a JSON file matching the `ArtworkScene` type in
  `src/data/schema.ts`. Adding artwork = adding data + assets, **not** new
  rendering code. If you find yourself writing per-artwork components, push the
  variation into the schema instead.
- **Assets live in `public/`**, referenced by absolute path
  (`/artworks/<id>/figures.webp`). Produced **programmatically** via
  `scripts/pipeline.py` (depth maps, alpha cutouts, vectorized SVG, WebP) — no
  C4D/AE in the critical path. Web formats only: **WebP/PNG** (layers, straight
  alpha), **depth PNG** (drives `DepthLayer`), **SVG** (line art), **glTF/GLB**
  (only if a piece needs real geometry), **mp3** (audio).
- **Depth, not modeling.** Spatial 2.5D comes from a depth map displacing a
  plane (`src/scene/DepthLayer.tsx`); motion is procedural GLSL. Add `depth`,
  `displace`, `drift` to a layer's JSON to activate it.
- **Missing assets must never crash a scene.** `Layer` already falls back to a
  flat colour. Preserve that resilience — scenes are built before art exists.
- **Units are metres.** Artwork `size` is its real-world plane size.

## Commands

```bash
npm install
npm run dev        # browser dev (HTTPS via basic-ssl)
npm run host       # serve on LAN IP so the Quest browser can reach it
npm run build      # tsc -b && vite build  — must pass before any "done"
npm run typecheck
```

WebXR requires a secure context. The Quest browser opens
`https://<LAN-ip>:5173` (accept the self-signed cert).

## Verification before claiming done

- Run `npm run build`. Quote the result. A green typecheck is the floor, not
  proof the experience works.
- Visual / XR behaviour can't be asserted from a build alone — say what was and
  wasn't verified. Use the `deploy-quest` skill to actually test on device.

## Roadmap awareness (M0–M7)

Each milestone ends at a **gate** — do not skip ahead past a failed gate. The
big early risk is **depth quality on line art** — mono-depth models are trained
on photos and can read etchings flat (M0); validate on a real scan via
`scripts/pipeline.py` and refine before producing the full set. Full roadmap in
`docs/immersive-exhibition-abstract.md`.

## Skills

Workflow skills live in `.claude/skills/`. Use them — they encode the
conventions above so phases move fast:

| Skill | Use when |
|---|---|
| `asset-pipeline` | Programmatic asset prep: depth/segment/vectorize/compress (M0, M2) |
| `add-artwork` | Adding a new artwork end to end (M2, M6) |
| `build-scene` | Building/extending an R3F artwork scene from layers (M3) |
| `add-xr-interaction` | Adding gaze/hand/controller interaction (M4) |
| `narrative-system` | Evolving the scene-data model, triggers, state (M5) |
| `deploy-quest` | Loading & testing a build on the Quest 3 (M0, M4, M7) |

## Style

Match the surrounding code: small focused components, comments only where intent
isn't obvious. Don't add dependencies without reason — the pmndrs stack covers
most needs.
