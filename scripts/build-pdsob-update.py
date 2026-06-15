#!/usr/bin/env python3
"""Gera o conteúdo textual atualizado do relatório PDSOB ManuCMMS."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"
OUT = SRC


def fig(n: int, title: str, has_image: bool = False, quadrant: bool = False) -> str:
    """Bloco de figura no padrão TCC (docs/PADRONIZACAO-TCC-GOLDEN-RULES.md)."""
    if n >= 101:
        caption = "Manual do usuário"
    else:
        caption = title if title.endswith(".") else f"{title}."
    img = f"![][image{n}]" if has_image and n <= 10 else ""
    cell = f"| {img} |" if img else "|  |"
    align = "| :---- |" if quadrant and not img else "| :---: |"
    return f"""Figura {n} \\- {caption}

{cell}
{align}

Fonte: Produzido pelo autor.

"""


def dict_table(name: str, definition: str, rows: list[tuple]) -> str:
    lines = [
        f"| Nome da tabela: {name} |  |  |  |  |  |",
        "| ----- | ----- | ----- | ----- | ----- | ----- |",
        f"| **Definição: {definition}** |  |  |  |  |  |",
        "| **Nome da Coluna** | **Tipo de Dados** | **Tamanho** | **Restrições** | **Valor Padrão** | **Descrição** |",
    ]
    for r in rows:
        lines.append(f"| {' | '.join(r)} |")
    lines.append("")
    lines.append("Fonte: Produzido pelo autor.")
    lines.append("")
    return "\n".join(lines)


def build_header() -> str:
    return """# Capa, contracapa.

**![][image1]AUTARQUIA DE ENSINO SUPERIOR DE ARCOVERDE**  
**CENTRO DE ENSINO SUPERIOR DE ARCOVERDE**  
**CURSO SUPERIOR EM ANÁLISE E DESENVOLVIMENTO DE SISTEMAS**

**ManuCMMS \\- Sistema Corporativo de Gestão de Manutenção de Ativos**  
---

*Relatório Técnico* 

MAYKON VANDERSON SIQUEIRA SANTOS

ARCOVERDE \\- PE  
2026  
**MAYKON VANDERSON SIQUEIRA SANTOS**

**ManuCMMS \\- Sistema Corporativo de Gestão de Manutenção de Ativos**

Relatório Técnico apresentado como requisito parcial para a disciplina de Projeto de Desenvolvimento de Sistema Corporativo, do curso superior em Análise em Desenvolvimento de Sistemas, sob orientação do Profº Dennys Cavalcanti Carvalho.

ARCOVERDE \\- PE  
2026  
**HISTÓRICO DE REVISÃO**

| Data | Versão | Descrição |
| :---: | :---: | ----- |
| 3/03/2026 | 1.0 | Elaboração dos primeiros conteúdos para implementação no documento. |
| 10/06/2026 | 2.0 | Atualização integral ao estado atual do sistema: DEM estendido, DEI, documentação técnica, manual do usuário, apêndice e correções de escopo (Render, API parceiro, ThingSpeak/Adafruit IO). |

**SUMÁRIO**

