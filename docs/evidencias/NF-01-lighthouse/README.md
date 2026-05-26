# NF-01 / NF-11 — Lighthouse (performance e acessibilidade)

**Data:** 26/05/2026  
**Meta DDE:** Lighthouse ≥ 90 em Performance, Acessibilidade e Best Practices nas páginas críticas.

## Pré-requisito

O **Lighthouse CLI só roda com Chrome/Chromium** (protocolo DevTools). O Firefox do dia a dia **não substitui** esse passo — use o Chromium só em modo headless para gerar os relatórios; você continua usando Firefox normalmente.

```bash
# Arch/CachyOS — pacote separado do Firefox, só para a coleta
sudo pacman -S chromium
test -x /usr/bin/chromium || { echo "Chromium não instalado em /usr/bin/chromium"; exit 1; }
export CHROME_PATH=/usr/bin/chromium
```

### Se você usa Firefox e não quer instalar Chromium

| Objetivo | Alternativa no Firefox |
|----------|------------------------|
| NF-11 (acessibilidade) | Extensão [axe DevTools](https://addons.mozilla.org/firefox/addon/axe-devtools/) nas páginas login / criar OS / fechar OS |
| NF-01 (performance Lighthouse) | Não há equivalente automatizado no script; instale Chromium **ou** rode Lighthouse no Chrome/Chromium de outra máquina/CI contra a mesma URL |

Anexe prints ou export da axe para NF-11; para NF-01 a defesa costuma pedir os `.report.html` do Lighthouse.

## Execução automatizada

```bash
./scripts/collect-nf-evidence.sh
```

Relatórios gerados em:

- `NF-01-lighthouse/acesso-desktop.report.html`
- `NF-01-lighthouse/acesso-mobile.report.json`
- `NF-01-lighthouse/convite-desktop.report.html`
- `resumo-scores.json` (consolidado)

## Páginas avaliadas (fase 1 — públicas)

| Página | URL local | Motivo |
|--------|-----------|--------|
| Login | `/workspace/acesso` | Primeiro contato; NF-01/NF-11 |
| Convite | `/workspace/convite` | Onboarding; formulário acessível |

## Páginas autenticadas (fase 2 — manual)

Lighthouse CLI não autentica facilmente. Para dashboard e lista de OS:

1. Login no browser.
2. DevTools → Lighthouse → **Navigation** → Analyze page load.
3. Repetir em `/workspace` (gestor) e `/workspace/ordens`.

Anexar PDF exportado do Lighthouse DevTools.

## NF-11 (acessibilidade)

Usar a mesma execução Lighthouse (categoria **Accessibility**) ou extensão **axe DevTools** nos fluxos:

- Login
- Criar OS
- Fechar OS (modal assinatura)

Registrar issues críticas = 0 para aceite.

## Status desta coleta

| Item | Status |
|------|--------|
| Script `collect-nf-evidence.sh` | Pronto |
| Relatórios HTML/JSON | **Pendente Chrome** neste ambiente |
| Procedimento manual autenticado | Documentado acima |

## Conclusão

Infraestrutura de evidência **pronta**; executar script com Chrome instalado e anexar relatórios antes da defesa.
