#!/usr/bin/env python3
"""
Aplica Golden Rules de padronização TCC ao relatório PDSOB.

Referência: docs/PADRONIZACAO-TCC-GOLDEN-RULES.md

Uso:
  python3 scripts/normalize-pdsob-format.py
  python3 scripts/normalize-pdsob-format.py --check   # só reporta, não grava
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"

# Marcadores internos de edição — não vão para versão final
INTERNAL_MARKERS = {
    "# DDE",
    "# ERS",
    "# DEM",
    "# DEI",
    "# MANUAL",
    "# DOC TECNICA",
}

# Figuras de quadrante vazio (título contém "dimensão" + célula vazia → :----)
QUADRANT_KEYWORDS = ("dimensão", "dimensao")


def split_tail(text: str) -> tuple[str, str]:
    idx = text.find("\n[image1]:")
    if idx == -1:
        return text, ""
    return text[:idx], text[idx:]


def collapse_blank_lines(text: str) -> str:
    """E-01: no máximo uma linha em branco consecutiva."""
    return re.sub(r"\n{3,}", "\n\n", text)


def remove_internal_markers(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if line.strip() in INTERNAL_MARKERS:
            continue
        lines.append(line)
    return "\n".join(lines)


def normalize_headings(text: str) -> str:
    """T-05: seções 3–6 em negrito (padrão referência AESA-CESA)."""
    # ### **3.1.1 Título** {#anchor} → **3.1.1 Título** {#anchor}
    text = re.sub(
        r"^### \*\*(.+?)\*\*\s*(\{#[^}]+\})?\s*$",
        r"**\1** \2",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(r"\*\* \s*$", "**", text, flags=re.MULTILINE)
    # Linha em branco após cabeçalho de subseção antes de tabela ou texto
    text = re.sub(
        r"(\*\*3\.\d+(?:\.\d+)? [^\n*]+\*\*(?: \{#[^}]+\})?)\n(\|)",
        r"\1\n\n\2",
        text,
    )
    # ## 3.1 TÍTULO {#anchor} → **3.1 TÍTULO** {#anchor}
    text = re.sub(
        r"^## (\d+\.\d+(?:\.\d+)? [^\n{#]+?)( \{#[^}]+\})?\s*$",
        r"**\1**\2",
        text,
        flags=re.MULTILINE,
    )
    # # **3 DOCUMENTO...** → **3 DOCUMENTO...**
    text = re.sub(
        r"^# \*\*(\d+ DOCUMENTO[^*]+)\*\*( \{#[^}]+\})?\s*$",
        r"**\1**\2",
        text,
        flags=re.MULTILINE,
    )
    return text


def normalize_figure_title(title: str, fig_num: int) -> str:
    title = title.strip()
    if fig_num >= 101:
        return "Manual do usuário"
    if not title.endswith("."):
        title += "."
    return title


def normalize_figure_blocks(text: str) -> tuple[str, int]:
    """Padroniza blocos Figura N \\- ... até Fonte."""
    changes = 0
    pattern = re.compile(
        r"(Figura (\d+) \\- ([^\n]+)\n+)\n*"
        r"(\|[^\n]+\|\n)"
        r"(\|[^\n]+\|\n)\n*"
        r"(Fonte: Produzido pelo autor\.)\s*",
        re.MULTILINE,
    )

    def repl(m: re.Match) -> str:
        nonlocal changes
        num = int(m.group(2))
        raw_title = m.group(3)
        img_row = m.group(4).strip()
        align_row = m.group(5).strip()

        title = normalize_figure_title(raw_title, num)
        is_empty = re.match(r"\|\s*\|", img_row) is not None
        is_quadrant = is_empty and any(k in title.lower() for k in QUADRANT_KEYWORDS)

        if is_quadrant:
            align_row = "| :---- |"
        elif "| :" not in align_row:
            align_row = "| :---: |"

        if title != raw_title.strip() or align_row != m.group(5).strip():
            changes += 1

        return (
            f"Figura {num} \\- {title}\n\n"
            f"{img_row}\n"
            f"{align_row}\n\n"
            f"Fonte: Produzido pelo autor.\n\n"
        )

    text = pattern.sub(repl, text)
    # Garante linha em branco entre Fonte e próxima Figura (E-02)
    text = re.sub(
        r"(Fonte: Produzido pelo autor\.)\n(Figura \d+)",
        r"\1\n\n\2",
        text,
    )
    return text, changes


def normalize_manual_subsections(text: str) -> str:
    """Garante **6.x.x Título** em negrito."""
    return re.sub(
        r"^(6\.\d+(?:\.\d+)? [A-Za-zÀ-ú].+)$",
        r"**\1**",
        text,
        flags=re.MULTILINE,
    )


def normalize_dei_section_header(text: str) -> str:
    """DEI: documento + 4.1 na mesma linha (referência)."""
    old = (
        "**4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)** "
        "{#4-documento-de-especificação-de-interfaces-(dei)}\n\n"
        "## 4.1 WIREFRAMES"
    )
    new = (
        "**4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)** "
        "4.1 WIREFRAMES {#4-documento-de-especificação-de-interfaces-(dei)}"
    )
    if old in text:
        text = text.replace(old, new)
    # pós-normalização de headings
    text = text.replace(
        "**4.1 WIREFRAMES** {#4.1-wireframes}",
        "**4.1 WIREFRAMES** {#4.1-wireframes}",
    )
    return text


def normalize_dem_section_header(text: str) -> str:
    """DEM: 3.1 na linha do título do documento (referência)."""
    patterns = [
        (
            "**3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)** "
            "{#3-documento-de-especificação-de-modelagem-(dem)}\n\n"
            "**3.1 MODELAGEM DE DADOS** {#3.1-modelagem-de-dados}",
            "**3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)** "
            "3.1 MODELAGEM DE DADOS {#3-documento-de-especificação-de-modelagem-(dem)}",
        ),
    ]
    for old, new in patterns:
        text = text.replace(old, new)
    return text


def audit(text: str) -> list[str]:
    issues = []
    if re.search(r"\n{3,}", text):
        issues.append("E-01: linhas em branco triplas ou mais")
    for m in re.finditer(r"Figura (\d+) \\- ([^\n]+)", text):
        num, title = int(m.group(1)), m.group(2).strip()
        if num < 101 and not title.endswith("."):
            issues.append(f"T-02: Figura {num} sem ponto final")
    for marker in INTERNAL_MARKERS:
        if f"\n{marker}\n" in text or text.startswith(f"{marker}\n"):
            issues.append(f"S-01: marcador interno {marker} presente")
    return issues


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Apenas audita, não grava")
    parser.add_argument(
        "--skip-headings",
        action="store_true",
        help="Não altera hierarquia de títulos (após align-pdsob-to-reference.py)",
    )
    args = parser.parse_args()

    if not REPORT.is_file():
        raise SystemExit(f"Relatório não encontrado: {REPORT}")

    raw = REPORT.read_text(encoding="utf-8")
    body, tail = split_tail(raw)

    body = remove_internal_markers(body)
    # Cabeçalhos hierárquicos: usar align-pdsob-to-reference.py (não achatar para **negrito**)
    if not args.skip_headings:
        body = normalize_dem_section_header(body)
        body = normalize_dei_section_header(body)
        body = normalize_headings(body)
        body = normalize_manual_subsections(body)
    body, fig_changes = normalize_figure_blocks(body)
    body = collapse_blank_lines(body)

    result = body + tail
    issues = audit(result)

    print(f"Figuras normalizadas: {fig_changes}")
    if issues:
        print("Pendências:")
        for i in issues:
            print(f"  - {i}")
    else:
        print("Auditoria: OK (malha fina)")

    if args.check:
        return

    REPORT.write_text(result, encoding="utf-8")
    print(f"Gravado: {REPORT}")


if __name__ == "__main__":
    main()
