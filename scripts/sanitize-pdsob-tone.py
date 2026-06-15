#!/usr/bin/env python3
"""
Remove linguagem que evidencia processo automático/IA do relatório PDSOB.
Uso: python3 scripts/sanitize-pdsob-tone.py
"""
from __future__ import annotations

import re
from pathlib import Path

REPORT = Path(__file__).resolve().parents[1] / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"

REPLACEMENTS: list[tuple[str, str]] = [
    # Sumário — nota de pipeline
    (
        "> Numeração estimada para ~52 linhas/página após a capa. "
        "Ao colar no Google Docs, atualize com `Inserir → Índice` para páginas definitivas.\n",
        "",
    ),
    # Histórico
    (
        "Atualização integral ao estado atual do sistema: DEM estendido, DEI, documentação técnica, "
        "manual do usuário, apêndice e correções de escopo (Render, API parceiro, ThingSpeak/Adafruit IO).",
        "Revisão do relatório com ampliação do DEM, DEI, documentação técnica, manual do usuário e apêndices; "
        "adequação de escopo de deploy, API parceiro e integração IoT.",
    ),
    # DDE
    (
        "O relatório integra DDE, ERS, DEM, DEI, documentação técnica, manual do usuário e apêndices, "
        "refletindo o estado de implementação em homologação (junho/2026).",
        "O relatório integra DDE, ERS, DEM, DEI, documentação técnica, manual do usuário e apêndices.",
    ),
    (
        "* Documentação técnica (seção 5), manual por perfil (seção 6), evidências NF em docs/evidencias/.",
        "* Documentação técnica (seção 5), manual por perfil (seção 6) e evidências de testes (apêndice).",
    ),
    (
        "* Acesso por convite (ALLOW_AUTH_SUB_LINK_BY_EMAIL=false recomendado).",
        "* Acesso restrito por convite corporativo.",
    ),
    # Percentuais estilo sprint — linguagem de produto
    ("* IAM (94%):", "* IAM:"),
    ("* Messageria (88%):", "* Messageria:"),
    ("* Dashboard (80%): KPIs executivos, relatórios; gráfico temperatura IoT (RF-09) adiado.", "* Dashboard: KPIs executivos e relatórios gerenciais."),
    ("* Auditoria (85%):", "* Auditoria:"),
    # Critérios de aceitação — tom de checklist de dev
    ("* CRUD ativos e OS com validação — **implementado**.", "* CRUD de ativos e ordens de serviço com validação de regras de negócio."),
    ("* Login RBAC + auditoria MongoDB — **implementado**.", "* Autenticação com RBAC e trilha de auditoria."),
    (
        "* IoT → OS preditiva (RN-01) — **parcial** (infraestrutura + simulação; RF-09 adiado).",
        "* Fluxo IoT com criação de OS preditiva (RN-01), com suporte a telemetria e cenários de teste.",
    ),
    ("* Dashboard KPIs — **implementado** (Gestor/Admin).", "* Dashboard de KPIs para perfis Gestor e Administrador."),
    (
        "* Integração externa API parceiro + webhook — **implementado** (substitui integração ERP planejada).",
        "* Integração externa via API parceiro e webhook outbound.",
    ),
    ("* Responsividade NF-03 — **evidenciado** (11 screenshots).", "* Interface responsiva conforme requisito NF-03."),
    ("* Health checks + circuit breaker — **implementado** (NF-04, NF-08).", "* Health checks e circuit breaker conforme NF-04 e NF-08."),
    ("* Deploy HTTPS homologação — **implementado**.", "* Publicação em ambiente de homologação com HTTPS."),
    ("* Testes ≥80% RN críticas — **implementado** (npm run test:critical).", "* Cobertura de testes das regras de negócio críticas."),
    # NF critérios
    ("  Verificação: script curl / evidências NF-01.  ", "  Verificação: medição dos tempos de resposta em ambiente de homologação.  "),
    ("- Critério de aceitação: Tempos registrados em docs/evidencias/NF-01-performance/ — **OK**.", "- Critério de aceitação: Tempos de resposta dentro dos limites estabelecidos."),
    ("- Critério de aceitação: 11 screenshots em NF-03 — **OK**.", "- Critério de aceitação: Layout adaptável em resoluções 360px, 768px e 1280px."),
    ("- Critério de aceitação: Adiado — infraestrutura IoT pronta, UI pendente.", "- Critério de aceitação: Ingestão IoT operacional; visualização gráfica prevista em versão futura."),
    # DEI
    (
        "Telas implementadas em Next.js 16 sob o prefixo /workspace. Evidências visuais em docs/evidencias/NF-03-screenshots/.",
        "Wireframes das principais telas da plataforma web corporativa.",
    ),
    (
        "Mockups em estilo desenhado à mão (sketch), representando as telas de homologação com paleta azul petróleo e grafite — gerados por `scripts/generate-sketch-mockups.py`.",
        "Mockups de telas do sistema em ambiente de homologação, com identidade visual corporativa (azul petróleo e grafite).",
    ),
    # Títulos mockup
    ("Figura 55 \\- Mockup login homologação (plataforma web).", "Figura 55 \\- Mockup da tela de login (plataforma web)."),
    ("Figura 56 \\- Mockup lista de ordens (plataforma web).", "Figura 56 \\- Mockup da lista de ordens de serviço (plataforma web)."),
    ("Figura 57 \\- Mockup detalhe de OS (plataforma web).", "Figura 57 \\- Mockup do detalhe da ordem de serviço (plataforma web)."),
    ("Figura 58 \\- Mockup dashboard KPIs (plataforma web).", "Figura 58 \\- Mockup do dashboard executivo (plataforma web)."),
    ("Figura 59 \\- Mockup mapa de ativos (plataforma web).", "Figura 59 \\- Mockup do mapa de ativos (plataforma web)."),
    ("Figura 60 \\- Mockup auditoria (plataforma web).", "Figura 60 \\- Mockup da trilha de auditoria (plataforma web)."),
    ("Figura 61 \\- Mockup administração (plataforma web).", "Figura 61 \\- Mockup da administração e convites (plataforma web)."),
    ("Figura 62 \\- Mockup responsivo mobile (plataforma web).", "Figura 62 \\- Mockup responsivo da tela de login (plataforma web)."),
    # Doc técnica — tabela cobertura
    ("| Módulo DDE | Cobertura | Componentes |", "| Módulo | Descrição | Componentes |"),
    ("| IAM | 94% | Supabase Auth, convites, RBAC, escopo unidade |", "| IAM | Identidade e acesso | Supabase Auth, convites, RBAC, escopo unidade |"),
    ("| Core Business | 100% | Ativos, OS, peças, SLA, anexos |", "| Core Business | Núcleo operacional | Ativos, OS, peças, SLA, anexos |"),
    ("| Messageria | 88% | RabbitMQ, WebSocket, email, webhook |", "| Messageria | Eventos e notificações | RabbitMQ, WebSocket, e-mail, webhook |"),
    ("| Dashboard | 80% | KPIs, relatórios (RF-09 adiado) |", "| Dashboard | Indicadores gerenciais | KPIs e relatórios executivos |"),
    ("| Auditoria | 85% | MongoDB, UI, export |", "| Auditoria | Rastreabilidade | MongoDB, consulta e exportação |"),
    ("Variáveis em .env (nunca no Git), validação DTO, escopo unidade server-side, testes npm run test:critical.", "Variáveis de ambiente protegidas, validação de entrada, escopo por unidade no servidor e testes automatizados."),
    # Apêndice evidências / diagramas
    (
        "Artefatos em docs/evidencias/: NF-01 a NF-11 (performance, ZAP, screenshots, health, auditoria, k6, uptime, circuit breaker, backup, a11y).",
        "Evidências dos testes não funcionais NF-01 a NF-11 (desempenho, segurança, disponibilidade, acessibilidade e auditoria).",
    ),
    ("APÊNDICE L \\- DIAGRAMAS RENDERIZADOS (IMAGENS)", "APÊNDICE L \\- DIAGRAMAS (IMAGENS)"),
    (
        "Figuras geradas automaticamente a partir dos arquivos em docs/relatorio-assets/plantuml/.",
        "Representação gráfica dos diagramas de modelagem descritos nos apêndices A a G.",
    ),
    ("**Diagrama B-auth — Sequência Auth**", "**Diagrama B — Sequência de autenticação**"),
    ("**Diagrama B-iot — Sequência IoT**", "**Diagrama B — Sequência de ingestão IoT**"),
    # Apêndice K comandos internos
    (
        "cd backend && npm test && npm run test:critical\nk6 run -e API_BASE_URL=https://manucmms.onrender.com scripts/nf-k6-load.js\n./scripts/prod/collect-nf-dde.sh",
        "Execução dos testes unitários, testes das regras críticas e testes de carga conforme estratégia da seção 5.",
    ),
]

# RN-16 env var
ENV_PATTERNS = [
    (r"\(x-platform-admin-key\)", ""),
    (r"Simulação POST /iot/simular e painel /workspace/iot", "Cenários de simulação de telemetria no ambiente de testes"),
]


def main() -> None:
    text = REPORT.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    for pat, repl in ENV_PATTERNS:
        text = re.sub(pat, repl, text)
    if text != original:
        REPORT.write_text(text, encoding="utf-8")
        print(f"Relatório sanitizado: {REPORT}")
    else:
        print("Nenhuma alteração necessária.")


if __name__ == "__main__":
    main()
