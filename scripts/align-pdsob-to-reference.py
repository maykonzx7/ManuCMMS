#!/usr/bin/env python3
"""
Alinha o relatório PDSOB à estrutura do arquivo de referência AESA-CESA:
  Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA.md
  + DEM / DEI / Manual de referência do curso.

- Hierarquia de títulos (# / ## / ###) como no original Google Docs
- Marcadores de seção (# DDE, # ERS, # DEM, # DEI)
- Cabeçalhos DEM/DEI na mesma linha (3.1 / 4.1)
- Malha fina de espaçamento (dicionário, figuras)
- Diretiva Times New Roman 12 pt

Uso: python3 scripts/align-pdsob-to-reference.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"

FONT_BLOCK = (
    "<!-- AESA-CESA: Times New Roman 12 pt, entrelinhas 1,5 — "
    "aplicar em Google Docs: Selecionar tudo → Formatar → Estilo de parágrafo → "
    "Times New Roman 12 → Espaçamento 1,5 -->\n"
)

# Capa/contracapa: centralização como no Google Docs de referência
CAPA_CENTER_OPEN = '<p align="center">'
CAPA_CENTER_CLOSE = "</p>"


def split_tail(text: str) -> tuple[str, str]:
    idx = text.find("\n[image1]:")
    return (text[:idx], text[idx:]) if idx != -1 else (text, "")


def ensure_font_directive(body: str) -> str:
    if "Times New Roman 12" in body[:800]:
        return body
    lines = body.splitlines()
    if not lines:
        return FONT_BLOCK + body
    out = [lines[0], FONT_BLOCK.rstrip(), *lines[1:]]
    return "\n".join(out)


def format_capa_centered(body: str) -> str:
    """Envolve blocos da capa/contracapa em <p align=\"center\"> (referência AESA)."""
    if CAPA_CENTER_OPEN in body:
        return body
    lines = body.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Bloco institucional até o primeiro --- após título do projeto
        if line.startswith("**![][image1]AUTARQUIA") or (
            out and out[-1] == CAPA_CENTER_OPEN and i < 25
        ):
            if line.startswith("**![][image1]AUTARQUIA"):
                out.append(CAPA_CENTER_OPEN)
            out.append(line)
            i += 1
            while i < len(lines) and not lines[i].startswith("---"):
                out.append(lines[i])
                i += 1
            if out and out[-1] != CAPA_CENTER_CLOSE:
                out.append(CAPA_CENTER_CLOSE)
            continue
        # Contracapa: nome do aluno até ARCOVERDE da folha de rosto
        if line.strip() == "MAYKON VANDERSON SIQUEIRA SANTOS" and i < 30:
            out.append(CAPA_CENTER_OPEN)
            while i < len(lines) and not lines[i].startswith("**HISTÓRICO"):
                out.append(lines[i])
                i += 1
            out.append(CAPA_CENTER_CLOSE)
            continue
        out.append(line)
        i += 1
    return "\n".join(out)


def pad_historico_table(body: str) -> str:
    """Histórico de revisão com linhas vazias como na referência (8 linhas de dados)."""
    block_start = "**HISTÓRICO DE REVISÃO**"
    if block_start not in body:
        return body
    head, rest = body.split(block_start, 1)
    if "|  |  |  |" in rest[:600]:
        return body
    rev2 = (
        "| 10/06/2026 | 2.0 | Revisão do relatório com ampliação do DEM, DEI, "
        "documentação técnica, manual do usuário e apêndices; adequação de escopo "
        "de deploy, API parceiro e integração IoT. |"
    )
    if rev2 not in rest:
        return body
    empty_rows = "\n".join(["|  |  |  |"] * 7)
    rest = rest.replace(rev2, rev2 + "\n" + empty_rows, 1)
    return head + block_start + rest


def collapse_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text)


def fix_dictionary_spacing(text: str) -> str:
    """E-04: Fonte → próxima tabela do dicionário sem linha extra."""
    return re.sub(
        r"(Fonte: Produzido pelo autor\.)\n\n(\| Nome da tabela:)",
        r"\1\n\2",
        text,
    )


