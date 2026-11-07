"""Build docs/images from the PNGs that tools/images.html saved to tools/out.

    python tools/make-images.py

- hero-000.png ... -> docs/images/hero.gif (15 fps, loops forever with a crossfade)
- every other PNG  -> docs/images/<same name>.png
"""
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "out"
DEST = ROOT / "docs" / "images"
FPS = 15
HOLD_END = 10  # frames (about 0.7 s) on the last frame
FADE = 8  # crossfade frames back to the start


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    frames = sorted(OUT.glob("hero-*.png"))
    if not frames:
        raise SystemExit("No frames in tools/out. Open tools/images.html and click Save first.")

    images = [Image.open(p).convert("RGB") for p in frames]
    # Seamless loop: hold the end briefly, then crossfade back to the first frame.
    end, first = images[-1], images[0]
    images += [end] * HOLD_END + [Image.blend(end, first, (i + 1) / (FADE + 1)) for i in range(FADE)]
    # One shared palette for all frames keeps colors steady between frames.
    palette = images[len(images) // 2].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    gif = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in images]
    hold = [round(1000 / FPS)] * len(gif)
    gif[0].save(DEST / "hero.gif", save_all=True, append_images=gif[1:], duration=hold, loop=0, optimize=True)
    print(f"hero.gif: {len(gif)} frames, {(DEST / 'hero.gif').stat().st_size // 1024} KB")

    for p in sorted(OUT.glob("*.png")):
        if p.name.startswith("hero-"):
            continue
        shutil.copyfile(p, DEST / p.name)
        print(f"{p.name}: {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
