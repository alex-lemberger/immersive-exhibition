# Asset Pipeline (programmatic)

Replaces the C4D/After Effects critical path with scriptable steps. Depth comes
from a mono-depth model; a textured plane displaced by that depth gives spatial
2.5D in Three.js with no modeling. Motion is procedural GLSL. Line art is
vectorized to crisp SVG. Everything here is reproducible and agent-runnable.

## Install (once)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

Apple Silicon: torch uses the **MPS** backend automatically. First run of a
model downloads weights from Hugging Face (cached after).

## Use

```bash
# Depth map from a flat etching (Depth Anything V2)
python scripts/pipeline.py depth scan.jpg public/artworks/pilot/figures.depth.png

# Foreground cutout with alpha (rembg)
python scripts/pipeline.py segment scan.jpg public/artworks/pilot/figures.png

# Line art -> SVG (vtracer) — crisp, scalable, tiny
python scripts/pipeline.py vectorize scan.png public/artworks/pilot/lines.svg

# Cap dimensions + write WebP
python scripts/pipeline.py compress scan.jpg public/artworks/pilot/figures.webp --max-dim 2048

# Depth + compressed color in one go
python scripts/pipeline.py all scan.jpg public/artworks/pilot/
```

## In the scene

Add `depth`, `displace`, and `drift` to a layer in the artwork JSON; the
`DepthLayer` shader displaces the plane by the depth map and animates it
procedurally:

```json
{ "id": "figures", "texture": "/artworks/pilot/figures.webp",
  "depth": "/artworks/pilot/figures.depth.png",
  "z": 0.0, "displace": 0.15, "drift": 0.02 }
```

Layers without `depth` stay flat parallax planes.

## Honest limits

- Mono-depth models are trained on photos; **sparse line art can read flat or
  noisy**. Refine: assign per-layer flat depth, or hand-paint the depth map.
- `rembg` does foreground/background. For multi-layer (figures vs symbols vs
  texture), refine masks by hand or drive **SAM 2** with point prompts.
- AI bootstraps; you refine. Not zero-touch.
- True 3D geometry (rare for etchings) → Blender headless (`bpy`) or image-to-3D
  (TripoSR). Not in this script set yet.
