#!/usr/bin/env python3
"""Renderiza .puml → PNG via plantuml.com (codificação deflate local, sem Java/Kroki)."""
from __future__ import annotations

import sys
import zlib
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/relatorio-assets/plantuml"
OUT = ROOT / "docs/relatorio-assets/diagramas"

# Alfabeto PlantUML (RFC não-padrão)
_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
_SERVERS = (
    "https://www.plantuml.com/plantuml/png/",
    "https://www.plantuml.com/plantuml/svg/",
)


def _encode6bit(b: int) -> str:
    if b < 10:
        return chr(48 + b)
    b -= 10
    if b < 26:
        return chr(65 + b)
    b -= 26
    if b < 26:
        return chr(97 + b)
    b -= 26
    if b == 0:
        return "-"
    if b == 1:
        return "_"
    return "?"


def _append3bytes(b1: int, b2: int, b3: int) -> str:
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F
    return "".join(_encode6bit(c) for c in (c1, c2, c3, c4))


def plantuml_encode(text: str) -> str:
    data = zlib.compress(text.encode("utf-8"))[2:-4]
    out = []
    i = 0
    while i < len(data):
        if i + 2 == len(data):
            out.append(_append3bytes(data[i], data[i + 1], 0))
        elif i + 1 == len(data):
            out.append(_append3bytes(data[i], 0, 0))
        else:
            out.append(_append3bytes(data[i], data[i + 1], data[i + 2]))
        i += 3
    return "".join(out)


def fetch_png(encoded: str) -> bytes:
    last_err: Exception | None = None
    for base in _SERVERS:
        url = base + encoded
        try:
            with urlopen(url, timeout=60) as resp:
                body = resp.read()
            if len(body) < 100:
                raise ValueError(f"resposta vazia ou inválida ({len(body)} bytes)")
            if body[:4] == b"<svg" or body[:5] == b"<?xml":
                # SVG — aceitável se PNG falhar; converter nome depois
                return body
            if body[:8] != b"\x89PNG\r\n\x1a\n" and body[:4] != b"<svg":
                # plantuml.com às vezes retorna HTML de erro
                snippet = body[:200].decode("utf-8", errors="replace")
                raise ValueError(f"não é PNG/SVG: {snippet[:80]}")
            return body
        except (HTTPError, URLError, ValueError, TimeoutError) as e:
            last_err = e
    raise SystemExit(f"Falha ao renderizar: {last_err}")


def render_file(puml: Path, dest: Path) -> bool:
    text = puml.read_text(encoding="utf-8")
    encoded = plantuml_encode(text)
    body = fetch_png(encoded)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if body[:4] == b"<svg" or body[:5] == b"<?xml":
        dest = dest.with_suffix(".svg")
    dest.write_bytes(body)
    print(f"  OK → {dest} ({len(body)} bytes)")
    return True


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ok = fail = 0
    for puml in sorted(SRC.glob("*.puml")):
        dest = OUT / f"{puml.stem}.png"
        print(f"Renderizando {puml.stem} ...")
        try:
            render_file(puml, dest)
            ok += 1
        except SystemExit as e:
            print(f"  FALHA {puml.stem}: {e}", file=sys.stderr)
            fail += 1
        except Exception as e:
            print(f"  FALHA {puml.stem}: {e}", file=sys.stderr)
            fail += 1
    print(f"\nPlantUML local: {ok} OK, {fail} falhas → {OUT}")
    if fail and not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