def add_section_markers(text: str) -> str:
    if "\n# DDE\n" not in text:
        text = re.sub(
            r"^(# \*\*1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO \(DDE\)\*\*)",
            r"# DDE\n\n\1",
            text,
            count=1,
            flags=re.MULTILINE,
        )
    if "\n# ERS\n" not in text:
        text = re.sub(
            r"^(\*\*2 DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS \(ERS\)\*\*)",
            r"# ERS\n\n\1",
            text,
            count=1,
            flags=re.MULTILINE,
        )
    if "\n# DEM\n" not in text:
        text = re.sub(
            r"^(# \*\*3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM \(DEM\)\*\*)",
            r"# DEM\n\n\1",
            text,
            count=1,
            flags=re.MULTILINE,
        )
    if "\n# DEI\n" not in text:
        text = re.sub(
            r"^(\*\*4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES \(DEI\)\*\* 4\.1 WIREFRAMES)",
            r"# DEI\n\n\1",
            text,
            count=1,
            flags=re.MULTILINE,
        )
    return text


def merge_dei_header(text: str) -> str:
    """DEI ref: documento + 4.1 na mesma linha."""
    pat = (
        r"# DEI\n\n\*\*4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES \(DEI\)\*\* "
        r"(\{#[^}]+\})\n\n\*\*4\.1 WIREFRAMES\*\* (\{#[^}]+\})"
    )
    repl = (
        r"# DEI\n\n"
        r"**4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)** 4.1 WIREFRAMES \1"
    )
    return re.sub(pat, repl, text, count=1)


def merge_dem_header(text: str) -> str:
    """DEM ref standalone: documento + 3.1 na mesma linha (após # DEM)."""
    pat = (
        r"# DEM\n\n# \*\*3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM \(DEM\)\*\*\s+"
        r"(\{#[^}]+\})\s*\n+\*\*3\.1 MODELAGEM DE DADOS\*\*\s+\{#[^}]+\}"
    )
    repl = (
        r"# DEM\n\n"
        r"**3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)** "
        r"3.1 MODELAGEM DE DADOS \1"
    )
    return re.sub(pat, repl, text, count=1)


