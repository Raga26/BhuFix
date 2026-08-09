"""Generate BhuFix favicon / PWA icon assets into frontend/public."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public"
ORANGE = (232, 115, 74)  # #E8734A
WHITE = (255, 255, 255)

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="BhuFix">
  <rect width="64" height="64" rx="14" fill="#E8734A"/>
  <text x="32" y="44" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="38" font-weight="800" fill="#ffffff">B</text>
</svg>
"""

MANIFEST = """{
  "name": "BhuFix",
  "short_name": "BhuFix",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#E8734A",
  "background_color": "#ffffff",
  "display": "standalone"
}
"""


def make_icon(size: int, radius_ratio: float = 0.22) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(2, int(size * radius_ratio))
    pad = max(0, size // 32)
    draw.rounded_rectangle(
        (pad, pad, size - 1 - pad, size - 1 - pad),
        radius=radius,
        fill=ORANGE + (255,),
    )

    font = None
    for candidate in (
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ):
        try:
            font = ImageFont.truetype(candidate, size=int(size * 0.62))
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "B"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] + size * 0.02
    draw.text((x, y), text, font=font, fill=WHITE + (255,))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "favicon.svg").write_text(SVG, encoding="utf-8")
    (OUT / "site.webmanifest").write_text(MANIFEST, encoding="utf-8")

    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-48x48.png": 48,
        "apple-touch-icon.png": 180,
        "android-chrome-192x192.png": 192,
        "android-chrome-512x512.png": 512,
    }
    for name, size in sizes.items():
        make_icon(size).save(OUT / name, format="PNG")

    # Pillow builds multi-size .ico when sizes= is provided
    make_icon(48).save(
        OUT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    logo_path = OUT / "logo.png"
    if logo_path.exists():
        Image.open(logo_path).convert("RGBA").save(logo_path, format="PNG", optimize=True)

    print("Wrote favicon assets:")
    for path in sorted(OUT.iterdir()):
        if path.suffix.lower() in {".ico", ".png", ".svg", ".webmanifest"}:
            print(f"  {path.name:30} {path.stat().st_size:7d} bytes")


if __name__ == "__main__":
    main()
