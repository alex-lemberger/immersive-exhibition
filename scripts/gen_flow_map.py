"""
Generate a tangent flow map from an etching image.

Loads the source image, computes the Sobel gradient to find stroke normals,
rotates 90 degrees to get stroke tangents, and saves an RG PNG where
R = (tx + 1) / 2 and G = (ty + 1) / 2. The shader decodes back to -1..1
and displaces linework along its own grain.

Usage:
    python3 scripts/gen_flow_map.py [input] [output]

Defaults:
    input:  public/artworks/pilot/background.webp
    output: public/artworks/pilot/flow.png
"""

import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

def gen_flow_map(input_path: str, output_path: str, blur_radius: float = 3.0) -> None:
    img = Image.open(input_path).convert('L')
    gray = np.array(img, dtype=np.float32) / 255.0

    # Blur before gradient to reduce noise and get cleaner stroke directions
    smooth = gaussian_filter(gray, sigma=blur_radius)

    # Sobel gradient — points perpendicular to strokes (across them)
    from scipy.ndimage import sobel
    gx = sobel(smooth, axis=1)  # horizontal
    gy = sobel(smooth, axis=0)  # vertical

    # Rotate 90° to get tangent (along the stroke, not across it)
    tx = -gy
    ty =  gx

    # Normalize — zero-gradient areas (blank paper) get a zero vector
    mag = np.sqrt(tx**2 + ty**2)
    eps = 1e-6
    tx = np.where(mag > eps, tx / (mag + eps), 0.0)
    ty = np.where(mag > eps, ty / (mag + eps), 0.0)

    # Encode -1..1 → 0..255
    r = np.clip((tx + 1.0) * 0.5 * 255, 0, 255).astype(np.uint8)
    g = np.clip((ty + 1.0) * 0.5 * 255, 0, 255).astype(np.uint8)
    b = np.zeros_like(r)

    flow = Image.fromarray(np.stack([r, g, b], axis=-1), mode='RGB')
    flow.save(output_path)
    print(f"Flow map saved: {output_path}  ({flow.width}x{flow.height})")

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'public/artworks/pilot/background.webp'
    out = sys.argv[2] if len(sys.argv) > 2 else 'public/artworks/pilot/flow.png'
    gen_flow_map(inp, out)
