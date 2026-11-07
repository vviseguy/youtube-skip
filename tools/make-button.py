"""Draw the README download button for one version.

    python tools/make-button.py --version 1.3.3 --out download.png

The release workflow runs this and attaches download.png to the release, so
the README image (releases/latest/download/download.png) always shows the
newest version. Fonts: pass --bold/--regular/--light, or it uses the first
set found in FONT_SETS.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FONT_SETS = [
    # bundled (if present), then common system fonts
    (HERE / "fonts/Inter-Bold.ttf", HERE / "fonts/Inter-Medium.ttf", HERE / "fonts/Inter-Light.ttf"),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")),
    (Path("C:/Windows/Fonts/segoeuib.ttf"), Path("C:/Windows/Fonts/seguisb.ttf"), Path("C:/Windows/Fonts/segoeuil.ttf")),
]
S = 2  # pixel scale (2x for sharp display)
RED_TOP, RED_BOTTOM = (240, 42, 42), (216, 20, 20)


def draw_button(version: str, bold: Path, regular: Path, light: Path) -> Image.Image:
    f_title = ImageFont.truetype(str(bold), 17 * S)
    f_ver = ImageFont.truetype(str(light), 15 * S)
    f_sub = ImageFont.truetype(str(regular), int(11.5 * S))
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w_title = probe.textlength("Download", font=f_title)
    w_ver = probe.textlength(f"v{version}", font=f_ver)

    bh, pad = 56 * S, 10 * S
    bw = max(248 * S, int(56 * S + w_title + 8 * S + w_ver + 22 * S))
    W, H = bw + 2 * pad, bh + 2 * pad
    box = (pad, pad, pad + bw, pad + bh)
    radius = 12 * S

    # soft red shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((box[0], box[1] + 3 * S, box[2], box[3] + 3 * S), radius, fill=(150, 10, 10, 72))
    img = shadow.filter(ImageFilter.GaussianBlur(5 * S))

    # vertical gradient body
    grad = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        t = min(1, max(0, (y - box[1]) / bh))
        gd.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(RED_TOP, RED_BOTTOM)) + (255,))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # Semi-transparent parts go on their own layer, then blend onto the
    # button (drawing them directly would replace pixels, not blend them).
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle((box[0] + 1, box[1] + 1, box[2] - 1, box[3] - 1), radius - 1, outline=(255, 255, 255, 46), width=S)

    # download glyph in a soft circle
    cx, cy, r = box[0] + 30 * S, box[1] + bh // 2, 15 * S
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 41))
    lw = round(2.2 * S)
    d.line([(cx, cy - 7 * S), (cx, cy + 4 * S)], fill="white", width=lw)
    d.line([(cx - 5 * S, cy - 1 * S), (cx, cy + 4 * S), (cx + 5 * S, cy - 1 * S)], fill="white", width=lw, joint="curve")
    d.line([(cx - 7 * S, cy + 8 * S), (cx + 7 * S, cy + 8 * S)], fill="white", width=lw)

    # text: "Download" + thin version on one baseline, subtitle below
    tx, base = box[0] + 56 * S, box[1] + 28 * S
    d.text((tx, base), "Download", font=f_title, fill="white", anchor="ls")
    d.text((tx + w_title + 8 * S, base), f"v{version}", font=f_ver, fill=(255, 255, 255, 209), anchor="ls")
    d.text((tx, box[1] + 44 * S), "For Chrome, Edge, and Brave", font=f_sub, fill=(255, 255, 255, 217), anchor="ls")
    return Image.alpha_composite(img, ov)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--bold"), ap.add_argument("--regular"), ap.add_argument("--light")
    a = ap.parse_args()
    if a.bold:
        fonts = (Path(a.bold), Path(a.regular or a.bold), Path(a.light or a.regular or a.bold))
    else:
        fonts = next((s for s in FONT_SETS if all(p.exists() for p in s)), None)
        if not fonts:
            raise SystemExit("No font set found. Pass --bold/--regular/--light.")
    draw_button(a.version, *fonts).save(a.out, optimize=True)
    print(f"{a.out}: v{a.version}, font {fonts[0].name}")


if __name__ == "__main__":
    main()
