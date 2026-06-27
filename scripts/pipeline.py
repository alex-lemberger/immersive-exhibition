#!/usr/bin/env python3
"""Programmatic asset pipeline for immersive-etchings.

Replaces the C4D/AE critical path with scriptable, reproducible steps:

  depth      flat etching            -> depth map      (Depth Anything V2)
  segment    flat etching            -> alpha cutout   (rembg)
  vectorize  raster line art         -> SVG            (vtracer)
  compress   any image               -> capped WebP    (Pillow)
  all        run depth + compress on an image

Depth + a textured plane in Three.js gives spatial 2.5D with no modeling;
procedural GLSL drives motion. See .claude/skills/asset-pipeline.

Heavy ML deps are imported lazily so `--help` works without installing them.
Device auto-selects MPS (Apple Silicon) / CUDA / CPU.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def pick_device() -> str:
    import torch

    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def cmd_depth(args: argparse.Namespace) -> None:
    import torch
    from PIL import Image
    from transformers import pipeline as hf_pipeline

    device = args.device or pick_device()
    print(f"[depth] model={args.model} device={device}", file=sys.stderr)
    pipe = hf_pipeline(
        "depth-estimation", model=args.model, device=torch.device(device)
    )
    img = Image.open(args.input).convert("RGB")
    depth = pipe(img)["depth"]  # PIL.Image, mode "L", normalized
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    depth.save(out)
    print(f"[depth] wrote {out}")


def cmd_segment(args: argparse.Namespace) -> None:
    from rembg import remove
    from PIL import Image

    img = Image.open(args.input).convert("RGBA")
    cutout = remove(img)  # foreground with alpha
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    cutout.save(out)
    print(f"[segment] wrote {out} (foreground cutout)")
    print("[segment] for multi-layer separation, refine masks by hand or "
          "use SAM 2 with point prompts.", file=sys.stderr)


def cmd_vectorize(args: argparse.Namespace) -> None:
    import vtracer

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    vtracer.convert_image_to_svg_py(
        str(args.input), str(out), colormode="binary", mode="spline"
    )
    print(f"[vectorize] wrote {out}")


def cmd_compress(args: argparse.Namespace) -> None:
    from PIL import Image

    img = Image.open(args.input).convert("RGBA")
    longest = max(img.size)
    if longest > args.max_dim:
        scale = args.max_dim / longest
        new = (round(img.width * scale), round(img.height * scale))
        img = img.resize(new, Image.LANCZOS)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", quality=args.quality, method=6)
    print(f"[compress] wrote {out} ({img.width}x{img.height}, q={args.quality})")


def cmd_crop(args: argparse.Namespace) -> None:
    """Auto-crop the paper margin to the plate/drawing by content bounding box."""
    import numpy as np
    from PIL import Image

    img = Image.open(args.input).convert("RGB")
    gray = np.asarray(img.convert("L"))
    mask = gray < args.threshold  # ink/content darker than paper

    # Density per row/column ignores sparse margin specks (foxing, pencil ticks,
    # signature) that a raw bounding box would latch onto.
    col = mask.mean(axis=0)
    row = mask.mean(axis=1)
    xs = np.where(col > args.density)[0]
    ys = np.where(row > args.density)[0]
    if xs.size == 0 or ys.size == 0:
        raise SystemExit("[crop] no dense content — lower --density or raise --threshold")
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    pad_x = round((x1 - x0) * args.pad)
    pad_y = round((y1 - y0) * args.pad)
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(img.width, x1 + pad_x)
    y1 = min(img.height, y1 + pad_y)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.crop((x0, y0, x1, y1)).save(out)
    print(f"[crop] {img.width}x{img.height} -> {x1-x0}x{y1-y0}  wrote {out}")


def cmd_split(args: argparse.Namespace) -> None:
    """Cut a near (foreground) layer from the color image using the depth map.

    Produces an alpha-feathered cutout of the bright/near regions. Use the full
    color image as the far layer behind it — no inpainting hole that way.
    """
    import numpy as np
    from PIL import Image, ImageFilter

    color = Image.open(args.color).convert("RGBA")
    depth = Image.open(args.depth).convert("L").resize(color.size, Image.BILINEAR)
    d = np.asarray(depth, dtype=np.float32) / 255.0

    t, w = args.threshold, max(args.width, 1e-4)
    alpha = np.clip((d - (t - w)) / (2 * w), 0.0, 1.0)  # smoothstep-ish ramp
    a_img = Image.fromarray((alpha * 255).astype("uint8"), "L")
    if args.feather > 0:
        a_img = a_img.filter(ImageFilter.GaussianBlur(args.feather))

    near = color.copy()
    near.putalpha(a_img)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    near.save(out, "WEBP", quality=args.quality, method=6)
    print(f"[split] near cutout (threshold={t}) wrote {out}")


def cmd_sam(args: argparse.Namespace) -> None:
    """Point-prompted segmentation (SAM). Reliable on line art where saliency/
    depth fail. Pass foreground points as 'x,y;x,y;...'; output is an
    alpha-feathered cutout of the union mask."""
    import numpy as np
    import torch
    from PIL import Image, ImageFilter
    from transformers import SamModel, SamProcessor

    pts = [[int(float(a)) for a in p.split(",")] for p in args.points.split(";") if p]
    device = args.device or pick_device()
    print(f"[sam] {len(pts)} points device={device}", file=sys.stderr)

    image = Image.open(args.image).convert("RGB")
    model = SamModel.from_pretrained(args.model).to(device)
    processor = SamProcessor.from_pretrained(args.model)
    inputs = processor(image, input_points=[[pts]], return_tensors="pt").to(device)
    with torch.no_grad():
        out = model(**inputs)
    masks = processor.image_processor.post_process_masks(
        out.pred_masks.cpu(), inputs["original_sizes"].cpu(),
        inputs["reshaped_input_sizes"].cpu(),
    )[0][0]  # (num_masks, H, W)
    best = int(out.iou_scores[0, 0].argmax())
    mask = masks[best].numpy().astype("uint8") * 255

    a_img = Image.fromarray(mask, "L")
    if args.feather > 0:
        a_img = a_img.filter(ImageFilter.GaussianBlur(args.feather))
    near = image.convert("RGBA")
    near.putalpha(a_img)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    near.save(out_path, "WEBP", quality=args.quality, method=6)
    cover = (np.asarray(a_img) > 10).mean()
    print(f"[sam] wrote {out_path} (mask covers {cover:.0%}, iou={out.iou_scores[0,0,best]:.2f})")


def cmd_all(args: argparse.Namespace) -> None:
    stem = Path(args.input).stem
    out_dir = Path(args.out_dir)
    depth_ns = argparse.Namespace(
        input=args.input,
        output=out_dir / f"{stem}.depth.png",
        model=args.model,
        device=args.device,
    )
    cmd_depth(depth_ns)
    comp_ns = argparse.Namespace(
        input=args.input,
        output=out_dir / f"{stem}.webp",
        max_dim=args.max_dim,
        quality=args.quality,
    )
    cmd_compress(comp_ns)
    print(f"[all] depth + compressed color in {out_dir}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="command", required=True)

    d = sub.add_parser("depth", help="depth map from a flat image")
    d.add_argument("input")
    d.add_argument("output")
    d.add_argument("--model", default="depth-anything/Depth-Anything-V2-Small-hf")
    d.add_argument("--device", default=None, help="mps|cuda|cpu (auto if unset)")
    d.set_defaults(func=cmd_depth)

    s = sub.add_parser("segment", help="foreground cutout (alpha)")
    s.add_argument("input")
    s.add_argument("output")
    s.set_defaults(func=cmd_segment)

    v = sub.add_parser("vectorize", help="raster line art -> SVG")
    v.add_argument("input")
    v.add_argument("output")
    v.set_defaults(func=cmd_vectorize)

    c = sub.add_parser("compress", help="cap size and write WebP")
    c.add_argument("input")
    c.add_argument("output")
    c.add_argument("--max-dim", type=int, default=2048)
    c.add_argument("--quality", type=int, default=82)
    c.set_defaults(func=cmd_compress)

    cr = sub.add_parser("crop", help="auto-crop paper margin to content bbox")
    cr.add_argument("input")
    cr.add_argument("output")
    cr.add_argument("--threshold", type=int, default=200, help="0-255; below = content")
    cr.add_argument("--density", type=float, default=0.02, help="min ink fraction per row/col")
    cr.add_argument("--pad", type=float, default=0.01, help="fraction padding")
    cr.set_defaults(func=cmd_crop)

    sp = sub.add_parser("split", help="cut a near layer from color using depth")
    sp.add_argument("color")
    sp.add_argument("depth")
    sp.add_argument("output")
    sp.add_argument("--threshold", type=float, default=0.45, help="depth cut, 0-1")
    sp.add_argument("--width", type=float, default=0.08, help="ramp half-width")
    sp.add_argument("--feather", type=float, default=4.0, help="alpha blur px")
    sp.add_argument("--quality", type=int, default=82)
    sp.set_defaults(func=cmd_split)

    sm = sub.add_parser("sam", help="point-prompted segmentation cutout")
    sm.add_argument("image")
    sm.add_argument("output")
    sm.add_argument("--points", required=True, help="'x,y;x,y;...' foreground points")
    sm.add_argument("--model", default="facebook/sam-vit-base")
    sm.add_argument("--device", default=None)
    sm.add_argument("--feather", type=float, default=4.0)
    sm.add_argument("--quality", type=int, default=82)
    sm.set_defaults(func=cmd_sam)

    a = sub.add_parser("all", help="depth + compressed color for one image")
    a.add_argument("input")
    a.add_argument("out_dir")
    a.add_argument("--model", default="depth-anything/Depth-Anything-V2-Small-hf")
    a.add_argument("--device", default=None)
    a.add_argument("--max-dim", type=int, default=2048)
    a.add_argument("--quality", type=int, default=82)
    a.set_defaults(func=cmd_all)

    return p


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