def restore_heading_hierarchy(text: str) -> str:
    """Converte **N.N Título** → ## / ### conforme referência AESA-CESA."""

    # Documento 1: nível #
    text = re.sub(
        r"^\*\*1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO \(DDE\)\*\* (\{#[^}]+\})\s*$",
        r"# **1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)** \1",
        text,
        flags=re.MULTILINE,
    )

    # DDE — nível ## (exceto 1.4 e 1.11 que ficam sem markdown heading)
    dde_h2 = [
        (r"^\*\*1\.1 INTRODUÇÃO\s*\*\* (\{#[^}]+\})\s*$", r"## 1.1 INTRODUÇÃO  \1"),
        (r"^\*\*1\.2 VISÃO GERAL DO DOCUMENTO\*\* (\{#[^}]+\})\s*$", r"## 1.2 VISÃO GERAL DO DOCUMENTO \1"),
        (r"^\*\*1\.3 IDENTIFICAÇÃO DO PROJETO\s*\*\* (\{#[^}]+\})\s*$", r"## 1.3 IDENTIFICAÇÃO DO PROJETO  \1"),
        (r"^\*\*1\.5 JUSTIFICATIVA\*\* (\{#[^}]+\})\s*$", r"## 1.5 JUSTIFICATIVA \1"),
        (r"^\*\*1\.6 IDENTIFICAÇÃO DOS REQUISITOS\s*\*\* (\{#[^}]+\})\s*$", r"## 1.6 IDENTIFICAÇÃO DOS REQUISITOS  \1"),
        (r"^\*\*1\.7 ESCOPO DO PRODUTO E ENTREGÁVEIS\*\*\s*$", r"## 1.7 ESCOPO DO PRODUTO E ENTREGÁVEIS "),
        (r"^\*\*1\.8 PREMISSAS E RESTRIÇÕES\*\*\s*$", r"## 1.8 PREMISSAS E RESTRIÇÕES"),
        (r"^\*\*1\.9 CRITÉRIOS DE ACEITAÇÃO DO PROJETO\*\* (\{#[^}]+\})\s*$", r"## 1.9 CRITÉRIOS DE ACEITAÇÃO DO PROJETO \1"),
        (r"^\*\*1\.10 EXCLUSÕES DO ESCOPO\*\*\s*$", r"## 1.10 EXCLUSÕES DO ESCOPO "),
        (r"^\*\*1\.12 RISCOS INICIAIS\s*\*\* (\{#[^}]+\})\s*$", r"## 1.12 RISCOS INICIAIS  \1"),
    ]
    for pat, repl in dde_h2:
        text = re.sub(pat, repl, text, flags=re.MULTILINE)

    # DDE — nível ###
    dde_h3 = [
        (r"^\*\*1\.6\.1 Prioridades dos Requisitos\*\* (\{#[^}]+\})\s*$", r"### **1.6.1 Prioridades dos Requisitos** \1"),
        (r"^\*\*1\.7\.1 Funcionalidades Previstas\*\* (\{#[^}]+\})\s*$", r"###  **1.7.1 Funcionalidades Previstas** \1"),
        (r"^\*\*1\.8\.1 Premissas\*\*(\{#[^}]+\})\s*$", r"### **1.8.1 Premissas**  \1"),
        (r"^\*\*1\.8\.2 Restrições\*\*(\{#[^}]+\})\s*$", r"### **1.8.2 Restrições**  \1"),
    ]
    for pat, repl in dde_h3:
        text = re.sub(pat, repl, text, flags=re.MULTILINE)

    # ERS — ## para 2.x
    text = re.sub(
        r"^\*\*2\.1 REQUISITOS FUNCIONAIS\*\* (\{#[^}]+\})\s*$",
        r"## 2.1 REQUISITOS FUNCIONAIS \1",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"^\*\*2\.2 REQUISITOS NÃO FUNCIONAIS\*\* (\{#[^}]+\})\s*$",
        r"## 2.2 REQUISITOS NÃO FUNCIONAIS \1",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"^\*\*2\.3 REGRAS DE NEGÓCIO\*\* (\{#[^}]+\})\s*$",
        r"## 2.3 REGRAS DE NEGÓCIO \1",
        text,
        flags=re.MULTILINE,
    )

    # DEM — após merge, 3.1.1+ em ###
    dem_h3 = [
        (r"^\*\*3\.1\.1 Entidade-Relacionamento\*\* (\{#[^}]+\})\s*$", r"### **3.1.1 Entidade-Relacionamento** \1"),
        (r"^\*\*3\.1\.2 Dicionário de Dados\*\* (\{#[^}]+\})\s*$", r"### **3.1.2 Dicionário de Dados**  \1"),
        (r"^\*\*3\.2\.1 Diagrama de Sequência[^*]*\*\* (\{#[^}]+\})\s*$", r"### **3.2.1 Diagrama de Sequência (Criação Automática de OS via IoT)** \1"),
        (r"^\*\*3\.2\.2 Diagrama de Estados[^*]*\*\* (\{#[^}]+\})\s*$", r"### **3.2.2 Diagrama de Estados (Ciclo de Vida da OS)** \1"),
        (r"^\*\*3\.3\.1 Diagrama de Caso de Uso\*\* (\{#[^}]+\})\s*$", r"### **3.3.1 Diagrama de Caso de Uso**	 \1"),
        (r"^\*\*3\.3\.2 Diagrama de Componentes[^*]*\*\* (\{#[^}]+\})\s*$", r"### **3.3.2 Diagrama de Componentes (Arquitetura Hexagonal)** \1"),
        (r"^\*\*3\.3\.3 Diagrama de Arquitetura[^*]*\*\* (\{#[^}]+\})\s*$", r"### **3.3.3 Diagrama de Arquitetura (Infraestrutura)**	 \1"),
    ]
    for pat, repl in dem_h3:
        text = re.sub(pat, repl, text, flags=re.MULTILINE)

    dem_h2 = [
        (r"^\*\*3\.2 MODELAGEM COMPORTAMENTAL\*\* (\{#[^}]+\})\s*$", r"## 3.2 MODELAGEM COMPORTAMENTAL  \1"),
        (r"^\*\*3\.3\. MODELAGEM ESTRUTURAL\*\* (\{#[^}]+\})\s*$", r"## 3.3 MODELAGEM ESTRUTURAL \1"),
        (r"^\*\*3\.3 MODELAGEM ESTRUTURAL\*\* (\{#[^}]+\})\s*$", r"## 3.3 MODELAGEM ESTRUTURAL \1"),
        (r"^\*\*3\.4 MAPEAMENTO OBJETO-RELACIONAL \(ORM\)\*\* (\{#[^}]+\})\s*$", r"## 3.4 MAPEAMENTO OBJETO-RELACIONAL (ORM) \1"),
        (r"^\*\*3\.5 BPMN \(BUSINESS PROCESS MODEL AND NOTATION\)\*\* (\{#[^}]+\})\s*$", r"## 3.5 BPMN (BUSINESS PROCESS MODEL AND NOTATION) \1"),
    ]
    for pat, repl in dem_h2:
        text = re.sub(pat, repl, text, flags=re.MULTILINE)

    # DEI / Doc técnica / Manual — títulos principais
    text = re.sub(
        r"^\*\*5 DOCUMENTAÇÃO TÉCNICA\*\* (\{#[^}]+\})\s*$",
        r"# **5 DOCUMENTAÇÃO TÉCNICA** \1",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"^\*\*6 MANUAL DO USUÁRIO\*\* (\{#[^}]+\})\s*$",
        r"**6 MANUAL DO USUÁRIO** \1",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"^\*\*7 REFERÊNCIAS\*\* (\{#[^}]+\})\s*$",
        r"# Referencias",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"^\*\*8 APÊNDICE\*\* (\{#[^}]+\})\s*$",
        r"# Apendice",
        text,
        flags=re.MULTILINE,
    )

    # Manual: 6.N sem negrito (referência 6 MANUAL)
    text = re.sub(
        r"^\*\*(6\.\d+ [A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\*]+)\*\*\s*$",
        r"\1",
        text,
        flags=re.MULTILINE,
    )

    return text


