---
name: asset-pipeline
description: Use when turning a flat etching/illustration into web-loadable assets via the programmatic pipeline (depth maps, alpha cutouts, vectorized line art, WebP) — the M0 de-risk and every artwork's M2 prep. Triggers on "prepare layers", "make a depth map", "segment the artwork", "vectorize", "asset pipeline", "process the scan".
---

# Asset Pipeline (programmatic, local GPU)

The C4D/After Effects critical path is replaced by scriptable steps in
`scripts/pipeline.py`. Depth comes from a mono-depth model; a textured plane
displaced by that depth gives spatial 2.5D in Three.js with **no modeling**.
Motion is procedural GLSL (`DepthLayer`). Line art is vectorized to crisp SVG.
Everything is reproducible and runnable by the agent. Runs locally — Apple
Silicon uses the torch **MPS** backend.

## Setup (once)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
```

## Commands

```bash
python scripts/pipeline.py depth      scan.jpg out.depth.png       # Depth Anything V2
python scripts/pipeline.py segment    scan.jpg out.png             # rembg alpha cutout
python scripts/pipeline.py vectorize  scan.png out.svg             # vtracer line art -> SVG
python scripts/pipeline.py compress   scan.jpg out.webp --max-dim 2048
python scripts/pipeline.py all        scan.jpg public/artworks/<id>/   # depth + WebP
```

## Steps for one artwork

1. **Separate layers.** `segment` gives foreground/background. For finer splits
   (figures vs symbols vs texture), refine masks by hand or drive **SAM 2** with
   point prompts. Save each as WebP/PNG with **straight alpha**.
2. **Depth.** Run `depth` per layer (or on the whole image) → `*.depth.png`.
3. **Vectorize** pure line work with `vectorize` → SVG (crisp, scalable, tiny;
   great for etching linework).
4. **Compress** rasters with `compress` (cap ~2048px, WebP). Keep total artwork
   payload well under ~30 MB for fast Quest loading.
5. **Place** under `public/artworks/<id>/` using the JSON's absolute paths.
6. **Wire depth** into the layer JSON to activate `DepthLayer`:
   ```json
   { "id": "figures", "texture": "/artworks/<id>/figures.webp",
     "depth": "/artworks/<id>/figures.depth.png",
     "z": 0.0, "displace": 0.15, "drift": 0.02 }
   ```
   Layers without `depth` stay flat parallax planes.
7. **Validate** in `npm run dev`, then **on device** via `deploy-quest`.

## Honest limits

- Mono-depth is trained on photos; **sparse line art can read flat or noisy**.
  Refine: per-layer flat depth, or hand-paint the depth map. AI bootstraps, you
  refine — not zero-touch.
- `rembg` = foreground/background only; multi-layer needs SAM 2 or manual masks.
- Export **straight** (non-premultiplied) alpha to avoid edge fringing.
- Oversized textures silently exceed the Quest GPU budget — downscale.
- True 3D geometry (rare for etchings) → Blender headless (`bpy`) or image-to-3D
  (TripoSR). Not scripted yet; add only when a piece genuinely needs a mesh.

## Done means

Assets in `public/artworks/<id>/`, depth layers displace correctly in the
browser **and** on the Quest. State which of the two you verified.
