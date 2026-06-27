---
name: asset-pipeline
description: Use when exporting or validating Cinema 4D / After Effects artwork assets for the web (glTF, WebP layers, depth maps, Lottie, audio) — the M0 de-risk and every artwork's M2 prep. Triggers on "export from C4D", "prepare layers", "glTF won't load", "asset pipeline".
---

# Asset Pipeline (C4D / AE → Web)

Convert authored art into web-loadable assets the scene can consume. The
**C4D → glTF → Quest** path is the project's biggest hidden risk — validate it
on a real export before producing finished art (Milestone M0).

## Target formats

| Source | Use | Export as |
|---|---|---|
| Flat separated layers (AE/Photoshop) | parallax planes | **WebP** or **PNG** with alpha |
| 3D depth / displaced geometry (C4D) | true spatial depth | **glTF / GLB** |
| Vector mark animation (AE) | crisp scalable motion | **Lottie** (`bodymovin`) |
| Pre-rendered motion (AE) | complex animated layer | **WebP image sequence** or short muted webm |
| Ambient / narration | audio | **mp3** (mono for narration) |

## Steps

1. **Separate layers** in AE/Photoshop: background, midground, figures,
   foreground, symbols, atmosphere. Export each as WebP/PNG **with alpha**,
   power-of-two-ish dimensions, sRGB. Keep names matching the JSON layer ids.
2. **For 3D depth**, prefer **C4D → Blender → glTF** (the direct C4D glTF
   exporter is rough). Check in Blender that scale, axes (Y-up), and materials
   survived. Keep meshes light — this runs on a standalone headset.
3. **Compress.** Run images through `squoosh`/`sharp` to WebP. Aim for layers
   < ~1–2 MB each; total artwork payload should stay well under ~30 MB so the
   Quest browser loads it fast.
4. **Place** everything under `public/artworks/<id>/` using the paths the JSON
   references (absolute, e.g. `/artworks/<id>/figures.png`).
5. **Validate**: load the artwork in `npm run dev`. Layers should appear with
   correct depth order and alpha. Then validate **on device** via the
   `deploy-quest` skill — desktop success ≠ Quest success.

## Gotchas

- glTF colour/space mismatches: set texture `colorSpace = SRGBColorSpace`
  (the loader in `Layer.tsx` already does this for plane textures).
- Premultiplied alpha fringing on PNGs — export straight alpha.
- Huge textures silently fail on the Quest's GPU memory budget; downscale.
- A missing file must not crash — `Layer` falls back to a flat colour by design.

## Done means

Assets in `public/artworks/<id>/`, scene renders them correctly in the browser
**and** on the Quest. State explicitly which of the two you verified.