def normalize_figure_spacing(text: str) -> str:
    """Garante bloco padrão: título → linha → tabela → linha → Fonte."""
    pattern = re.compile(
        r"(Figura \d+ \\- [^\n]+\.)\n+"
        r"(\|[^\n]+\|\n)"
        r"(\|[^\n]+\|\n)\n*"
        r"(Fonte: Produzido pelo autor\.)\s*",
        re.MULTILINE,
    )

    def repl(m: re.Match) -> str:
        return f"{m.group(1)} \n\n{m.group(2)}{m.group(3)}\n{m.group(4)} \n\n"

    return pattern.sub(repl, text)


def escape_req_ids(text: str) -> str:
    r"""ERS ref: \[RF-01\] em vez de [RF-01] na seção 2."""
    start = text.find("# ERS")
    end = text.find("# DEM")
    if start == -1 or end == -1:
        return text
    head, ers, tail = text[:start], text[start:end], text[end:]
    ers = re.sub(r"(?<!\[)\[(RF-\d+|NF-\d+|RN-\d+)\]", r"\\[\1\\]", ers)
    return head + ers + tail


def main() -> None:
    if not REPORT.is_file():
        raise SystemExit(f"Relatório não encontrado: {REPORT}")

    raw = REPORT.read_text(encoding="utf-8")
    body, tail = split_tail(raw)

    body = ensure_font_directive(body)
    body = format_capa_centered(body)
    body = pad_historico_table(body)
    body = restore_heading_hierarchy(body)
    body = add_section_markers(body)
    body = merge_dem_header(body)
    body = merge_dei_header(body)
    body = fix_dictionary_spacing(body)
    body = normalize_figure_spacing(body)
    body = escape_req_ids(body)
    body = collapse_blank_lines(body)

    REPORT.write_text(body + tail, encoding="utf-8")
    print(f"Alinhado à referência AESA-CESA → {REPORT}")
    print("Próximo: python3 scripts/fix-pdsob-sumario.py && python3 scripts/normalize-pdsob-format.py")


if __name__ == "__main__":
    main()
