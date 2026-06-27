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