**[1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)](#1-documento-de-definição-de-escopo-\\(dde\\))	5**

[1.1. INTRODUÇÃO](#1.1-introdução)	5

[1.2. VISÃO GERAL DO DOCUMENTO](#1.2-visão-geral-do-documento)	5

[1.3. IDENTIFICAÇÃO DO PROJETO](#1.3-identificação-do-projeto)	5

[1.4. OBJETIVOS DO PROJETO](#heading=h.t50d67n85d73)	5

[1.5. JUSTIFICATIVA](#1.5-justificativa)	6

[1.6. IDENTIFICAÇÃO DOS REQUISITOS](#1.6-identificação-dos-requisitos)	6

[**1.6.1. Prioridades dos Requisitos**](#1.6.1-prioridades-dos-requisitos)	6

[1.7. ESCOPO DO PRODUTO E ENTREGÁVEIS](#heading=h.y0fumei2z2b5)	7

[**1.7.1. Funcionalidades Previstas**](#1.7.1-funcionalidades-previstas)	7

[**1.7.2. Entregáveis**](#heading=h.4ah7jtit6yq5)	7

[1.8. PREMISSAS E RESTRIÇÕES](#heading=h.76hfccpbi3of)	7

[**1.8.1. Premissas**](#1.8.1-premissas)	7

[**1.8.2. Restrições**](#1.8.2-restrições)	7

[1.9. CRITÉRIOS DE ACEITAÇÃO DO PROJETO](#1.9-critérios-de-aceitação-do-projeto)	8

[1.10. EXCLUSÕES DO ESCOPO](#heading=h.j2dqyap98ltz)	8

[1.11. STAKEHOLDERS ENVOLVIDOS](#heading=h.jnidifd7u5ev)	8

[1.12. RISCOS INICIAIS](#1.12-riscos-iniciais)	8

[**2 DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS (ERS)	1**](#heading=h.pppvxduj40qe)**0**

[2.1. REQUISITOS FUNCIONAIS	1](#2.1-requisitos-funcionais)0

[2.2. REQUISITOS NÃO FUNCIONAIS	1](#2.2-requisitos-não-funcionais)0

[2.3. REGRAS DE NEGÓCIO	1](#2.3-regras-de-negócio)0

[**3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)	1**](#3-documento-de-especificação-de-modelagem-\\(dem\\))**2**

[3.1 MODELAGEM DE DADOS	1](#3.1-modelagem-de-dados)2

[**3.1.1 Entidade-Relacionamento	1**](#3.1.1-entidade-relacionamento)2

[**3.1.2 Dicionário de Dados	1**](#3.1.2-dicionário-de-dados)2

[3.2 MODELAGEM COMPORTAMENTAL	1](#3.2-modelagem-comportamental)2

[**3.2.1 Diagrama de Sequência	1**](#3.2.1-diagrama-de-sequência-\\(criação-automática-de-os-via-iot\\))2

[**3.2.2 Diagrama de Estados	1**](#3.2.2-diagrama-de-estados-\\(ciclo-de-vida-da-os\\))2

[3.3. MODELAGEM ESTRUTURAL	1](#3.3-modelagem-estrutural)2

[**3.3.1 Diagrama de Caso de Uso	1**](#3.3.1-diagrama-de-caso-de-uso)2

[**3.3.2 Diagrama de Componentes	1**](#3.3.2-diagrama-de-componentes-\\(arquitetura-hexagonal\\))2

[**3.3.3 Diagrama de Arquitetura	1**](#3.3.3-diagrama-de-arquitetura-\\(infraestrutura\\))2

[3.4 MAPEAMENTO OBJETO-RELACIONAL (ORM)	1](#3.4-mapeamento-objeto-relacional-\\(orm\\))2

[3.5 BPMN (BUSINESS PROCESS MODEL AND NOTATION)	1](#3.5-bpmn-\\(business-process-model-and-notation\\))2

[**4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)	1**](#4-documento-de-especificação-de-interfaces-\\(dei\\))**3**

[4.1. WIREFRAMES	1](#4.1-wireframes)3

[4.2. MOCKUPS	1](#4.2-mockups)3

[4.3. FLUXO DE NAVEGAÇÃO	1](#4.3-fluxo-de-navegação)3

[**5 DOCUMENTAÇÃO TÉCNICA	1**](#5-documentação-técnica)**4**

[5.1. ARQUITETURA DO SISTEMA	1](#5.1-arquitetura-do-sistema)4

[**5.1.1. Segmentação da Arquitetura	15**](#5.1.1-segmentação-da-arquitetura)

[5.2. TECNOLOGIAS UTILIZADAS	15](#5.2-tecnologias-utilizadas)

[**5.2.1 Frontend	15**](#5.2.1-frontend)

[**5.2.2. Backend	15**](#5.2.2-backend)

[**5.2.3. Banco de Dados	15**](#5.2.3-banco-de-dados)

[**5.2.4. Ferramentas de Apoio	15**](#5.2.4-ferramentas-de-apoio)

[**5.2.5. Padrões Adotados	15**](#5.2.5-padrões-adotados)

[**5.2.6. Boas Práticas e Convenções	16**](#5.2.6-boas-práticas-e-convenções)

[**5.2.7. Requisitos de Infraestrutura	17**](#5.2.7-requisitos-de-infraestrutura)

[**5.2.8. APIs e Integrações	17**](#5.2.8-apis-e-integrações)

[**5.2.9. Caracterização da API	17**](#5.2.9-caracterização-da-api)

[5.3. REPOSITÓRIO E CÓDIGO-FONTE	17](#5.3-repositório-e-código-fonte)

[**6\\. MANUAL DO USUÁRIO	18**](#6-manual-do-usuário)

[**7\\. REFERÊNCIAS	20**](#7-referências)

[**8\\. APÊNDICE	21**](#8-apêndice)

"""


def build_dde() -> str:
    return """# DDE

# **1 DOCUMENTO DE DEFINIÇÃO DE ESCOPO (DDE)** {#1-documento-de-definição-de-escopo-(dde)}

## 1.1 INTRODUÇÃO  {#1.1-introdução}

A ManuCMMS é um sistema corporativo de gestão de manutenção computadorizada (CMMS \\- Computerized Maintenance Management System), projetado para otimizar processos de manutenção em setores industriais, como fábricas, hospitais, shoppings e grandes conglomerados setoriais do Brasil. Em um contexto onde empresas perdem bilhões anualmente devido a manutenções reativas e paradas inesperadas de equipamentos (downtime de 8-15% do tempo produtivo), conforme dados da ABRAMAN (2024) e da ABECom (2024), a ManuCMMS visa transformar esses desafios em soluções preventivas e preditivas, integrando tecnologias de IoT para monitoramento em tempo real e análise inteligente de dados.

A ideia central da solução reside em centralizar a gestão de ativos e ordens de serviço em arquitetura multi-tenant (Empresa → Unidade Fabril), utilizando sensores em microcontroladores (Arduino/ESP32 \\+ DHT22) com publicação em plataforma IoT (ThingSpeak ou Adafruit IO) para detectar variações críticas de temperatura e disparar ações automáticas via microserviço de ingestão, reduzindo custos operacionais. Destinado a departamentos de manutenção e operações, o sistema promove eficiência integrada, com módulos de identidade, domínio de negócios, mensageria e inteligência de dados.

## 1.2 VISÃO GERAL DO DOCUMENTO {#1.2-visão-geral-do-documento}

Este Documento de Definição de Escopo (DDE) apresenta o escopo detalhado do ManuCMMS, plataforma web corporativa destinada à gestão inteligente de manutenção de ativos. O relatório integra DDE, ERS, DEM, DEI, documentação técnica, manual do usuário e apêndices.

## 1.3 IDENTIFICAÇÃO DO PROJETO  {#1.3-identificação-do-projeto}

O projeto identifica-se pelo nome ManuCMMS e está vinculado ao Curso Superior em Análise e Desenvolvimento de Sistemas, 5º período, da Autarquia de Ensino Superior de Arcoverde (AESA-CESA).

O autor e responsável técnico é Maykon Vanderson Siqueira Santos, sob orientação do professor Dennys Cavalcanti Carvalho. A proposta foi validada como Projeto de Desenvolvimento de Sistema Corporativo, atendendo aos quatro módulos obrigatórios (IAM, Core Business, Messageria e Dashboard Executivo), arquitetura hexagonal, DDD, auditabilidade rígida, interoperabilidade via API REST de parceiro e webhook outbound, e IoT com integração de telemetria demonstrada por script de simulação (POST /iot/simular e painel /workspace/iot), reproduzindo o fluxo compatível com Arduino/ESP32 \\+ DHT22 → ThingSpeak ou Adafruit IO.

O ambiente de desenvolvimento e homologação utiliza controle de versão (GIT), conteinerização (Docker) e integração real com ferramenta externa (API parceiro e webhook outbound), com o código-fonte e toda a documentação complementar disponível no repositório do projeto.

1.4 OBJETIVOS DO PROJETO 

Objetivo Geral: Desenvolver um sistema web corporativo de gestão de manutenção com IoT que centralize o controle de ativos, ordens de serviço e KPIs por unidade fabril.

Objetivos específicos:

* Proporcionar módulo IAM com autenticação Supabase, convites, RBAC por cargo/permissão, escopo por unidade e auditoria em MongoDB.

* Desenvolver núcleo de domínio com CRUD de ativos, ordens de serviço, peças/estoque, SLA e regras RN-02, RN-07, RN-13, RN-15.

* Permitir telemetria de temperatura via ESP32/Arduino → ThingSpeak/Adafruit IO → iot-ingestion → RabbitMQ, com criação de OS preditiva (RN-01) e simulação para testes.

* Fornecer dashboard executivo com MTBF, MTTR, OEE e percentuais de manutenção, restrito a Gestor/Admin (RN-03).

* Garantir interoperabilidade via API parceiro (x-api-key) e webhook configurável por empresa após fechamento de OS.

## 1.5 JUSTIFICATIVA {#1.5-justificativa}

Indústrias brasileiras ainda enfrentam ineficiências do modelo reativo de manutenção. A ausência de monitoramento contínuo, planilhas isoladas e falta de histórico auditável geram retrabalho e custos elevados (ABRAMAN, 2024; ABECom, 2024). O ManuCMMS substitui processos manuais por solução integrada com IoT, OS preditivas, estoque de peças e visibilidade gerencial via KPIs (Tractian, 2025).

## 1.6 IDENTIFICAÇÃO DOS REQUISITOS  {#1.6-identificação-dos-requisitos}

* O requisito funcional [Cadastro de Usuários.RF-01] está na subseção 2.1, bloco [RF-01].

* O requisito não funcional [Disponibilidade.NF-04] está na subseção 2.2, bloco [NF-04].

### **1.6.1 Prioridades dos Requisitos** {#1.6.1-prioridades-dos-requisitos}

* Essencial: indispensável para operação; deve ser implementado.

* Importante: afeta qualidade; implementação recomendada.

* Desejável: pode ser incluído em versão futura.

## 1.7 ESCOPO DO PRODUTO E ENTREGÁVEIS 

### **1.7.1 Funcionalidades Previstas** {#1.7.1-funcionalidades-previstas}

* Gestão de Identidade (IAM): Login e recuperação de senha via Supabase Auth, cadastro por convite corporativo, RBAC granular por cargo e permissão (Técnico, Supervisor, Gestor, Auditor e Administrador) com escopo por unidade fabril, e trilha de auditoria rígida de login e alterações críticas registrada em MongoDB, com interface de consulta e exportação CSV.

* Core Business (Domínio): CRUD completo de ativos e ordens de serviço com agregados consistentes em arquitetura hexagonal e Domain-Driven Design (DDD), regras de negócio (OS só fecha com foto e assinatura digital — RN-02, RN-07, RN-13, RN-15), gestão de peças e estoque, SLA, histórico completo de manutenções, upload de foto, mapa e documentos, e exportação PDF/CSV.

* Messageria e Eventos: Processamento assíncrono via RabbitMQ para eventos de temperatura crítica (IoT Arduino/ESP32 com sensor DHT22, publicação em ThingSpeak ou Adafruit IO e ingestão pelo microserviço iot-ingestion), criação automática de OS preditiva (RN-01), notificações em tempo real via WebSocket, e-mail transacional (Brevo), webhook outbound com circuit breaker e API REST de parceiro (x-api-key).

* Inteligência de Dados: Dashboard executivo com KPIs (MTBF, MTTR, OEE, % preventivas vs corretivas e custo mensal) restrito a Gestor e Administrador (RN-03), relatórios gerenciais e gráficos de temperatura em tempo real com Recharts.

* Interoperabilidade: Integração real via API REST de parceiro e webhook outbound para envio automático de custos, peças utilizadas e ordens concluídas, com autenticação por x-api-key e entrega resiliente via fila RabbitMQ.

* Infraestrutura e Qualidade: Health checks em todos os serviços, circuit breaker, testes unitários e de integração com cobertura mínima de 80% das regras de negócio críticas, upload de arquivos até 800 MB, interface responsiva validada em desktop, tablet e mobile, ambiente de homologação em Vercel (frontend) e Render (API e workers), com simulação IoT disponível no workspace para testes sem hardware físico.

**1.7.2 Entregáveis**

* Plataforma web em https://manucmms.vercel.app com RBAC e PWA (Serwist).

* Repositório Git com monorepo TypeScript, Docker Compose e CI.

* Documentação técnica (seção 5), manual por perfil (seção 6) e evidências de testes (apêndice).

* Homologação: Vercel + Render (manucmms.onrender.com) com HTTPS e Supabase Auth.

* Demonstração da integração IoT via script de simulação (POST /iot/simular e painel /workspace/iot), reproduzindo telemetria, ingestão pelo microserviço iot-ingestion, RabbitMQ, criação automática de OS preditiva (RN-01) e notificações em tempo real, comprovando a integração entre identidade, domínio, messageria e inteligência de dados, sem hardware físico na defesa final.

## 1.8 PREMISSAS E RESTRIÇÕES

### **1.8.1 Premissas**  {#1.8.1-premissas}

Acesso contínuo a internet, Supabase, RabbitMQ, MongoDB Atlas, CloudAMQP, Upstash Redis e Brevo (e-mail). Simulação IoT via script POST /iot/simular e painel /workspace/iot para demonstração da telemetria e integração ponta a ponta. Docker, Git e deploy em Vercel/Render permitidos.

### **1.8.2 Restrições**  {#1.8.2-restrições}

* Prazo até 02/07/2026.

* Linguagem exclusiva TypeScript.

* Interface web responsiva (sem app nativo).

* Integração ERP limitada a API parceiro genérica e webhook (não SAP/TOTVS).

* IoT restrito a temperatura demonstrada por simulação (script e painel /workspace/iot); sem PLCs industriais.

* Acesso por convite (ALLOW_AUTH_SUB_LINK_BY_EMAIL=false recomendado).

## 1.9 CRITÉRIOS DE ACEITAÇÃO DO PROJETO {#1.9-critérios-de-aceitação-do-projeto}

* CRUD ativos e OS com validação — **implementado**.

* Login RBAC + auditoria MongoDB — **implementado**.

* IoT → OS preditiva (RN-01) — **parcial** (infraestrutura + simulação; RF-09 adiado).

* Dashboard KPIs — **implementado** (Gestor/Admin).

* Integração externa API parceiro + webhook — **implementado** (substitui integração ERP planejada).

* Responsividade NF-03 — **evidenciado** (11 screenshots).

* Health checks + circuit breaker — **implementado** (NF-04, NF-08).

* Deploy HTTPS homologação — **implementado**.

* Testes ≥80% RN críticas — **implementado** (npm run test:critical).

## 1.10 EXCLUSÕES DO ESCOPO 

* App mobile nativo.

* Múltiplos tipos de sensores além de temperatura.

* Machine learning para predição.

* ERP comercial (SAP, TOTVS).

* Módulo financeiro completo.

1.11 STAKEHOLDERS ENVOLVIDOS

Desenvolvedor: Maykon Vanderson Siqueira Santos  
Administrador de Manutenção da Matriz  
Técnico de Manutenção da Filial  
Supervisor ou Gestor  
Auditor externo  
Professor orientador: Dennys Cavalcanti Carvalho

## 1.12 RISCOS INICIAIS  {#1.12-riscos-iniciais}

Foram identificados riscos iniciais que podem afetar o prazo, a qualidade ou a estabilidade do projeto. Para cada risco foi definida uma estratégia de mitigação visando reduzir sua probabilidade ou impacto. O acompanhamento desses riscos será realizado ao longo de todo o ciclo de desenvolvimento, com atualizações periódicas no relatório técnico. A tabela abaixo resume os principais riscos, seu impacto, probabilidade e respectivas ações de mitigação.

**Tabela 1 – Riscos iniciais do projeto**

| Risco | Impacto | Probabilidade | Mitigação |
| :---- | :---: | :---: | :---- |
| Validação da integração IoT sem hardware físico | Médio | Média | Script POST /iot/simular e painel /workspace/iot reproduzindo telemetria, ingestão, RabbitMQ e criação automática de OS preditiva |
| Indisponibilidade de webhook/API parceiro | Baixo | Baixa | Circuit breaker, fila RabbitMQ e retentativas automáticas |
| Falta de familiaridade com tecnologias (NestJS, RabbitMQ, Docker) | Médio | Média | Reservar as primeiras duas semanas para estudo guiado e protótipos simples antes de implementar módulos críticos |
| Problemas de deploy em ambiente de homologação | Médio | Baixa | Utilizar Docker Compose para ambiente reproduzível localmente e configurar pipeline de CI/CD com GitHub Actions para deploy automático |

Fonte: Produzido pelo autor.

"""


def rf_block(ctx, rid, title, desc, atores, prioridade, criterio):
    return f"""**CONTEXTO: {ctx}**

* [{rid}] {title}  
  {desc}

  Atores: {atores}.  
  Prioridade: {prioridade}

- Critério de aceitação: {criterio}

"""


def build_ers() -> str:
    intro = """# ERS

**2 DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS (ERS)**

## 2.1 REQUISITOS FUNCIONAIS {#2.1-requisitos-funcionais}

Requisitos funcionais definem as funcionalidades que o sistema deve realizar (Sommerville).

"""
    rfs = [
        ("Gestão de Identidade (IAM)", "RF-01", "Cadastro e Gerenciamento de Usuários",
         "O sistema deve permitir convite, edição, inativação e gestão de usuários por perfil corporativo e unidade fabril.",
         "Administrador e Gestor", "Essencial", "Administrador envia convite e usuário ativa acesso com confirmação."),
        ("Gestão de Identidade (IAM)", "RF-02", "Autenticação e Recuperação de Senha",
         "Login, logout, sessão HttpOnly e recuperação via Supabase em /workspace/acesso/redefinir-senha.",
         "Todos os usuários", "Essencial", "Login e recuperação funcionam em homologação HTTPS."),
        ("Gestão de Identidade (IAM)", "RF-03", "Controle de Acesso Granular (RBAC)",
         "Permissões por cargo (os.criar, dashboard.executivo, etc.) e escopo por unidade fabril.",
         "Administrador", "Essencial", "Usuários acessam apenas recursos permitidos (RN-08)."),
        ("Core Business (Gestão de Ativos)", "RF-04", "Cadastro e Gerenciamento de Ativos",
         "CRUD de ativos com status, limite térmico, geo, foto e documentos técnicos.",
         "Técnico, Supervisor e Gestor", "Essencial", "Ativo cadastrado com histórico de OS."),
        ("Core Business (Ordens de Serviço)", "RF-05", "Criação Manual de Ordens de Serviço",
         "Criação de OS com tipo, prioridade, técnico e vínculo obrigatório ao ativo.",
         "Supervisor e Técnico", "Essencial", "OS criada com campos obrigatórios validados."),
        ("Messageria e IoT", "RF-06", "Criação Automática de OS via IoT",
         "Leituras de temperatura (ThingSpeak/Adafruit IO → iot-ingestion) disparam OS preditiva após RN-01.",
         "Sistema (automático)", "Essencial", "Três leituras consecutivas acima do limite geram OS."),
        ("Core Business (Ordens de Serviço)", "RF-07", "Execução e Fechamento de Ordem de Serviço",
         "Execução, anexos, assinatura digital e consumo de peças no fechamento.",
         "Técnico", "Essencial", "OS fechada somente com foto e assinatura (RN-02)."),
        ("Inteligência de Dados", "RF-08", "Dashboard Executivo com KPIs",
         "MTBF, MTTR, OEE, % corretiva/preventiva/preditiva e custos.",
         "Gestor e Administrador", "Essencial", "KPIs calculados a partir de dados reais."),
        ("Inteligência de Dados / IoT", "RF-09", "Gráfico de Temperatura em Tempo Real",
         "Gráfico Recharts alimentado por WebSocket com leituras IoT.",
         "Gestor e Administrador", "Importante", "Adiado — infraestrutura IoT pronta, UI pendente."),
        ("Core Business", "RF-10", "Upload de Fotos e Documentos",
         "Upload de fotos (5–10 MB) e documentos (15 MB) em anexos de OS e ativos.",
         "Técnico", "Essencial", "Arquivo validado e persistido em Supabase Storage."),
        ("Messageria", "RF-11", "Notificações em Tempo Real",
         "Notificações in-app e push via WebSocket /realtime.",
         "Todos os usuários", "Essencial", "Notificação exibida ao criar/alterar OS."),
        ("Core Business", "RF-12", "Busca e Filtros Avançados",
         "Filtros server-side por status, técnico, ativo, data e tipo.",
         "Todos os usuários", "Importante", "Filtros combinados retornam resultados corretos."),
        ("Inteligência de Dados", "RF-13", "Exportação de Relatórios",
         "Exportação PDF/CSV de relatórios e estoque.",
         "Gestor e Administrador", "Importante", "Arquivo gerado e baixado."),
        ("Segurança e Conformidade", "RF-14", "Histórico Completo de Auditoria",
         "Consulta a logs MongoDB com quem, quando e valor anterior.",
         "Auditor e Gestor", "Essencial", "Histórico exibido e exportável (RN-12)."),
        ("Interoperabilidade", "RF-15", "Integração Externa (API Parceiro + Webhook)",
         "API REST com x-api-key para OS/ativos/KPIs e webhook outbound pós-fechamento.",
         "Sistema (automático)", "Essencial", "Parceiro consulta dados; webhook entregue com circuit breaker."),
        ("Gestão de Identidade", "RF-16", "Gerenciamento de Perfis e Permissões",
         "Configuração de cargos e permissões por empresa e unidade.",
         "Administrador", "Essencial", "Permissões aplicadas no backend."),
        ("Core Business", "RF-17", "Histórico de Manutenção por Ativo",
         "Listagem de OS vinculadas a cada ativo.",
         "Técnico, Supervisor e Gestor", "Essencial", "Histórico auditável na ficha do ativo."),
        ("Core Business", "RF-18", "Status em Tempo Real de Ordens de Serviço",
         "Atualização via WebSocket ordem_servico.status.",
         "Todos os usuários autorizados", "Essencial", "Status atualiza sem recarregar página."),
        ("IoT e Testes", "RF-19", "Simulação de Leitura de Temperatura",
         "POST /iot/simular para testes sem hardware.",
         "Operador de plataforma", "Importante", "Simulação dispara fluxo RN-01."),
        ("Core Business", "RF-20", "Consulta de OS por Filtro",
         "Query params em GET /unidades/:id/ordens-servico.",
         "Todos os usuários", "Importante", "Filtros combinados funcionam."),
        ("Inteligência de Dados", "RF-21", "Relatório de Manutenções por Período",
         "Relatório consolidado por período e unidade.",
         "Gestor e Administrador", "Importante", "Relatório com dados corretos."),
    ]
    body = intro + "".join(rf_block(*r) for r in rfs)

    nf = """## 2.2 REQUISITOS NÃO FUNCIONAIS {#2.2-requisitos-não-funcionais}

**CONTEXTO: Desempenho**

* [NF-01] Tempo de Resposta HTTP  
  Endpoints críticos devem responder em tempo aceitável em homologação.

  Verificação: script curl / evidências NF-01.  
  Prioridade: Essencial

- Critério de aceitação: Tempos registrados em docs/evidencias/NF-01-performance/ — **OK**.

**CONTEXTO: Segurança**

* [NF-02] Autenticação e Segurança HTTPS  
  JWT Supabase (HS256), sessão HttpOnly e varredura OWASP ZAP.

  Prioridade: Essencial

- Critério de aceitação: 0 vulnerabilidades High/Critical — **OK** (NF-02).

**CONTEXTO: Usabilidade**

* [NF-03] Interface Responsiva  
  Validação em desktop, tablet e mobile.

  Prioridade: Essencial

- Critério de aceitação: 11 screenshots em NF-03 — **OK**.

**CONTEXTO: Confiabilidade**

* [NF-04] Health Checks  
  GET /health valida PostgreSQL, MongoDB, RabbitMQ e Redis.

  Prioridade: Essencial

- Critério de aceitação: Resposta 200 com dependências up — **OK**.

* [NF-07] Disponibilidade em Homologação  
  Uptime superior a 99% monitorado externamente.

  Prioridade: Essencial

- Critério de aceitação: Sonda NF-07 com 100% — **OK**.

* [NF-08] Resiliência de Integrações  
  Circuit breaker no webhook outbound e filas RabbitMQ.

  Prioridade: Essencial

- Critério de aceitação: Teste unitário + evidência NF-08 — **OK**.

**CONTEXTO: Auditoria**

* [NF-05] Rastreabilidade em MongoDB  
  Logs com id_usuario, entidade, valor anterior/novo e data_hora.

  Prioridade: Essencial

- Critério de aceitação: Consulta e export CSV — **OK**.

* [NF-12] Logs Estruturados  
  Logs de aplicação em homologação para diagnóstico.

  Prioridade: Importante

- Critério de aceitação: Amostras coletadas em operação.

**CONTEXTO: Carga**

* [NF-06] Teste de Carga  
  Suporte a 50 usuários virtuais (k6).

  Prioridade: Importante

- Critério de aceitação: Relatório NF-06 — **OK** (local).

**CONTEXTO: Mídia**

* [NF-09] Upload de Arquivos  
  Fotos até 10 MB; documentos até 15 MB.

  Prioridade: Importante

- Critério de aceitação: Upload concluído sem erro de validação.

**CONTEXTO: Backup**

* [NF-10] Política de Backup  
  Backup PostgreSQL (Supabase) e MongoDB Atlas.

  Prioridade: Importante

- Critério de aceitação: Política documentada NF-10 — **OK**.

**CONTEXTO: Acessibilidade**

* [NF-11] Acessibilidade WCAG  
  Auditoria axe nos fluxos críticos.

  Prioridade: Importante

- Critério de aceitação: 0 critical/serious — **OK**.

"""

    rn = """## 2.3 REGRAS DE NEGÓCIO {#2.3-regras-de-negócio}

* [RN-01] Criação Automática de OS por Temperatura: três leituras consecutivas acima do limite do ativo (padrão 48°C) via IoT disparam OS preditiva.  
  Prioridade: Essencial

* [RN-02] Fechamento de OS: exige foto e assinatura digital do técnico.  
  Prioridade: Essencial

* [RN-03] Dashboard/KPIs: apenas Gestor e Admin (permissão dashboard.executivo).  
  Prioridade: Essencial

* [RN-04] Auditoria: registros críticos mantêm quem, quando e valor anterior em MongoDB.  
  Prioridade: Essencial

* [RN-05] Toda OS vinculada a ativo existente.  
  Prioridade: Essencial

* [RN-06] Limite térmico configurável por ativo (limite_temp).  
  Prioridade: Essencial

* [RN-07] Consumo de peças valida estoque antes do fechamento.  
  Prioridade: Essencial

* [RN-08] Isolamento de dados por unidade fabril.  
  Prioridade: Essencial

* [RN-09] Alerta crítico gera notificação a técnico e supervisor.  
  Prioridade: Essencial

* [RN-10] Ativo em manutenção não recebe nova OS até conclusão.  
  Prioridade: Essencial

* [RN-11] OS registra tempo de execução (abertura → fechamento).  
  Prioridade: Importante

* [RN-12] Exportação completa de logs de auditoria.  
  Prioridade: Importante

* [RN-13] OS corretiva exige foto do problema e da solução.  
  Prioridade: Essencial

* [RN-14] Ao finalizar OS, status do ativo atualizado automaticamente.  
  Prioridade: Essencial

* [RN-15] Após fechamento, dados principais imutáveis sem autorização de Gestor.  
  Prioridade: Essencial

* [RN-16] Admin de empresa não executa onboarding global; apenas operador de plataforma (x-platform-admin-key).  
  Prioridade: Essencial

"""
    return body + nf + rn


def build_dem_dict() -> str:
    tables = []
    tables.append(dict_table("empresa", "Armazena empresas clientes (multi-tenant).", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador da empresa."),
        ("nome_empresa", "String", "150", "Obrigatório", "-", "Razão social."),
        ("slug", "String", "120", "Único", "-", "Identificador URL do portal."),
        ("webhook_url", "String", "500", "Opcional", "-", "URL webhook outbound (RF-15)."),
        ("api_key_integracao", "String", "64", "Único, opcional", "-", "Chave API parceiro."),
        ("status", "Enum", "-", "Obrigatório", "ATIVA", "Status da empresa."),
    ]))
    tables.append(dict_table(
        "unidade_fabril",
        "Armazena as diferentes unidades ou plantas industriais do conglomerado [RN-08].",
        [
            ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador único da unidade fabril."),
            ("empresa_id", "String", "UUID", "FK empresa, opcional", "-", "Empresa proprietária (multi-tenant)."),
            ("nome", "String", "100", "Obrigatório, único por empresa", "-", "Nome descritivo (ex.: Matriz, Filial Norte)."),
            ("localizacao", "String", "255", "Obrigatório", "-", "Endereço ou coordenadas da unidade."),
            ("cep", "String", "9", "Opcional", "-", "CEP da unidade."),
            ("endereco", "String", "255", "Opcional", "-", "Logradouro."),
            ("numero_endereco", "String", "20", "Opcional", "-", "Número do endereço."),
            ("bairro", "String", "120", "Opcional", "-", "Bairro."),
            ("cidade", "String", "120", "Opcional", "-", "Cidade."),
            ("estado", "String", "2", "Opcional", "-", "UF."),
            ("complemento", "String", "120", "Opcional", "-", "Complemento do endereço."),
            ("referencia", "String", "255", "Opcional", "-", "Ponto de referência."),
            ("sla_corretiva_horas", "Int", "-", "Obrigatório", "24", "SLA corretiva em horas."),
            ("sla_preventiva_horas", "Int", "-", "Obrigatório", "168", "SLA preventiva em horas."),
            ("sla_preditiva_horas", "Int", "-", "Obrigatório", "72", "SLA preditiva em horas."),
            ("status", "Enum", "-", "Obrigatório", "ATIVA", "ATIVA ou INATIVA."),
            ("created_at", "DateTime", "-", "Obrigatório", "now()", "Data de criação do registro."),
            ("updated_at", "DateTime", "-", "Obrigatório", "updatedAt", "Data da última atualização."),
        ],
    ))
    tables.append(dict_table("usuario", "Perfil local vinculado ao Supabase Auth [RF-01, RF-02].", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador interno."),
        ("auth_sub", "String", "-", "Único", "-", "Subject JWT Supabase."),
        ("id_unidade", "String", "UUID", "FK unidade", "-", "Unidade de alocação [RN-08]."),
        ("nome", "String", "150", "Obrigatório", "-", "Nome do colaborador."),
        ("email", "String", "100", "Único", "-", "E-mail de login."),
        ("perfil", "Enum", "-", "Obrigatório", "-", "TECNICO, SUPERVISOR, GESTOR, AUDITOR, ADMIN."),
        ("status", "Enum", "-", "Obrigatório", "ATIVO", "Status do usuário."),
    ]))
    tables.append(dict_table("cargo", "Cargos corporativos com hierarquia [RF-16].", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador do cargo."),
        ("empresa_id", "String", "UUID", "FK empresa", "-", "Empresa do cargo."),
        ("nome", "String", "80", "Obrigatório", "-", "Nome do cargo."),
        ("nivel_hierarquia", "Int", "-", "Obrigatório", "0", "Nível hierárquico."),
    ]))
    tables.append(dict_table("permissao", "Catálogo global de permissões RBAC.", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador."),
        ("codigo", "String", "80", "Único", "-", "Ex.: os.criar, dashboard.executivo."),
        ("descricao", "String", "255", "Opcional", "-", "Descrição da permissão."),
    ]))
    tables.append(dict_table("convite_acesso", "Convites pendentes de onboarding.", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador."),
        ("email", "String", "100", "Obrigatório", "-", "E-mail convidado."),
        ("token_hash", "String", "-", "Obrigatório", "-", "Hash do token de ativação."),
        ("status", "Enum", "-", "Obrigatório", "PENDENTE", "PENDENTE, ACEITO, EXPIRADO."),
    ]))
    tables.append(dict_table("ativo", "Equipamentos monitorados [RF-04, RN-06].", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador do ativo."),
        ("id_unidade", "String", "UUID", "FK unidade", "-", "Unidade de instalação."),
        ("nome", "String", "100", "Obrigatório", "-", "Nome do equipamento."),
        ("status", "Enum", "-", "Obrigatório", "OPERACIONAL", "OPERACIONAL, MANUTENCAO, FALHA, INATIVO."),
        ("limite_temp", "Float", "-", "Obrigatório", "48", "Limite °C para OS preditiva."),
        ("latitude", "Float", "-", "Opcional", "-", "Coordenada para mapa."),
        ("longitude", "Float", "-", "Opcional", "-", "Coordenada para mapa."),
        ("foto_url", "String", "2048", "Opcional", "-", "URL foto principal."),
    ]))
    tables.append(dict_table("ordem_servico", "Intervenções manuais e automáticas [RF-05–07].", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador da OS."),
        ("id_ativo", "String", "UUID", "FK ativo", "-", "Ativo [RN-05]."),
        ("id_tecnico", "String", "UUID", "FK usuário, opcional", "-", "Técnico responsável."),
        ("tipo", "Enum", "-", "Obrigatório", "-", "CORRETIVA, PREVENTIVA, PREDITIVA."),
        ("status", "Enum", "-", "Obrigatório", "ABERTA", "ABERTA, AGUARDANDO, EM_EXECUCAO, CONCLUIDA, CANCELADA."),
        ("prioridade", "Enum", "-", "Obrigatório", "MEDIA", "BAIXA, MEDIA, ALTA, CRITICA."),
        ("assinatura_digital", "Text", "-", "Obrigatório no fecho", "-", "Assinatura [RN-02]."),
        ("data_abertura", "DateTime", "-", "Obrigatório", "now()", "Data de abertura."),
        ("data_fechamento", "DateTime", "-", "Opcional", "-", "Data de conclusão."),
    ]))
    tables.append(dict_table("peca", "Estoque de peças por unidade [RN-07].", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador."),
        ("codigo", "String", "80", "Único por unidade", "-", "Código da peça."),
        ("nome", "String", "150", "Obrigatório", "-", "Descrição."),
        ("quantidade_estoque", "Int", "-", "Obrigatório", "0", "Saldo atual."),
        ("quantidade_minima", "Int", "-", "Obrigatório", "0", "Estoque mínimo."),
    ]))
    tables.append(dict_table("ordem_servico_peca", "Peças consumidas em uma OS.", [
        ("ordem_servico_id", "String", "UUID", "FK OS", "-", "OS referência."),
        ("peca_id", "String", "UUID", "FK peça", "-", "Peça consumida."),
        ("quantidade", "Int", "-", "Obrigatório", "-", "Quantidade utilizada."),
    ]))
    tables.append(dict_table("notificacao", "Notificações in-app [RF-11].", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador."),
        ("usuario_id", "String", "UUID", "FK usuário", "-", "Destinatário."),
        ("titulo", "String", "180", "Obrigatório", "-", "Título da notificação."),
        ("mensagem", "String", "1000", "Obrigatório", "-", "Corpo da mensagem."),
        ("lida_em", "DateTime", "-", "Opcional", "-", "Data de leitura."),
    ]))
    tables.append(dict_table("integracao_evento", "Fila de eventos de integração webhook.", [
        ("id", "String", "UUID", "Chave primária", "uuid()", "Identificador."),
        ("empresa_id", "String", "UUID", "FK empresa", "-", "Empresa origem."),
        ("tipo", "String", "40", "Obrigatório", "-", "Tipo do evento."),
        ("status", "String", "20", "Obrigatório", "-", "PENDENTE, ENVIADO, FALHA."),
        ("payload", "JSON", "-", "Obrigatório", "-", "Dados enviados ao parceiro."),
    ]))
    tables.append(dict_table("log_auditoria (MongoDB)", "Trilha de auditoria fora do PostgreSQL [RF-14, NF-05].", [
        ("id_log", "String", "UUID", "Chave primária", "uuid()", "Identificador do log."),
        ("id_usuario", "String", "UUID", "Obrigatório", "-", "Autor da ação."),
        ("entidade_afetada", "String", "50", "Obrigatório", "-", "Entidade alterada."),
        ("valor_anterior", "JSON", "-", "Obrigatório", "-", "Estado anterior [RN-04]."),
        ("valor_novo", "JSON", "-", "Obrigatório", "-", "Estado posterior."),
        ("data_hora", "DateTime", "-", "Obrigatório", "now()", "Timestamp da ação."),
    ]))
    return "\n".join(tables)


def build_dem() -> str:
    parts = ["""# DEM

# **3 DOCUMENTO DE ESPECIFICAÇÃO DE MODELAGEM (DEM)**  {#3-documento-de-especificação-de-modelagem-(dem)}

## 3.1 MODELAGEM DE DADOS {#3.1-modelagem-de-dados}

### **3.1.1 Entidade-Relacionamento** {#3.1.1-entidade-relacionamento}

Baseado nos módulos IAM, Core Business, Auditoria (MongoDB) e Integração.

"""]
    parts.append(fig(1, "Panorama geral diagrama entidade relacionamento modelo lógico", True))
    for i, dim in enumerate([
        "dimensão superior esquerda", "dimensão superior direita",
        "dimensão inferior esquerda", "dimensão inferior direita"
    ], 2):
        parts.append(fig(i, f"Diagrama entidade relacionamento modelo lógico ({dim})", quadrant=True))

    parts.append("### **3.1.2 Dicionário de Dados**  {#3.1.2-dicionário-de-dados}\n\n")
    parts.append(build_dem_dict())

    parts.append("""## 3.2 MODELAGEM COMPORTAMENTAL  {#3.2-modelagem-comportamental}

### **3.2.1 Diagrama de Sequência (Criação Automática de OS via IoT)** {#3.2.1-diagrama-de-sequência-(criação-automática-de-os-via-iot)}

Representa [RF-06] e [RN-01]: ESP32 lê DHT22 → ThingSpeak/Adafruit IO → POST /iot/leituras → RabbitMQ → worker cria OS preditiva → notificação WebSocket.

""")
    parts.append(fig(6, "Diagrama de sequência autenticação Supabase e sessão HttpOnly", False))
    parts.append(fig(7, "Diagrama de sequência ingestão IoT e criação de OS preditiva", False))
    parts.append(fig(8, "Diagrama de sequência fechamento de OS e webhook outbound", False))

    parts.append("""### **3.2.2 Diagrama de Estados (Ciclo de Vida da OS)** {#3.2.2-diagrama-de-estados-(ciclo-de-vida-da-os)}

Reflete [RN-02], [RN-13], [RN-14], [RN-15]. Estados: ABERTA → AGUARDANDO → EM_EXECUCAO → CONCLUIDA ou CANCELADA.

""")
    parts.append(fig(9, "Panorama geral diagrama de estados ciclo de vida da OS", True))
    for i, dim in enumerate(["dimensão superior direita", "dimensão inferior esquerda", "dimensão inferior direita"], 10):
        parts.append(fig(i, f"Diagrama de estados ({dim})", quadrant=True))

    parts.append("""## 3.3 MODELAGEM ESTRUTURAL {#3.3-modelagem-estrutural}

### **3.3.1 Diagrama de Caso de Uso**	 {#3.3.1-diagrama-de-caso-de-uso}

Atores: Técnico, Supervisor, Gestor, Auditor, Admin, Operador de Plataforma, Sistema IoT.

""")
    # Reuse image7 for use case panorama if needed - use empty for new figures 13+
    parts.append("""Figura 13 \\- Panorama geral diagrama de caso de uso

| ![][image7] |
| :---: |

Fonte: Produzido pelo autor.

""")
    for i, dim in enumerate(["dimensão superior esquerda", "dimensão inferior esquerda", "dimensão inferior direita"], 14):
        parts.append(fig(i, f"Diagrama de caso de uso ({dim})", quadrant=True))

    parts.append("""### **3.3.2 Diagrama de Componentes (Arquitetura Hexagonal)** {#3.3.2-diagrama-de-componentes-(arquitetura-hexagonal)}

Camadas domain, application, infrastructure e presentation no backend NestJS.

""")
    parts.append("""Figura 17 \\- Panorama geral do diagrama de componentes

| ![][image8] |
| :---: |

Fonte: Produzido pelo autor.

""")
    for i, dim in enumerate(["dimensão inferior esquerda", "dimensão direita"], 18):
        parts.append(fig(i, f"Diagrama de componentes ({dim})", quadrant=True))

    parts.append("""### **3.3.3 Diagrama de Arquitetura (Infraestrutura)**	 {#3.3.3-diagrama-de-arquitetura-(infraestrutura)}

Vercel, Render (API, worker-events, iot-ingestion), Supabase, Atlas, CloudAMQP, Upstash, ThingSpeak/Adafruit IO.

""")
    parts.append("""Figura 20 \\- Panorama geral do diagrama de arquitetura

| ![][image9] |
| :---: |

Fonte: Produzido pelo autor.

""")
    for i, dim in enumerate(["dimensão superior esquerda", "dimensão inferior direita", "dimensão superior direita"], 21):
        parts.append(fig(i, f"Diagrama de arquitetura ({dim})", quadrant=True))

    parts.append("""## 3.4 MAPEAMENTO OBJETO-RELACIONAL (ORM) {#3.4-mapeamento-objeto-relacional-(orm)}

O projeto adota **Prisma ORM** sobre PostgreSQL. Domínio não importa @prisma/client diretamente (hexagonal). Exemplo:

```prisma
model Ativo {
  id         String   @id @default(uuid())
  idUnidade  String   @map("id_unidade")
  nome       String
  status     StatusAtivo @default(OPERACIONAL)
  limiteTemp Float    @default(48) @map("limite_temp")
}
```

""")
    for i, dim in enumerate(["panorama geral mapeamento objeto relacional Prisma", "dimensão superior esquerda", "dimensão superior direita", "dimensão inferior direita"], 24):
        parts.append(fig(i, f"Mapeamento objeto relacional ({dim})", quadrant="dimensão" in dim))

    parts.append("""## 3.5 BPMN (BUSINESS PROCESS MODEL AND NOTATION) {#3.5-bpmn-(business-process-model-and-notation)}

Fluxo: leitura IoT → RN-01 → OS preditiva → execução → fechamento com evidências → webhook/API parceiro.

""")
    parts.append("""Figura 28 \\- Panorama geral business process model and notation manutenção preditiva

| ![][image10] |
| :---: |

Fonte: Produzido pelo autor.

""")
    for i, dim in enumerate(["dimensão superior esquerda", "dimensão superior direita"], 29):
        parts.append(fig(i, f"BPMN manutenção preditiva ({dim})", quadrant=True))

    return "\n".join(parts)


def build_dei() -> str:
    wireframes = [
        (40, "Wireframe de login corporativo (plataforma web)"),
        (41, "Wireframe de home por perfil (plataforma web)"),
        (42, "Wireframe de lista de ordens de serviço (plataforma web)"),
        (43, "Wireframe de agenda de ordens (plataforma web)"),
        (44, "Wireframe de detalhe e fechamento de OS (plataforma web)"),
        (45, "Wireframe de lista de ativos (plataforma web)"),
        (46, "Wireframe de mapa de ativos (plataforma web)"),
        (47, "Wireframe de dashboard executivo (plataforma web)"),
        (48, "Wireframe de peças e estoque (plataforma web)"),
        (49, "Wireframe de auditoria (plataforma web)"),
        (50, "Wireframe de notificações (plataforma web)"),
        (51, "Wireframe de administração e convites (plataforma web)"),
        (52, "Wireframe de integrações (plataforma web)"),
        (53, "Wireframe de status IoT (plataforma web)"),
        (54, "Wireframe de perfil do usuário (plataforma web)"),
    ]
    mockups = [
        (55, "Mockup login homologação (plataforma web)"),
        (56, "Mockup lista de ordens (plataforma web)"),
        (57, "Mockup detalhe de OS (plataforma web)"),
        (58, "Mockup dashboard KPIs (plataforma web)"),
        (59, "Mockup mapa de ativos (plataforma web)"),
        (60, "Mockup auditoria (plataforma web)"),
        (61, "Mockup administração (plataforma web)"),
        (62, "Mockup responsivo mobile (plataforma web)"),
    ]
    parts = ["""# DEI

**4 DOCUMENTO DE ESPECIFICAÇÃO DE INTERFACES (DEI)** {#4-documento-de-especificação-de-interfaces-(dei)}

## 4.1 WIREFRAMES {#4.1-wireframes}

Wireframes das principais telas da plataforma web corporativa.

"""]
    for n, t in wireframes:
        parts.append(fig(n, t, False))
    parts.append("## 4.2 MOCKUPS {#4.2-mockups}\n\nMockups de telas do sistema em ambiente de homologação, com identidade visual corporativa (azul petróleo e grafite).\n\n")
    for n, t in mockups:
        parts.append(fig(n, t, False))
    parts.append("""## 4.3 FLUXO DE NAVEGAÇÃO {#4.3-fluxo-de-navegação}

""")
    parts.append(fig(63, "Fluxo de navegação técnico e supervisor (plataforma web)", False))
    parts.append(fig(64, "Fluxo de navegação gestor, auditor e administrador (plataforma web)", False))
    parts.append("""
**Técnico:** /workspace/acesso → /workspace → /workspace/ordens → detalhe → fechar.

**Supervisor:** /workspace/ordens → nova OS → atribuir técnico → filtros.

**Gestor:** /workspace/dashboard → /workspace/relatorios.

**Auditor:** /workspace/auditoria → export CSV.

**Admin:** /workspace/admin → convites → /workspace/permissoes → /workspace/integracoes.

Fonte: Produzido pelo autor.

""")
    return "\n".join(parts)


def build_tech() -> str:
    from importlib.util import module_from_spec, spec_from_file_location

    patch_path = Path(__file__).resolve().parent / "patch-pdsob-appendix-tech.py"
    spec = spec_from_file_location("patch_pdsob", patch_path)
    mod = module_from_spec(spec)
    spec.loader.exec_module(mod)

    return f"""# DOC TECNICA

**5 DOCUMENTAÇÃO TÉCNICA** {{#5-documentação-técnica}}

**5.1 ARQUITETURA DO SISTEMA** {{#5.1-arquitetura-do-sistema}}
Monorepo TypeScript: backend/ (NestJS hexagonal), frontend/ (Next.js), services/iot-ingestion, services/worker-events, packages/contracts e packages/messaging.

Persistência dual: PostgreSQL (negócio via Prisma/Supabase) e MongoDB (auditoria). Mensageria: RabbitMQ (exchange manucmms.events). Cache/contadores IoT: Redis.

**5.1.1 Segmentação da Arquitetura** {{#5.1.1-segmentação-da-arquitetura}}
| Módulo | Descrição | Componentes |
| :---- | :---- | :---- |
| IAM | Identidade e acesso | Supabase Auth, convites, RBAC, escopo unidade |
| Core Business | Núcleo operacional | Ativos, OS, peças, SLA, anexos |
| Messageria | Eventos e notificações | RabbitMQ, WebSocket, e-mail, webhook |
| Dashboard | Indicadores gerenciais | KPIs e relatórios executivos |
| Auditoria | Rastreabilidade | MongoDB, consulta e exportação |

{mod.TECH_SECTION}
**5.3 REPOSITÓRIO E CÓDIGO-FONTE** {{#5.3-repositório-e-código-fonte}}

Repositório: https://github.com/maykonzx7/ManuCMMS

```bash
docker compose up -d
cd backend && npm install && npx prisma migrate deploy && npm run start:dev
cd frontend && npm install && npm run dev
```

Homologação: https://manucmms.vercel.app — API: https://manucmms.onrender.com/health

Fonte: Produzido pelo autor.

"""


def manual_sub(title: str, fig_num: int) -> str:
    return f"""**{title}**

Figura {fig_num} \\- Manual do usuário

|  |
| :---: |

Fonte: Produzido pelo autor.

"""


def build_manual() -> str:
    parts = ["""# MANUAL

**6 MANUAL DO USUÁRIO** {#6-manual-do-usuário}

| Requisitos para acesso: ● Navegador: Chrome, Edge ou Firefox atualizados. ● Resolução: 1366×768 ou superior. ● URL: https://manucmms.vercel.app/workspace/acesso ● Credenciais: e-mail e senha do convite Supabase (acesso por convite). |
| :---- |

## 6.1 ACESSO E AUTENTICAÇÃO

"""]
    fn = 101
    for t in [
        "6.1.1 Como acessar a plataforma web",
        "6.1.2 Como recuperar a senha",
        "6.1.3 Como aceitar um convite de acesso",
        "6.1.4 Como sair do sistema",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("## 6.2 FLUXO TÉCNICO DE MANUTENÇÃO\n\n")
    for t in [
        "6.2.1 Como visualizar minhas ordens de serviço",
        "6.2.2 Como iniciar a execução de uma OS",
        "6.2.3 Como anexar fotos e evidências",
        "6.2.4 Como assinar e fechar uma ordem de serviço",
        "6.2.5 Como consultar histórico de manutenção do ativo",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("## 6.3 FLUXO SUPERVISOR\n\n")
    for t in [
        "6.3.1 Como criar uma ordem de serviço",
        "6.3.2 Como atribuir técnico responsável",
        "6.3.3 Como filtrar ordens por status e período",
        "6.3.4 Como acompanhar notificações de SLA",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("## 6.4 FLUXO GESTOR\n\n")
    for t in [
        "6.4.1 Como acessar o dashboard executivo",
        "6.4.2 Como exportar relatórios PDF e CSV",
        "6.4.3 Como analisar KPIs MTBF, MTTR e OEE",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("## 6.5 FLUXO AUDITOR\n\n")
    for t in [
        "6.5.1 Como consultar logs de auditoria",
        "6.5.2 Como exportar trilha de auditoria em CSV",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("## 6.6 FLUXO ADMINISTRADOR\n\n")
    for t in [
        "6.6.1 Como convidar novos usuários",
        "6.6.2 Como configurar cargos e permissões",
        "6.6.3 Como cadastrar unidades fabris",
        "6.6.4 Como configurar webhook e chave API parceiro",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("## 6.7 FLUXO OPERADOR DE PLATAFORMA\n\n")
    for t in [
        "6.7.1 Como acessar o console de plataforma",
        "6.7.2 Como verificar status do serviço IoT",
        "6.7.3 Como simular leitura de temperatura",
    ]:
        parts.append(manual_sub(t, fn))
        fn += 1

    parts.append("""## 6.8 GLOSSÁRIO DE MENSAGENS E ALERTAS

| N. | Tipo | Mensagem exibida | O que significa | O que fazer | Local |
| :---: | :---- | :---- | :---- | :---- | :---- |
| 1 | Sucesso | Login realizado com sucesso! | Autenticação Supabase OK | Prosseguir para /workspace | Web |
| 2 | Erro | Falha ao autenticar | Credenciais inválidas ou convite pendente | Verificar e-mail/senha ou convite | Web |
| 3 | Erro | Sessão expirada | Token JWT expirou | Fazer login novamente | Web |
| 4 | Erro | Falha ao enviar anexo | Arquivo excede limite ou tipo inválido | Usar foto ≤10 MB ou doc ≤15 MB | Web |
| 5 | Erro | Falha ao fechar ordem | Evidências ou assinatura ausentes (RN-02) | Completar fotos e assinatura | Web |
| 6 | Erro | Estoque insuficiente | Peça sem saldo (RN-07) | Ajustar quantidade ou repor estoque | Web |
| 7 | Sucesso | Ordem fechada com sucesso | OS concluída; ativo atualizado (RN-14) | Nenhuma ação | Web |
| 8 | Erro | Erro ao carregar dashboard | API indisponível ou sem permissão (RN-03) | Verificar perfil Gestor/Admin | Web |
| 9 | Erro | Falha ao carregar dados de IoT | iot-ingestion offline | Verificar /integracoes/status | Web |
| 10 | Sucesso | Convite enviado | E-mail de convite disparado via Brevo | Aguardar ativação do usuário | Web |

Fonte: Produzido pelo autor.

## 6.9 PERGUNTAS FREQUENTES (FAQ)

| Pergunta | Resposta |
| :---- | :---- |
| Esqueci minha senha. Como recupero? | Use o link "Esqueci minha senha" em /workspace/acesso/redefinir-senha (fluxo Supabase). |
| Não recebi convite de acesso. | Solicite ao Administrador da empresa reenvio em /workspace/admin. |
| Não vejo o dashboard executivo. | Apenas Gestor e Admin com permissão dashboard.executivo (RN-03). |
| Não consigo fechar a OS. | Verifique foto, assinatura (RN-02) e, se corretiva, fotos problema/solução (RN-13). |
| O estoque não permite fechar a OS. | Confira saldo da peça em /workspace/pecas (RN-07). |
| Minha sessão expirou. | Faça login novamente em /workspace/acesso. |
| Como integrar sistema externo? | Admin configura webhook e API key em /workspace/integracoes; parceiro usa x-api-key. |
| Como funciona o IoT? | Sensor DHT22 no ESP32 publica em ThingSpeak/Adafruit IO; ManuCMMS ingere via /iot/leituras. |

Fonte: Produzido pelo autor.

""")
    return "\n".join(parts)


def build_refs() -> str:
    return """# REFS

**7 REFERÊNCIAS** {#7-referências}

ABRAMAN – ASSOCIAÇÃO BRASILEIRA DE MANUTENÇÃO E GESTÃO DE ATIVOS. **Documento Nacional 2024**: Pesquisa da situação da manutenção e da gestão de ativos nas empresas no Brasil. São Paulo: ABRAMAN, 2024. Disponível em: https://abramanoficial.org.br/publicacoes/documento-nacional. Acesso em: 26 mar. 2026.

ABECom – ASSOCIAÇÃO BRASILEIRA DE ENGENHARIA DE CUSTOS. **Alto custo de manutenção de equipamentos**: veja 10 motivos. 2024. Disponível em: https://www.abecom.com.br/custo-de-manutencao-alto/. Acesso em: 26 mar. 2026.

TRACTIAN. **TMD Awards 2024**: os projetos vencedores que estão transformando a manutenção industrial. 2025. Disponível em: https://tractian.com/blog/tmd-awards-2024-vencedores. Acesso em: 26 mar. 2026.

NESTJS. **Documentation**. Disponível em: https://docs.nestjs.com. Acesso em: 10 jun. 2026.

NEXT.JS. **Documentation**. Disponível em: https://nextjs.org/docs. Acesso em: 10 jun. 2026.

PRISMA. **ORM Reference**. Disponível em: https://www.prisma.io/docs. Acesso em: 10 jun. 2026.

SUPABASE. **Auth and Database**. Disponível em: https://supabase.com/docs. Acesso em: 10 jun. 2026.

MATHWORKS. **ThingSpeak Documentation**. Disponível em: https://www.mathworks.com/help/thingspeak/. Acesso em: 10 jun. 2026.

ADAFRUIT. **Adafruit IO**. Disponível em: https://io.adafruit.com. Acesso em: 10 jun. 2026.

"""


def build_appendix() -> str:
    from importlib.util import module_from_spec, spec_from_file_location

    patch_path = Path(__file__).resolve().parent / "patch-pdsob-appendix-tech.py"
    spec = spec_from_file_location("patch_pdsob_app", patch_path)
    mod = module_from_spec(spec)
    spec.loader.exec_module(mod)

    head = """# APENDICE

**8 APÊNDICE** {#8-apêndice}

APÊNDICE A \\- CÓDIGO FONTE DO DIAGRAMA DE CLASSES (PLANTUML)

@startuml
skinparam classAttributeIconSize 0

enum PerfilUsuario { TECNICO SUPERVISOR GESTOR AUDITOR ADMIN }
enum StatusAtivo { OPERACIONAL MANUTENCAO FALHA INATIVO }
enum StatusOrdemServico { ABERTA AGUARDANDO EM_EXECUCAO CONCLUIDA CANCELADA }
enum TipoOrdemServico { CORRETIVA PREVENTIVA PREDITIVA }

class Empresa { id: UUID nomeEmpresa: String slug: String webhookUrl: String apiKeyIntegracao: String }
class UnidadeFabril { id: UUID nome: String localizacao: String }
class Usuario { id: UUID authSub: String email: String perfil: PerfilUsuario }
class Ativo { id: UUID nome: String status: StatusAtivo limiteTemp: Float }
class OrdemServico { id: UUID tipo: TipoOrdemServico status: StatusOrdemServico assinaturaDigital: String }
class Peca { id: UUID codigo: String quantidadeEstoque: Int }

Empresa "1" -- "*" UnidadeFabril
UnidadeFabril "1" -- "*" Usuario
UnidadeFabril "1" -- "*" Ativo
Ativo "1" -- "*" OrdemServico
Usuario "1" -- "*" OrdemServico : executa
Peca .. OrdemServico : consumo RN-07
note right of LogAuditoria : Persistido em MongoDB\\n(nao em PostgreSQL)
@enduml

APÊNDICE B \\- CÓDIGO FONTE DOS DIAGRAMAS DE SEQUÊNCIA (PLANTUML)

@startuml
actor Usuario
participant Frontend
participant Supabase
participant API
Usuario -> Frontend : email/senha
Frontend -> Supabase : signIn
Supabase --> Frontend : JWT
Frontend -> API : POST /auth/session
API --> Frontend : cookie HttpOnly
@enduml

@startuml
participant ESP32
participant ThingSpeak
participant IotIngestion
participant RabbitMQ
participant Worker
participant API
ESP32 -> ThingSpeak : temperatura
ThingSpeak -> IotIngestion : POST /iot/leituras
IotIngestion -> RabbitMQ : evento leitura
RabbitMQ -> Worker : consumer RN-01
Worker -> API : criar OS preditiva
@enduml

@startuml
participant Tecnico
participant Frontend
participant API
participant Webhook
Tecnico -> Frontend : evidencias e assinatura
Frontend -> API : PATCH fechar OS
API --> Frontend : OS CONCLUIDA
API -> Webhook : evento outbound RF-15
@enduml

APÊNDICE C \\- CÓDIGO FONTE DO DIAGRAMA DE ESTADOS (PLANTUML)

@startuml
[*] --> ABERTA
ABERTA --> AGUARDANDO : aguardar recurso
AGUARDANDO --> EM_EXECUCAO : iniciar
ABERTA --> EM_EXECUCAO : iniciar
EM_EXECUCAO --> CONCLUIDA : fechar RN-02
ABERTA --> CANCELADA : cancelar
EM_EXECUCAO --> CANCELADA : cancelar
CONCLUIDA --> [*]
CANCELADA --> [*]
@enduml

APÊNDICE D \\- CÓDIGO FONTE DO DIAGRAMA DE ARQUITETURA (PLANTUML)

@startuml
cloud Vercel { [Next.js Frontend] }
cloud Render { [manucmms-api] [worker-events] [iot-ingestion] }
database Supabase { [PostgreSQL] [Auth] [Storage] }
database Atlas { [MongoDB audit] }
queue CloudAMQP { [RabbitMQ] }
cloud Upstash { [Redis] }
cloud IoTCloud { [ThingSpeak/AdafruitIO] }
[Next.js Frontend] --> [manucmms-api]
[ESP32] --> IoTCloud
IoTCloud --> [iot-ingestion]
[iot-ingestion] --> CloudAMQP
[manucmms-api] --> Supabase
[manucmms-api] --> Atlas
@enduml

APÊNDICE E \\- CÓDIGO FONTE DO DIAGRAMA DE COMPONENTES (PLANTUML)

@startuml
package Presentation { [Controllers] [WebSocketGateway] }
package Application { [UseCases] }
package Domain { [Entities] [Ports] }
package Infrastructure { [PrismaRepos] [MongoAudit] [RabbitMQ] [BrevoEmail] }
Presentation --> Application
Application --> Domain
Infrastructure ..|> Domain : implements Ports
@enduml

APÊNDICE F \\- CÓDIGO FONTE DO DIAGRAMA DE CASO DE USO (PLANTUML)

@startuml
left to right direction
actor Tecnico
actor Supervisor
actor Gestor
actor Auditor
actor Admin
Tecnico --> (Executar OS)
Supervisor --> (Criar OS)
Gestor --> (Ver Dashboard)
Auditor --> (Consultar Auditoria)
Admin --> (Gerenciar Usuarios)
@enduml

APÊNDICE G \\- CÓDIGO FONTE DO BPMN (PLANTUML)

@startuml BPMN_Manutencao_Preditiva
start
:Leitura temperatura IoT;
if (3 leituras > limite?) then (sim)
  :Criar OS preditiva;
  :Notificar tecnico;
else (nao)
  :Continuar monitoramento;
endif
:Executar e fechar OS;
:Webhook/API parceiro;
stop
@enduml

"""
    return head + mod.APPENDIX_H_K


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        original = f.read()
    idx = original.find("\n[image1]:")
    images = original[idx:] if idx != -1 else ""

    doc = (
        build_header()
        + build_dde()
        + build_ers()
        + build_dem()
        + build_dei()
        + build_tech()
        + build_manual()
        + build_refs()
        + build_appendix()
        + images
    )
    OUT.write_text(doc, encoding="utf-8")
    print(f"Written {len(doc)} chars to {OUT}")


if __name__ == "__main__":
    main()
