#!/usr/bin/env python3
"""
Deixa o relatório (1).md com front matter e sumário IDÊNTICOS ao arquivo de referência
Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA.md (export Google Docs AESA-CESA).

- Capa/contracapa/histórico: cópia literal da referência
- Sumário: mesmos links, negritos, tabs, reticências e numeração partida (ex.: )0
- Corpo: preservado a partir de # DDE (sem HTML/comentários extras)
- Abertura DDE: linha vazia ##  como na referência

Uso: python3 scripts/match-reference-identical.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA.md"
REPORT = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"

LINES_PER_PAGE = 52
CONTENT_START_PAGE = 5


def load_reference_front_through_sumario() -> tuple[str, list[str]]:
    text = REFERENCE.read_text(encoding="utf-8")
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip() == "**SUMÁRIO**")
    end = next(i for i, l in enumerate(lines) if i > start and l.strip() == "# DDE")
    capa = "\n".join(lines[:start]) + "\n"
    sumario_lines = lines[start + 1 : end]  # após **SUMÁRIO**, antes de # DDE
    return capa, sumario_lines


# Cada entrada: (linha modelo da referência, padrões para achar seção no corpo)
SUMARIO_ENTRIES: list[tuple[str, list[str]]] = [
    ("**[1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)](#1-documento-de-definição-de-escopo-\\(dde\\))\t5**", ["^# DDE", "^# \\*\\*1 DOCUMENTO"]),
    ("[1.1. INTRODUÇÃO](#1.1-introdução)\t5", ["^## 1\\.1 INTRODUÇÃO"]),
    ("[1.2. VISÃO GERAL DO DOCUMENTO](#1.2-visão-geral-do-documento)\t5", ["^## 1\\.2 VISÃO GERAL"]),
    ("[1.3. IDENTIFICAÇÃO DO PROJETO](#1.3-identificação-do-projeto)\t5", ["^## 1\\.3 IDENTIFICAÇÃO"]),
    ("[1.4. OBJETIVOS DO PROJETO](#heading=h.t50d67n85d73)\t5", ["^1\\.4 OBJETIVOS"]),
    ("[1.5. JUSTIFICATIVA](#1.5-justificativa)\t6", ["^## 1\\.5 JUSTIFICATIVA"]),
    ("[1.6. IDENTIFICAÇÃO DOS REQUISITOS](#1.6-identificação-dos-requisitos)\t6", ["^## 1\\.6 IDENTIFICAÇÃO"]),
    ("[**1.6.1. Prioridades dos Requisitos**](#1.6.1-prioridades-dos-requisitos)\t6", ["^### \\*\\*1\\.6\\.1"]),
    ("[1.7. ESCOPO DO PRODUTO E ENTREGÁVEIS](#heading=h.y0fumei2z2b5)\t7", ["^## 1\\.7 ESCOPO"]),
    ("[**1.7.1. Funcionalidades Previstas**](#1.7.1-funcionalidades-previstas)\t7", ["^###.*1\\.7\\.1"]),
    ("[**1.7.2. Entregáveis**](#heading=h.4ah7jtit6yq5)\t7", ["^\\*\\*1\\.7\\.2 Entregáveis"]),
    ("[1.8. PREMISSAS E RESTRIÇÕES](#heading=h.76hfccpbi3of)\t7", ["^## 1\\.8 PREMISSAS"]),
    ("[**1.8.1. Premissas**](#1.8.1-premissas)\t7", ["^### \\*\\*1\\.8\\.1"]),
    ("[**1.8.2. Restrições**](#1.8.2-restrições)\t7", ["^### \\*\\*1\\.8\\.2"]),
    ("[1.9. CRITÉRIOS DE ACEITAÇÃO DO PROJETO](#1.9-critérios-de-aceitação-do-projeto)\t8", ["^## 1\\.9 CRITÉRIOS"]),
    ("[1.10. EXCLUSÕES DO ESCOPO](#heading=h.j2dqyap98ltz)\t8", ["^## 1\\.10 EXCLUSÕES"]),
    ("[1.11. STAKEHOLDERS ENVOLVIDOS](#heading=h.jnidifd7u5ev)\t8", ["^1\\.11 STAKEHOLDERS"]),
    ("[1.12. RISCOS INICIAIS](#1.12-riscos-iniciais)\t8", ["^## 1\\.12 RISCOS"]),
    ("[**2 DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS (ERS)\t1**](#heading=h.pppvxduj40qe)**0**", ["^# ERS", "^\\*\\*2 DOCUMENTO"]),
    ("[2.1. REQUISITOS FUNCIONAIS\t1](#2.1-requisitos-funcionais)0", ["^## 2\\.1 REQUISITOS"]),
    ("[2.2. REQUISITOS NÃO FUNCIONAIS\t1](#heading=h.blmxs9ffyjze)0", ["^## 2\\.2 REQUISITOS"]),
    ("[2.3. REGRAS DE NEGÓCIO\t1](#2.3-regras-de-negócio)0", ["^## 2\\.3 REGRAS"]),
    ("[**3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)\t1**](#3-documento-de-especificação-de-modelagem-\\(dem\\))**2**", ["^# DEM", "3\\.1 MODELAGEM DE DADOS"]),
    ("[3.1 MODELAGEM DE DADOS\t1](#3.1-modelagem-de-dados)2", ["3\\.1 MODELAGEM DE DADOS"]),
    ("[**3.1.1 Entidade-Relacionamento\t1**](#3.1.1-entidade-relacionamento)2", ["^### \\*\\*3\\.1\\.1 Entidade"]),
    ("[**3.1.2 Dicionário de Dados\t1**](#3.1.2-dicionário-de-dados)2", ["^### \\*\\*3\\.1\\.2 Dicionário"]),
    ("[3.2 MODELAGEM COMPORTAMENTAL\t1](#3.2-modelagem-comportamental)2", ["^## 3\\.2 MODELAGEM"]),
    ("[**3.2.1 Diagrama de Sequência\t1**](#3.2.1-diagrama-de-sequência-\\(criação-automática-de-os-via-iot\\))2", ["^### \\*\\*3\\.2\\.1 Diagrama de Sequência"]),
    ("[**3.2.2 Diagrama de Estados\t1**](#3.2.2-diagrama-de-estados-\\(ciclo-de-vida-da-os\\))2", ["^### \\*\\*3\\.2\\.2 Diagrama de Estados"]),
    ("[3.3. MODELAGEM ESTRUTURAL\t1](#3.3-modelagem-estrutural)2", ["^## 3\\.3 MODELAGEM"]),
    ("[**3.3.1 Diagrama de Caso de Uso\t1**](#3.3.1-diagrama-de-caso-de-uso)2", ["^### \\*\\*3\\.3\\.1 Diagrama de Caso"]),
    ("**3.3.2 Diagrama de Classes………………………………………\t12**", ["^### \\*\\*3\\.3\\.2 Diagrama de Componentes"]),
    ("[**3.3.3 Diagrama de Componentes\t1**](#3.3.2-diagrama-de-componentes-\\(arquitetura-hexagonal\\))2", ["^### \\*\\*3\\.3\\.2 Diagrama de Componentes"]),
    ("[**3.3.4 Diagrama de Arquitetura\t1**](#3.3.3-diagrama-de-arquitetura-\\(infraestrutura\\))2", ["^### \\*\\*3\\.3\\.3 Diagrama de Arquitetura"]),
    ("[3.4 MAPEAMENTO OBJETO-RELACIONAL (ORM)\t1](#3.4-mapeamento-objeto-relacional-\\(orm\\))2", ["^## 3\\.4 MAPEAMENTO"]),
    ("[3.5 BPMN (BUSINESS PROCESS MODEL AND NOTATION)\t1](#3.5-bpmn-\\(business-process-model-and-notation\\))2", ["^## 3\\.5 BPMN"]),
    ("[**4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)\t1**](#heading=h.ioa5psat65it)**3**", ["^# DEI", "4\\.1 WIREFRAMES"]),
    ("[4.1. WIREFRAMES\t1](#heading=h.5161hytnsieg)3", ["4\\.1 WIREFRAMES"]),
    ("[4.2. MOCKUPS\t1](#heading=h.ca6d37b8ez7c)3", ["^\\*\\*4\\.2 MOCKUPS"]),
    ("[4.3. FLUXO DE NAVEGAÇÃO\t1](#heading=h.5a3hpv1yu0yu)3", ["^\\*\\*4\\.3 FLUXO"]),
    ("[**5 DOCUMENTAÇÃO TÉCNICA\t1**](#heading=h.xb9rdkaq039h)**4**", ["^# \\*\\*5 DOCUMENTAÇÃO"]),
    ("[5.1. ARQUITETURA DO SISTEMA\t1](#heading=h.iy97zpcu1mn3)4", ["^\\*\\*5\\.1 ARQUITETURA"]),
    ("[**5.1.1. Segmentação da Arquitetura\t15**](#heading=h.h60d0q6g2fr2)", ["^\\*\\*5\\.1\\.1 Segmentação"]),
    ("[5.2. TECNOLOGIAS UTILIZADAS\t15](#heading=h.3otgqeq60b9k)", ["^\\*\\*5\\.2 TECNOLOGIAS"]),
    ("[**5.2.1 Frontend\t15**](#heading=h.n1xwh9dcjrhj)", ["^\\*\\*5\\.2\\.1 Frontend"]),
    ("[**5.2.2. Backend\t15**](#heading=h.ku91mi52o)", ["^\\*\\*5\\.2\\.2"]),
    ("[**5.2.3. Banco de Dados\t15**](#heading=h.s30ox9iemuad)", ["^\\*\\*5\\.2\\.3"]),
    ("[**5.2.4. Ferramentas de Apoio\t15**](#heading=h.cor5d9zhibs1)", ["^\\*\\*5\\.2\\.4"]),
    ("[**5.2.5. Padrões Adotados\t15**](#heading=h.prx5lorv61a1)", ["^\\*\\*5\\.2\\.5"]),
    ("[**5.2.6. Boas Práticas e Convenções\t16**](#heading=h.lwv9aqb8fo82)", ["^\\*\\*5\\.2\\.6"]),
    ("[**5.2.7. Requisitos de Infraestrutura\t17**](#heading=h.cljuu2kdfz1c)", ["^\\*\\*5\\.2\\.7"]),
    ("[**5.2.8. APIs e Integrações\t17**](#heading=h.geoccxra8s1c)", ["^\\*\\*5\\.2\\.8"]),
    ("[**5.2.9. Caracterização da API\t17**](#heading=h.7qe3ya9zx4p)", ["^\\*\\*5\\.2\\.9"]),
    ("[5.3. REPOSITÓRIO E CÓDIGO-FONTE\t17](#heading=h.23yhlsncajzw)", ["^\\*\\*5\\.3 REPOSITÓRIO"]),
    ("[**6\\. MANUAL DO USUÁRIO\t18**](#heading=h.q86znzg2s1md)", ["^\\*\\*6 MANUAL DO USUÁRIO"]),
    ("[**7\\. REFERÊNCIAS\t20**](#heading=h.jnyko02gy84p)", ["^# Referencias"]),
    ("[**8\\. APÊNDICE\t21**](#heading=h.38ycm279jzbk)", ["^# Apendice"]),
]


def find_line(lines: list[str], patterns: list[str], default: int) -> int:
    for pat in patterns:
        rx = re.compile(pat)
        for i, line in enumerate(lines, 1):
            if rx.search(line):
                return i
    return default


def page_for_line(line_no: int, content_start: int) -> int:
    if line_no < content_start:
        return max(1, (line_no + LINES_PER_PAGE - 1) // LINES_PER_PAGE)
    delta = line_no - content_start
    return CONTENT_START_PAGE + delta // LINES_PER_PAGE


def apply_page_to_template(template: str, page: int) -> str:
    """Substitui número de página mantendo o formato Google Docs da referência."""
    s = str(page)

    # Linha só com reticências: **Título…………\t12**
    m = re.match(r"^(\*\*[^…]+)(…+)(\t)\d+(\*\*)$", template)
    if m:
        return f"{m.group(1)}{m.group(2)}{m.group(3)}{page}{m.group(4)}"

    # [**Doc\t1**](#link)**2** ou [**3.1.1...\t1**](#link)4
    m = re.match(r"^(\[\*\*[^*]+\t)\d+(\*\*\]\([^)]+\))(\d+)\*\*$", template)
    if m and len(s) >= 2:
        return f"{m.group(1)}{s[:-1]}{m.group(2)}{s[-1]}"
    m = re.match(r"^(\[\*\*[^*]+\t)\d+(\*\*\]\([^)]+\))\*\*(\d+)\*\*$", template)
    if m and len(s) >= 2:
        return f"{m.group(1)}{s[:-1]}{m.group(2)}**{s[-1]}**"

    # [texto\t1](#link)0
    m = re.match(r"^(\[[^\]]+\t)\d+(\]\([^)]+\))(\d+)$", template)
    if m and len(s) >= 2:
        return f"{m.group(1)}{s[:-1]}{m.group(2)}{s[-1]}"

    # [**texto\t15**](#link) — página inteira no título
    m = re.match(r"^(\[\*\*[^*]+\t)\d+(\*\*\]\([^)]+\))$", template)
    if m:
        return f"{m.group(1)}{page}{m.group(2)}"

    # [texto\t15](#link)
    m = re.match(r"^(\[[^\]]+\t)\d+(\]\([^)]+\))$", template)
    if m:
        return f"{m.group(1)}{page}{m.group(2)}"

    # **[link]\t5** ou [link]\t5
    m = re.match(r"^(\*\*\[[^\]]+\]\([^)]+\)\t)\d+(\*\*)$", template)
    if m:
        return f"{m.group(1)}{page}{m.group(2)}"
    m = re.match(r"^(\[[^\]]+\]\([^)]+\)\t)\d+$", template)
    if m:
        return f"{m.group(1)}{page}"

    return template


def build_sumario(body_lines: list[str], content_start: int) -> str:
    rows = ["**SUMÁRIO**", ""]
    for template, patterns in SUMARIO_ENTRIES:
        ln = find_line(body_lines, patterns, content_start)
        pg = page_for_line(ln, content_start)
        rows.append(apply_page_to_template(template, pg))
        rows.append("")
    return "\n".join(rows)


def extract_body(text: str) -> str:
    """Corpo a partir de # DDE, removendo artefatos não presentes na referência."""
    idx = text.find("\n# DDE\n")
    if idx == -1:
        idx = text.find("\n# **1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)**")
    if idx == -1:
        raise SystemExit("Marcador # DDE não encontrado no relatório.")
    body = text[idx + 1 :]
    # Remove HTML/comentários
    body = re.sub(r"<!--.*?-->\n?", "", body, flags=re.DOTALL)
    body = re.sub(r"<p align=\"center\">\n?", "", body)
    body = re.sub(r"</p>\n?", "", body)
    body = re.sub(r"<div style=\"page-break-before: always\"></div>\n?", "", body)
    return body.lstrip("\n")


