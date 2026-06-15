#!/usr/bin/env python3
"""
Injeta imagens PNG no relatório PDSOB a partir de docs/relatorio-assets/FIGURAS.json.

Substitui células vazias após "Figura N -" por referência markdown à imagem.
Adiciona seção APÊNDICE L com diagramas renderizados após os blocos @enduml.

Uso:
  python3 scripts/inject-pdsob-figures.py
  python3 scripts/inject-pdsob-figures.py --embed-base64   # para Google Docs (arquivo maior)
"""
from __future__ import annotations

import argparse
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"
ASSETS = ROOT / "docs/relatorio-assets"
MANIFEST = ASSETS / "FIGURAS.json"


def image_ref(rel_path: Path, embed: bool) -> str:
    if embed and rel_path.is_file():
        data = base64.b64encode(rel_path.read_bytes()).decode("ascii")
        return f"![](data:image/png;base64,{data})"
    # Caminho relativo ao .md na raiz do repo
    return f"![](docs/relatorio-assets/{rel_path.as_posix()})"


def inject_figure_blocks(text: str, figuras: dict, embed: bool) -> tuple[str, int]:
    injected = 0

    def replacer(match: re.Match) -> str:
        nonlocal injected
        num = int(match.group(2))
        key = str(num)
        if key not in figuras:
            return match.group(0)
        meta = figuras[key]
        arquivo = meta.get("arquivo")
        if not arquivo:
            return match.group(0)
        png = ASSETS / arquivo
        if not png.is_file():
            fb = meta.get("fallback")
            if fb:
                png = (ASSETS / fb).resolve()
                if not png.is_file():
                    png = (ROOT / "docs" / fb.replace("../", "")).resolve()
            if not png.is_file():
                return match.group(0)
            rel = png.relative_to(ROOT)
            img = f"![]({rel.as_posix()})"
        else:
            img = image_ref(Path(arquivo), embed)

        injected += 1
        return f"{match.group(1)}| {img} |\n| :---: |"

    # Figura N \- título ... (célula imagem vazia, ![][imageN] ou alinhamento :---- / :---:)
    pattern = re.compile(
        r"(Figura (\d+) \\- [^\n]+\n\n)\|[^|\n]*\|\n\|[^|\n]*\|",
        re.MULTILINE,
    )
    return pattern.sub(replacer, text), injected


def inject_appendix_diagrams(text: str, apendice: dict, embed: bool) -> tuple[str, int]:
    marker = "APÊNDICE K \\- EVIDÊNCIAS NF"
    if marker not in text and "APÊNDICE K - EVIDÊNCIAS NF" not in text:
        marker = "Fonte: Produzido pelo autor.\n\n3.2.1 Diagrama de Sequência"

    lines = [
        "",
        "APÊNDICE L \\- DIAGRAMAS (IMAGENS)",
        "",
        "Representação gráfica dos diagramas de modelagem descritos nos apêndices A a G.",
        "",
    ]
    count = 0
    for key, meta in apendice.items():
        arquivo = meta.get("arquivo")
        if not arquivo:
            continue
        png = ASSETS / arquivo
        if not png.is_file():
            continue
        titulo = meta.get("titulo", key)
        titulo = titulo.replace("B-auth", "B — Autenticação").replace("B-iot", "B — Ingestão IoT")
        count += 1
        img = image_ref(Path(arquivo), embed)
        lines.extend([
            f"**Diagrama {titulo}**",
            "",
            f"| {img} |",
            "| :---: |",
            "",
            "Fonte: Produzido pelo autor.",
            "",
        ])

    if count == 0:
        return text, 0

    block = "\n".join(lines)
    if "APÊNDICE L \\- DIAGRAMAS RENDERIZADOS" in text:
        # substituir bloco existente
        text = re.sub(
            r"APÊNDICE L \\- DIAGRAMAS RENDERIZADOS.*?(?=\n3\.2\.1 Diagrama|\n\[image1\]:)",
            block + "\n",
            text,
            flags=re.DOTALL,
        )
        return text, count

    insert_before = "\n3.2.1 Diagrama de Sequência"
    if insert_before in text:
        text = text.replace(insert_before, "\n" + block + insert_before, 1)
    else:
        text += "\n" + block
    return text, count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--embed-base64", action="store_true", help="Embute PNG como base64 no .md")
    args = parser.parse_args()

    if not REPORT.is_file():
        raise SystemExit(f"Relatório não encontrado: {REPORT}")
    if not MANIFEST.is_file():
        raise SystemExit(f"Manifesto não encontrado: {MANIFEST}")

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    text = REPORT.read_text(encoding="utf-8")
    idx = text.find("\n[image1]:")
    body, images_tail = (text[:idx], text[idx:]) if idx != -1 else (text, "")

    body, n_fig = inject_figure_blocks(body, data.get("figuras", {}), args.embed_base64)
    body, n_app = inject_appendix_diagrams(body, data.get("apendice_diagramas", {}), args.embed_base64)

    REPORT.write_text(body + images_tail, encoding="utf-8")
    print(f"Injetadas {n_fig} figuras no corpo + {n_app} diagramas no Apêndice L")
    print(f"Arquivo: {REPORT}")
    if n_fig + n_app == 0:
        print("Nenhuma PNG encontrada. Execute: ./scripts/collect-pdsob-assets.sh")


if __name__ == "__main__":
    main()
