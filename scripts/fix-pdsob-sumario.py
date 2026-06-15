#!/usr/bin/env python3
"""
Corrige sumário e numeração de páginas do relatório PDSOB (formato referência AESA-CESA).

- Seções principais: **[Título…](#link)\tPágina** (reticências como no Google Docs)
- Subseções com negrito interno quando a referência usa: [**1.6.1. Título**](#link)…\tPágina
- Links com parênteses escapados \\(dde\\)
- Quebra de página HTML antes do corpo (# DDE)

Uso: python3 scripts/fix-pdsob-sumario.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"

LINES_PER_PAGE = 52
CONTENT_START_LINE = 150
CONTENT_START_PAGE = 5
# Largura visual alvo do sumário (título + reticências + tab + página), como export Google Docs
SUMARIO_WIDTH = 72
LEADER = "…"
PAGE_BREAK = '<div style="page-break-before: always"></div>'


def page_for_line(line_no: int) -> int:
    if line_no < CONTENT_START_LINE:
        return max(1, (line_no + LINES_PER_PAGE - 1) // LINES_PER_PAGE)
    delta = line_no - CONTENT_START_LINE
    return CONTENT_START_PAGE + delta // LINES_PER_PAGE


def find_line(lines: list[str], patterns: list[str]) -> int:
    for pat in patterns:
        rx = re.compile(pat)
        for i, line in enumerate(lines, 1):
            if rx.search(line):
                return i
    return CONTENT_START_LINE


def esc_href(href: str) -> str:
    """Compatível com sumário Google Docs da referência."""
    return href.replace("(", r"\(").replace(")", r"\)")


def with_leaders(visible_title: str, page: int) -> str:
    """Preenche com … até a coluna da página (como tab leader do Google Docs)."""
    pad = max(1, SUMARIO_WIDTH - len(visible_title) - len(str(page)))
    return f"{visible_title}{LEADER * pad}\t{page}"


def format_entry(title: str, href: str, page: int, bold_outer: bool, bold_inner: bool) -> str:
    link = esc_href(href)
    visible = f"**{title}**" if bold_inner else title
    dots = LEADER * max(1, SUMARIO_WIDTH - len(title) - len(str(page)))
    line = f"[{visible}]({link}){dots}\t{page}"
    return f"**{line}**" if bold_outer else line


def build_sumario(lines: list[str]) -> str:
    # (título, padrões busca, href, negrito externo, negrito interno no link)
    anchors = [
        ("1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)", ["^# DDE", "^# \\*\\*1 DOCUMENTO"], "#1-documento-de-definição-de-escopo-(dde)", True, False),
        ("1.1. INTRODUÇÃO", ["^## 1\\.1 INTRODUÇÃO"], "#1.1-introdução", False, False),
        ("1.2. VISÃO GERAL DO DOCUMENTO", ["^## 1\\.2 VISÃO GERAL"], "#1.2-visão-geral-do-documento", False, False),
        ("1.3. IDENTIFICAÇÃO DO PROJETO", ["^## 1\\.3 IDENTIFICAÇÃO"], "#1.3-identificação-do-projeto", False, False),
        ("1.4. OBJETIVOS DO PROJETO", ["^1\\.4 OBJETIVOS"], "#1.4-objetivos-do-projeto", False, False),
        ("1.5. JUSTIFICATIVA", ["^## 1\\.5 JUSTIFICATIVA"], "#1.5-justificativa", False, False),
        ("1.6. IDENTIFICAÇÃO DOS REQUISITOS", ["^## 1\\.6 IDENTIFICAÇÃO"], "#1.6-identificação-dos-requisitos", False, False),
        ("1.6.1. Prioridades dos Requisitos", ["^### \\*\\*1\\.6\\.1"], "#1.6.1-prioridades-dos-requisitos", False, True),
        ("1.7. ESCOPO DO PRODUTO E ENTREGÁVEIS", ["^## 1\\.7 ESCOPO"], "#1.7-escopo-do-produto-e-entregáveis", False, False),
        ("1.7.1. Funcionalidades Previstas", ["^###.*1\\.7\\.1"], "#1.7.1-funcionalidades-previstas", False, True),
        ("1.7.2. Entregáveis", ["^\\*\\*1\\.7\\.2 Entregáveis"], "#1.7.2-entregáveis", False, True),
        ("1.8. PREMISSAS E RESTRIÇÕES", ["^## 1\\.8 PREMISSAS"], "#1.8-premissas-e-restrições", False, False),
        ("1.8.1. Premissas", ["^### \\*\\*1\\.8\\.1"], "#1.8.1-premissas", False, True),
        ("1.8.2. Restrições", ["^### \\*\\*1\\.8\\.2"], "#1.8.2-restrições", False, True),
        ("1.9. CRITÉRIOS DE ACEITAÇÃO DO PROJETO", ["^## 1\\.9 CRITÉRIOS"], "#1.9-critérios-de-aceitação-do-projeto", False, False),
        ("1.10. EXCLUSÕES DO ESCOPO", ["^## 1\\.10 EXCLUSÕES"], "#1.10-exclusões-do-escopo", False, False),
        ("1.11. STAKEHOLDERS ENVOLVIDOS", ["^1\\.11 STAKEHOLDERS"], "#1.11-stakeholders-envolvidos", False, False),
        ("1.12. RISCOS INICIAIS", ["^## 1\\.12 RISCOS"], "#1.12-riscos-iniciais", False, False),
        ("2 DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS (ERS)", ["^# ERS", "^\\*\\*2 DOCUMENTO"], "#2-documento-de-especificação-de-requisitos-(ers)", True, False),
        ("2.1. REQUISITOS FUNCIONAIS", ["^## 2\\.1 REQUISITOS"], "#2.1-requisitos-funcionais", False, False),
        ("2.2. REQUISITOS NÃO FUNCIONAIS", ["^## 2\\.2 REQUISITOS"], "#2.2-requisitos-não-funcionais", False, False),
        ("2.3. REGRAS DE NEGÓCIO", ["^## 2\\.3 REGRAS"], "#2.3-regras-de-negócio", False, False),
        ("3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)", ["^# DEM", "3\\.1 MODELAGEM DE DADOS"], "#3-documento-de-especificação-de-modelagem-(dem)", True, False),
        ("3.1 MODELAGEM DE DADOS", ["3\\.1 MODELAGEM DE DADOS"], "#3.1-modelagem-de-dados", False, False),
        ("3.1.1 Entidade-Relacionamento", ["^### \\*\\*3\\.1\\.1 Entidade"], "#3.1.1-entidade-relacionamento", False, True),
        ("3.1.2 Dicionário de Dados", ["^### \\*\\*3\\.1\\.2 Dicionário"], "#3.1.2-dicionário-de-dados", False, True),
        ("3.2 MODELAGEM COMPORTAMENTAL", ["^## 3\\.2 MODELAGEM"], "#3.2-modelagem-comportamental", False, False),
        ("3.2.1 Diagrama de Sequência", ["^### \\*\\*3\\.2\\.1 Diagrama de Sequência"], "#3.2.1-diagrama-de-sequência-(criação-automática-de-os-via-iot)", False, True),
        ("3.2.2 Diagrama de Estados", ["^### \\*\\*3\\.2\\.2 Diagrama de Estados"], "#3.2.2-diagrama-de-estados-(ciclo-de-vida-da-os)", False, True),
        ("3.3. MODELAGEM ESTRUTURAL", ["^## 3\\.3 MODELAGEM"], "#3.3-modelagem-estrutural", False, False),
        ("3.3.1 Diagrama de Caso de Uso", ["^### \\*\\*3\\.3\\.1 Diagrama de Caso"], "#3.3.1-diagrama-de-caso-de-uso", False, True),
        ("3.3.2 Diagrama de Componentes", ["^### \\*\\*3\\.3\\.2 Diagrama de Componentes"], "#3.3.2-diagrama-de-componentes-(arquitetura-hexagonal)", False, True),
        ("3.3.3 Diagrama de Arquitetura", ["^### \\*\\*3\\.3\\.3 Diagrama de Arquitetura"], "#3.3.3-diagrama-de-arquitetura-(infraestrutura)", False, True),
        ("3.4 MAPEAMENTO OBJETO-RELACIONAL (ORM)", ["^## 3\\.4 MAPEAMENTO"], "#3.4-mapeamento-objeto-relacional-(orm)", False, False),
        ("3.5 BPMN (BUSINESS PROCESS MODEL AND NOTATION)", ["^## 3\\.5 BPMN"], "#3.5-bpmn-(business-process-model-and-notation)", False, False),
        ("4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)", ["^# DEI", "4\\.1 WIREFRAMES"], "#4-documento-de-especificação-de-interfaces-(dei)", True, False),
        ("4.1. WIREFRAMES", ["4\\.1 WIREFRAMES"], "#4.1-wireframes", False, False),
        ("4.2. MOCKUPS", ["^\\*\\*4\\.2 MOCKUPS"], "#4.2-mockups", False, False),
        ("4.3. FLUXO DE NAVEGAÇÃO", ["^\\*\\*4\\.3 FLUXO"], "#4.3-fluxo-de-navegação", False, False),
        ("5 DOCUMENTAÇÃO TÉCNICA", ["^# \\*\\*5 DOCUMENTAÇÃO"], "#5-documentação-técnica", True, False),
        ("5.1. ARQUITETURA DO SISTEMA", ["^\\*\\*5\\.1 ARQUITETURA"], "#5.1-arquitetura-do-sistema", False, False),
        ("5.2. TECNOLOGIAS UTILIZADAS", ["^\\*\\*5\\.2 TECNOLOGIAS"], "#5.2-tecnologias-utilizadas", False, False),
        ("5.3. REPOSITÓRIO E CÓDIGO-FONTE", ["^\\*\\*5\\.3 REPOSITÓRIO"], "#5.3-repositório-e-código-fonte", False, False),
        ("6. MANUAL DO USUÁRIO", ["^\\*\\*6 MANUAL DO USUÁRIO"], "#6-manual-do-usuário", True, False),
        ("7. REFERÊNCIAS", ["^# Referencias"], "#7-referências", True, False),
        ("8. APÊNDICE", ["^# Apendice"], "#8-apêndice", True, False),
    ]

    rows = ["**SUMÁRIO**", ""]
    for title, pats, href, bold_outer, bold_inner in anchors:
        ln = find_line(lines, pats)
        pg = page_for_line(ln)
        rows.append(format_entry(title, href, pg, bold_outer, bold_inner))
        rows.append("")
    rows.extend(["", PAGE_BREAK, ""])
    return "\n".join(rows)


def main() -> None:
    text = REPORT.read_text(encoding="utf-8")
    lines = text.splitlines()

    start = next(i for i, l in enumerate(lines) if l.strip() == "**SUMÁRIO**")
    end = next(
        i
        for i, l in enumerate(lines)
        if i > start and (l.startswith("# DDE") or l.startswith("**1 DOCUMENTO") or l.startswith("# **1 DOCUMENTO"))
    )

    new_sumario = build_sumario(lines)
    new_lines = lines[:start] + new_sumario.splitlines() + lines[end:]
    REPORT.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    print(f"Sumário regenerado (formato referência) → {REPORT}")


if __name__ == "__main__":
    main()