def ensure_dde_opening(body: str) -> str:
    """Insere ## vazio após título do DDE (referência linha 158)."""
    marker = "# **1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)**"
    if "## \n\n## 1.1" in body or "## \n\n## 1.1" in body:
        return body
    body = re.sub(
        r"(# \*\*1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO \(DDE\)\*\* \{#[^}]+\})\n(## 1\.1)",
        r"\1\n\n## \n\n\2",
        body,
        count=1,
    )
    return body


def main() -> None:
    if not REFERENCE.is_file() or not REPORT.is_file():
        raise SystemExit("Arquivos de referência ou relatório não encontrados.")

    capa, _ = load_reference_front_through_sumario()
    full_report = REPORT.read_text(encoding="utf-8")
    body = extract_body(full_report)
    body = ensure_dde_opening(body)
    body_lines = body.splitlines()

    content_start = find_line(body_lines, ["^# DDE", "^## 1\\.1 INTRODUÇÃO"], 10)
    sumario = build_sumario(body_lines, content_start)

    # Montagem idêntica à referência: capa + sumário + corpo (sem page-break extra)
    out = capa + sumario + "\n\n" + body
    if not out.endswith("\n"):
        out += "\n"

    # Preserva bloco [imageN]: no final se existir
    tail_idx = full_report.find("\n[image1]:")
    if tail_idx != -1:
        out = out.rstrip() + full_report[tail_idx:]

    REPORT.write_text(out, encoding="utf-8")
    print(f"Relatório alinhado IDÊNTICO à referência → {REPORT}")
    print("Capa, histórico, sumário (tabs/negritos/links heading=h) = cópia do modelo AESA-CESA.")


if __name__ == "__main__":
    main()
