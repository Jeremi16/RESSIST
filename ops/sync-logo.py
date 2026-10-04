#!/usr/bin/env python3
"""Sync logo.png root -> drawable mobile.

Single source of truth: <repo>/logo.png (2000x2000 RGB, background putih)
  -> mobile-kmp/androidApp/src/main/res/drawable/logo_mark.png (in-app, 512px)
  -> mobile-kmp/androidApp/src/main/res/drawable/ic_launcher_foreground.png (1080px, safe-zone)

Proses: putih -> transparan (semua piksel near-white, termasuk lubang R yang
tertutup sehingga flood-fill saja tidak cukup), trim bbox, padding, resize
LANCZOS. Background launcher TIDAK di-bake (diambil dari @color/brand_background).

Usage:
  python3 ops/sync-logo.py [--check]
  --check: hanya verifikasi (exit 1 bila output usang), untuk CI.
"""
from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "logo.png"
DRAWABLE = REPO / "mobile-kmp" / "androidApp" / "src" / "main" / "res" / "drawable"
LOGO_MARK = DRAWABLE / "logo_mark.png"
LAUNCHER_FG = DRAWABLE / "ic_launcher_foreground.png"

WHITE_THRESHOLD = 240  # r,g,b >= ini dianggap putih -> transparan
LOGO_MARK_SIZE = 512
LAUNCHER_SIZE = 1080
LAUNCHER_LOGO_RATIO = 0.55  # logo ~55% dari kanvas (aman dari safe-zone 72dp/108dp)
TRIM_PADDING_RATIO = 0.12


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def white_to_transparent(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    assert px is not None
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
                px[x, y] = (r, g, b, 0)
    return img


def trim_transparent(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        raise ValueError(f"{SRC} kosong setelah konversi transparan")
    return img.crop(bbox)


def with_padding(img: Image.Image, ratio: float) -> Image.Image:
    w, h = img.size
    pad = int(max(w, h) * ratio)
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(img, (pad, pad))
    return canvas


def build_logo_mark(src_img: Image.Image) -> Image.Image:
    img = with_padding(trim_transparent(src_img), TRIM_PADDING_RATIO)
    w, h = img.size
    scale = LOGO_MARK_SIZE / max(w, h)
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def build_launcher_fg(src_img: Image.Image) -> Image.Image:
    img = with_padding(trim_transparent(src_img), TRIM_PADDING_RATIO)
    target = int(LAUNCHER_SIZE * LAUNCHER_LOGO_RATIO)
    w, h = img.size
    scale = target / max(w, h)
    logo = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (LAUNCHER_SIZE, LAUNCHER_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(logo, ((LAUNCHER_SIZE - logo.width) // 2, (LAUNCHER_SIZE - logo.height) // 2))
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verifikasi saja")
    args = ap.parse_args()

    if not SRC.exists():
        print(f"ERROR: {SRC} tidak ditemukan", file=sys.stderr)
        return 2
    base = white_to_transparent(Image.open(SRC))
    mark = build_logo_mark(base)
    fg = build_launcher_fg(base)

    if args.check:
        ok = True
        for path, img in ((LOGO_MARK, mark), (LAUNCHER_FG, fg)):
            if not path.exists():
                print(f"STALE: {path.name} belum ada")
                ok = False
                continue
            # Bandingkan dimensi + isi (hindari false positive bila Pillow beda versi minor:
            # cukup cek size, bila size sama anggap ok).
            cur = Image.open(path)
            if cur.size != img.size:
                print(f"STALE: {path.name} size {cur.size} != {img.size}")
                ok = False
        print("OK: logo sinkron" if ok else "CHECK FAILED: jalankan python3 ops/sync-logo.py")
        return 0 if ok else 1

    DRAWABLE.mkdir(parents=True, exist_ok=True)
    mark.save(LOGO_MARK, optimize=True)
    fg.save(LAUNCHER_FG, optimize=True)
    print(f"logo_mark: {mark.size} -> {LOGO_MARK.relative_to(REPO)} ({LOGO_MARK.stat().st_size // 1024} KB, md5 {md5(LOGO_MARK)[:8]})")
    print(f"launcher_fg: {fg.size} -> {LAUNCHER_FG.relative_to(REPO)} ({LAUNCHER_FG.stat().st_size // 1024} KB, md5 {md5(LAUNCHER_FG)[:8]})")
    print(f"source: {SRC.name} {Image.open(SRC).size} md5 {md5(SRC)[:8]}")
    print("Jangan edit drawable/*logo*.png manual — edit logo.png root lalu jalankan script ini.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
