"""
Generates the three app icon PNGs from the Ember design system's Concentric
mark. Three outputs:

  apps/mobile/assets/icon.png           1024x1024  full design (iOS / App Store)
  apps/mobile/assets/adaptive-icon.png  1024x1024  full design inside Android safe zone
  apps/mobile/assets/favicon.png        48x48      simplified — drops the dashed
                                                   outer ring and cardinal dots

All outputs are RGB (no alpha). Apple rejects icons with transparency.

The full design has multiple visual layers (dashed outer ring, solid middle
ring, four cardinal dots between them, an open lit center) so that the
composition reads as a diagram of points around a place, not as a single
centered target. An earlier version dropped the middle ring and the cardinal
dots, leaving just the outer ring + a filled center; the result read as
anatomy. Adding back the middle layers and removing the center dot/fill
fixes that.

Usage:
  python3 -m venv /tmp/icon-venv && /tmp/icon-venv/bin/pip install Pillow
  /tmp/icon-venv/bin/python apps/mobile/scripts/generate-icons.py
"""

from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageDraw

# Color palette from apps/mobile/tailwind.config.js (Ember design system, light mode).
PAPER = (245, 240, 228)         # #F5F0E4  cream background
EMBER = (184, 90, 44)           # #B85A2C  lit ember accent
DUST2 = (160, 155, 145)         # #A09B91  outer dashed ring + middle solid ring
INK_SOFT = (154, 150, 141)      # #9A968D  ink at ~40% on paper, flattened to RGB
                                 # (used for the four cardinal dots)

# Supersample factor — render at SUPERSAMPLE * target then resize with LANCZOS
# for clean anti-aliased edges on the dashed ring and circle strokes.
SUPERSAMPLE = 4

ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"


def _draw_dot(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color: tuple) -> None:
    """Filled circle centered at (cx, cy) with radius r."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)


def _draw_ring(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    r: int,
    stroke: int,
    color: tuple,
) -> None:
    """Solid outline circle centered at (cx, cy) with radius r."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=stroke)


def _draw_dashed_ring(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    r: int,
    stroke: int,
    color: tuple,
    cycle_deg: float = 10,
    dash_deg: float = 4,
) -> None:
    """Dashed outline circle. PIL has no native dashed-circle; we iterate
    angles and draw short arcs at each `dash_deg` interval within `cycle_deg`."""
    bbox = (cx - r, cy - r, cx + r, cy + r)
    angle = 0.0
    while angle < 360:
        draw.arc(bbox, start=angle, end=angle + dash_deg, fill=color, width=stroke)
        angle += cycle_deg


def render_full_icon(target_size: int) -> Image.Image:
    """Full Concentric design: cream background, dashed outer ring at 40%,
    solid middle ring at 25%, four cardinal dots between them at ~32%, and
    an open (stroke-only) lit ember center at 12%. No center dot, no
    soft fill — those were what made the previous design read anatomically.
    Rendered at SUPERSAMPLE*target then resized for AA."""
    s = target_size * SUPERSAMPLE
    img = Image.new("RGB", (s, s), PAPER)
    draw = ImageDraw.Draw(img)
    cx = cy = s // 2

    # Dashed outer ring at 40% radius. Stroke ~1.5% of canvas.
    outer_r = int(s * 0.40)
    outer_stroke = max(2, int(s * 0.015))
    _draw_dashed_ring(draw, cx, cy, outer_r, outer_stroke, DUST2)

    # Four cardinal dots between outer (40%) and middle (25%) rings.
    # Place at radius ~32% — visually anchored in the gap. Dot radius ~1.5%
    # of canvas; the first generation tried smaller dots and they read as
    # specks; this size makes them clearly intentional compass markers.
    dot_radius_from_center = int(s * 0.32)
    dot_r = max(2, int(s * 0.015))
    for angle_deg in (270, 0, 90, 180):  # top, right, bottom, left
        angle_rad = angle_deg * pi / 180
        dx = int(dot_radius_from_center * cos(angle_rad))
        dy = int(dot_radius_from_center * sin(angle_rad))
        _draw_dot(draw, cx + dx, cy + dy, dot_r, INK_SOFT)

    # Solid middle ring at 25% radius. Slightly thinner stroke than outer
    # so the outer dashed ring stays the visual anchor and the middle ring
    # reads as a secondary layer.
    middle_r = int(s * 0.25)
    middle_stroke = max(1, int(s * 0.012))
    _draw_ring(draw, cx, cy, middle_r, middle_stroke, DUST2)

    # Lit center: open ember-stroked circle at 12% radius, no fill (cream
    # background shows through). This is the "you are here" marker.
    center_r = int(s * 0.12)
    center_stroke = max(1, int(s * 0.015))
    _draw_ring(draw, cx, cy, center_r, center_stroke, EMBER)

    return img.resize((target_size, target_size), Image.LANCZOS)


def render_simplified_icon(target_size: int) -> Image.Image:
    """For sizes too small to render the dashed outer ring + cardinal dots
    legibly. Keeps the cream background, the solid middle ring, and the open
    lit center. Used for the 48px favicon."""
    s = target_size * SUPERSAMPLE
    img = Image.new("RGB", (s, s), PAPER)
    draw = ImageDraw.Draw(img)
    cx = cy = s // 2

    # Middle ring scaled larger since there's no outer ring competing.
    # 38% reads as the dominant geometric element.
    middle_r = int(s * 0.38)
    middle_stroke = max(1, int(s * 0.04))
    _draw_ring(draw, cx, cy, middle_r, middle_stroke, DUST2)

    # Open lit center, proportionally larger.
    center_r = int(s * 0.18)
    center_stroke = max(1, int(s * 0.04))
    _draw_ring(draw, cx, cy, center_r, center_stroke, EMBER)

    return img.resize((target_size, target_size), Image.LANCZOS)


def render_adaptive_icon(canvas_size: int) -> Image.Image:
    """Android adaptive icon foreground: full design rendered at 75% of the
    canvas (Android's safe zone) and centered on a cream background that
    fills the rest. Android applies a runtime mask (circle, squircle, etc.)
    — keeping content in the central 75% means the mask never clips
    meaningful pixels. Effective radii in the final 1024px canvas: outer
    ring 30%, middle 19%, dots 24%, lit center 9%."""
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
        if img.mode != "RGB":
            img = img.convert("RGB")
        out_path = ASSETS_DIR / filename
        img.save(out_path, format="PNG", optimize=True)
        size_bytes = out_path.stat().st_size
        print(f"  wrote {out_path.name}  size={img.size}  mode={img.mode}  bytes={size_bytes}")

    # Verification pass.
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
