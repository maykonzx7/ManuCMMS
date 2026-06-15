#!/usr/bin/env python3
"""
Gera HTML para importação no Google Docs — Times New Roman 12 pt, capa centralizada.
Sem dependências externas.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"
OUT = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).html"

CSS = """
body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; margin: 2.5cm 2cm 2cm 3cm; }
.capa, .contracapa { text-align: center; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #000; padding: 4px 6px; }
img { max-width: 100%; }
.page-break { page-break-before: always; }
h1,h2,h3 { font-family: 'Times New Roman', Times, serif; }
"""


def md_line_to_html(line: str) -> str:
    s = line.strip()
    if not s:
        return ""
    if s.startswith("|") and s.endswith("|"):
        return s  # tabela: processada em bloco
    if s.startswith("!["):
        m = re.match(r"!\[\]\(([^)]+)\)", s)
        if m:
            return f'<p style="text-align:center"><img src="{html.escape(m.group(1))}" alt=""/></p>'
    if s.startswith("# **") and s.endswith("**"):
        return f"<h1>{html.escape(s[4:-2])}</h1>"
    if s.startswith("# "):
        return f"<h1>{html.escape(s[2:])}</h1>"
    if s.startswith("## "):
        return f"<h2>{html.escape(s[3:])}</h2>"
    if s.startswith("### "):
        inner = s[4:]
        return f"<h3>{inner}</h3>"
    esc = html.escape(s)
    esc = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc)
    esc = re.sub(r"\*(.+?)\*", r"<em>\1</em>", esc)
    esc = re.sub(
        r"!\[\]\(([^)]+)\)",
        r'<img src="\1" style="max-width:100%"/>',
        esc,
    )
    return f"<p>{esc}</p>"


def table_block(lines: list[str]) -> str:
    rows: list[str] = []
    header_done = False
    for ln in lines:
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if all(set(c) <= set(": -") for c in cells):
            continue
        tag = "th" if not header_done else "td"
        header_done = True
        rows.append("<tr>" + "".join(f"<{tag}>{html.escape(c)}</{tag}>" for c in cells) + "</tr>")
    return "<table>" + "".join(rows) + "</table>"


def convert_body(body: str) -> str:
    out: list[str] = []
    lines = body.splitlines()
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.strip().startswith("|"):
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            out.append(table_block(block))
            continue
        h = md_line_to_html(ln)
        if h:
            out.append(h)
        i += 1
    return "\n".join(out)


def front_to_html(front: str) -> str:
    lines = front.splitlines()
    parts: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("# Capa"):
            i += 1
            continue
        if line.strip() == "**SUMÁRIO**":
            parts.append("<h2 style='text-align:center'><strong>SUMÁRIO</strong></h2>")
            i += 1
            while i < len(lines) and lines[i].strip():
                raw = lines[i]
                parts.append(f"<p style='margin:2px 0'>{html.escape(raw)}</p>")
                i += 1
            continue
        if "**AUTARQUIA" in line:
            block = []
            while i < len(lines) and not lines[i].startswith("---"):
                block.append(html.escape(lines[i]))
                i += 1
            parts.append("<div class='capa'>" + "<br/>".join(block) + "</div><hr/>")
            if i < len(lines):
                i += 1
            continue
        if line.strip() == "*Relatório Técnico*":
            parts.append("<p class='contracapa'><em>Relatório Técnico</em></p>")
            i += 1
            continue
        if line.strip() == "MAYKON VANDERSON SIQUEIRA SANTOS":
            block = []
            while i < len(lines) and "**HISTÓRICO" not in lines[i]:
                block.append(html.escape(lines[i]))
                i += 1
            parts.append("<div class='contracapa'>" + "<br/>".join(block) + "</div>")
            continue
        if "**HISTÓRICO" in line:
            parts.append("<p><strong>HISTÓRICO DE REVISÃO</strong></p>")
            i += 1
            if i < len(lines) and lines[i].strip().startswith("|"):
                block = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    block.append(lines[i])
                    i += 1
                parts.append(table_block(block))
            continue
        i += 1
    return "\n".join(parts)


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    idx = text.find("\n# DDE\n")
    if idx == -1:
        raise SystemExit("# DDE não encontrado")
    front, body = text[:idx], text[idx + 1 :]
    t = body.find("\n[image1]:")
    if t != -1:
        body = body[:t]

    doc = f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>ManuCMMS PDSOB 2026</title><style>{CSS}</style></head><body>
{front_to_html(front)}
<div class="page-break"></div>
{convert_body(body)}
</body></html>"""
    OUT.write_text(doc, encoding="utf-8")
    print(f"HTML → {OUT}")


if __name__ == "__main__":
    main()
