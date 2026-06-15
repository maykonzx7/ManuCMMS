#!/usr/bin/env python3
"""Renderiza DER PlantUML em alta resolução e gera recortes para figuras 1–5."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Instale Pillow: pip install Pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
PUML = ROOT / "docs/relatorio-assets/plantuml/dem-der-logico.puml"
OUT_DIR = ROOT / "docs/relatorio-assets/diagramas"
DPI = int(__import__("os").environ.get("PLANTUML_DPI", "300"))


def render_plantuml() -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = ROOT / "docs/relatorio-assets/plantuml"
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{src}:/in:ro",
        "-v", f"{OUT_DIR}:/out",
        "plantuml/plantuml:latest",
        "-tpng", f"-Sdpi={DPI}", "-o", "/out", "/in/dem-der-logico.puml",
    ]
    subprocess.run(cmd, check=True)
    for name in ("dem_der_logico.png", "dem-der-logico.png"):
        png = OUT_DIR / name
        if png.is_file():
            return png
    raise FileNotFoundError(f"Saída DER não encontrada em {OUT_DIR}")


def crop_quadrants(src: Path) -> dict[int, Path]:
    img = Image.open(src)
    w, h = img.size
    hw, hh = w // 2, h // 2
    boxes = {
        1: (0, 0, w, h),
        2: (0, 0, hw, hh),
        3: (hw, 0, w, hh),
        4: (0, hh, hw, h),
        5: (hw, hh, w, h),
    }
    out: dict[int, Path] = {}
    for num, box in boxes.items():
        dest = OUT_DIR / f"dem_der_figura_{num}.png"
        img.crop(box).save(dest, format="PNG", optimize=False, compress_level=1)
        out[num] = dest
        print(f"OK figura {num} → {dest} ({dest.stat().st_size // 1024} KB)")
    return out


def main() -> None:
    print(f"Renderizando DER (dpi={DPI}) …")
    src = render_plantuml()
    print(f"Panorama: {src} ({src.stat().st_size // 1024} KB)")
    crop_quadrants(src)


if __name__ == "__main__":
    main()
