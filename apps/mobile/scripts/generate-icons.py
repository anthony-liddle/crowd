"""
Generates the three app icon PNGs from the Ember design system's Concentric
mark: a quiet cream square with a dashed outer ring and a lit ember target
at the center. Three outputs:

  apps/mobile/assets/icon.png           1024x1024  full design (iOS / App Store)
  apps/mobile/assets/adaptive-icon.png  1024x1024  full design inside Android safe zone
  apps/mobile/assets/favicon.png        48x48      simplified — drops the dashed ring

All outputs are RGB (no alpha). Apple rejects icons with transparency.

Usage:
  python3 -m venv /tmp/icon-venv && /tmp/icon-venv/bin/pip install Pillow
  /tmp/icon-venv/bin/python apps/mobile/scripts/generate-icons.py

The script is idempotent — re-running overwrites the existing files.
"""

from pathlib import Path

from PIL import Image, ImageDraw

# Color palette from apps/mobile/tailwind.config.js (Ember design system, light mode).
PAPER = (245, 240, 228)         # #F5F0E4  cream background
EMBER = (184, 90, 44)           # #B85A2C  lit ember accent
EMBER_SOFT = (235, 217, 203)    # #EBD9CB  ember at ~12% on cream, flattened to RGB
DUST2 = (160, 155, 145)         # #A09B91  dashed ring

# How much we supersample the 1024px renders before downsampling. PIL's draw
# primitives have limited anti-aliasing; rendering at 4x and resizing with
# LANCZOS gives clean edges on the dashed ring and the inner circle's stroke.
SUPERSAMPLE = 4

ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"


def render_full_icon(target_size: int) -> Image.Image:
    """Full Concentric design: cream background, dashed outer ring at 44%
    radius, lit center circle at 13% radius, small ember dot at the exact
    center. Rendered at SUPERSAMPLE*target_size and downsampled for AA."""
    s = target_size * SUPERSAMPLE
    img = Image.new("RGB", (s, s), PAPER)
    draw = ImageDraw.Draw(img)
    cx = cy = s // 2

    # Dashed outer ring. PIL has no native dashed-circle primitive, so we
    # iterate angles and draw short arcs. Cycle of 10 deg with a 4 deg dash
    # gives ~36 dashes around — visually balanced at 1024px.
    outer_r = int(s * 0.44)
    ring_stroke = max(2, int(s * 0.02))
    ring_bbox = (cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r)
    cycle_deg = 10
    dash_deg = 4
    angle = 0
    while angle < 360:
        draw.arc(ring_bbox, start=angle, end=angle + dash_deg, fill=DUST2, width=ring_stroke)
        angle += cycle_deg

    # Lit center circle: ember-soft fill, ember stroke.
    center_r = int(s * 0.13)
    center_bbox = (cx - center_r, cy - center_r, cx + center_r, cy + center_r)
    center_stroke = max(1, int(s * 0.015))
    draw.ellipse(center_bbox, fill=EMBER_SOFT, outline=EMBER, width=center_stroke)

    # Tiny ember dot at exact center.
    dot_r = max(2, int(s * 0.02))
    dot_bbox = (cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r)
    draw.ellipse(dot_bbox, fill=EMBER)

    return img.resize((target_size, target_size), Image.LANCZOS)


def render_simplified_icon(target_size: int) -> Image.Image:
    """For sizes too small to render the dashed ring legibly. Keeps the cream
    background, the lit center circle, and the ember dot. Used for the 48px
    favicon — the dashed ring becomes noise at that size."""
    s = target_size * SUPERSAMPLE
    img = Image.new("RGB", (s, s), PAPER)
    draw = ImageDraw.Draw(img)
    cx = cy = s // 2

    # Center circle scaled up since there's no outer ring competing for visual
    # weight. 26% radius reads as the dominant element.
    center_r = int(s * 0.26)
    center_bbox = (cx - center_r, cy - center_r, cx + center_r, cy + center_r)
    center_stroke = max(1, int(s * 0.03))
    draw.ellipse(center_bbox, fill=EMBER_SOFT, outline=EMBER, width=center_stroke)

    # Center dot proportionally larger too.
    dot_r = max(1, int(s * 0.05))
    dot_bbox = (cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r)
    draw.ellipse(dot_bbox, fill=EMBER)

    return img.resize((target_size, target_size), Image.LANCZOS)


def render_adaptive_icon(canvas_size: int) -> Image.Image:
    """Android adaptive icon foreground: full design rendered at 75% of the
    canvas (the standard adaptive-icon safe zone) and centered on a cream
    background that fills the rest. Android applies a runtime mask (circle,
    squircle, etc.) — the safe zone keeps the meaningful content unmasked."""
    inner_size = int(canvas_size * 0.75)
    inner = render_full_icon(inner_size)

    canvas = Image.new("RGB", (canvas_size, canvas_size), PAPER)
    offset = (canvas_size - inner_size) // 2
    canvas.paste(inner, (offset, offset))
    return canvas


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    targets = [
        ("icon.png", render_full_icon(1024)),
        ("adaptive-icon.png", render_adaptive_icon(1024)),
        ("favicon.png", render_simplified_icon(48)),
    ]

    for filename, img in targets:
        # Belt-and-suspenders: ensure RGB even though we constructed in RGB.
        # Some PIL operations can sneak in alpha; explicit convert avoids
        # surprises in the saved file.
        if img.mode != "RGB":
            img = img.convert("RGB")
        out_path = ASSETS_DIR / filename
        img.save(out_path, format="PNG", optimize=True)
        size_bytes = out_path.stat().st_size
        print(f"  wrote {out_path.name}  size={img.size}  mode={img.mode}  bytes={size_bytes}")

    # Verification pass: re-open each file and confirm it's a valid PNG with
    # the expected dimensions and no alpha channel.
    print("\nVerification:")
    expected = {"icon.png": (1024, 1024), "adaptive-icon.png": (1024, 1024), "favicon.png": (48, 48)}
    for filename, expected_size in expected.items():
        path = ASSETS_DIR / filename
        with Image.open(path) as opened:
            assert opened.size == expected_size, f"{filename}: size {opened.size} != expected {expected_size}"
            assert opened.mode == "RGB", f"{filename}: mode {opened.mode} has alpha"
            assert opened.format == "PNG", f"{filename}: format {opened.format}"
            print(f"  ok  {filename}  {opened.size}  {opened.mode}  {opened.format}")


if __name__ == "__main__":
    main()
