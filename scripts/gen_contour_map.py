"""
Generate iso-contour lines from an etching's luminance field.

Traces evenly-spaced luminance levels as thin lines and saves them as a
black-on-white PNG. The result is a topographic map of the drawing's tonal
structure — regular, evenly-spaced lines that follow the forms of the figures.
When warped in the shader these produce the Escher/Riley Op-Art effect.

Usage:
    python3 scripts/gen_contour_map.py [input] [output]

Defaults:
    input:  public/artworks/pilot/background.webp
    output: public/artworks/pilot/contour.png
"""

import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

def gen_contour_map(
    input_path: str,
    output_path: str,
    n_levels: int = 12,
    blur_radius: float = 14.0,
    line_thickness: float = 0.03,
) -> None:
    img = Image.open(input_path).convert('L')
    gray = np.array(img, dtype=np.float32) / 255.0

    # Blur first so contours follow broad tonal forms, not noise
    smooth = gaussian_filter(gray, sigma=blur_radius)

    # Normalise to 0..1
    lo, hi = smooth.min(), smooth.max()
    smooth = (smooth - lo) / (hi - lo + 1e-6)

    # Build contour mask: thin band around each iso-level
    levels = np.linspace(0.08, 0.92, n_levels)
    contour = np.zeros_like(smooth)
    for level in levels:
        band = np.abs(smooth - level)
        contour = np.maximum(contour, 1.0 - np.clip(band / line_thickness, 0, 1))

    contour = np.clip(contour, 0, 1)

    # Black lines on white background
    pixel = np.clip((1.0 - contour) * 255, 0, 255).astype(np.uint8)
    out = Image.fromarray(pixel, mode='L').convert('RGB')
    out.save(output_path)
    print(f"Contour map saved: {output_path}  ({out.width}x{out.height})  levels={n_levels}")

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'public/artworks/pilot/background.webp'
    out = sys.argv[2] if len(sys.argv) > 2 else 'public/artworks/pilot/contour.png'
    gen_contour_map(inp, out)
