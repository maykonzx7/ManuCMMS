# NF-03 — Responsividade (multi-dispositivo)

**Data:** 26/05/2026  
**Critério ERS:** layout utilizável em mobile, tablet e desktop (NF-03).

## Matriz de verificação

| Viewport | Largura | Páginas críticas | Resultado esperado | Evidência |
|----------|---------|------------------|--------------------|-----------|
| Mobile | 360×800 | Login, Home técnico, Lista OS | Sidebar colapsável; tabelas com scroll horizontal; botões tocáveis (≥44px) | Screenshot manual |
| Tablet | 768×1024 | Dashboard gestor, Detalhe OS | Grid 2 colunas; breadcrumbs visíveis | Screenshot manual |
| Desktop | 1280×800 | Integrações, Auditoria | Sidebar expandida; KPIs em grid 4 colunas | Screenshot manual |

## Páginas prioritárias DDE

1. `/workspace/acesso` — portal de login (público)
2. `/workspace` — home (técnico ou executivo conforme perfil)
3. `/workspace/ordens` — listagem principal
4. `/workspace/ordens/[id]` — detalhe + fechamento com assinatura
5. `/workspace/integracoes` — config webhook/API key

## Recursos implementados que suportam NF-03

- Sidebar colapsável (`collapsible="icon"`) — `app-sidebar.tsx`
- Layout dashboard com grids responsivos (`md:`, `lg:` breakpoints)
- Formulários de login em coluna única em mobile — `(auth)/layout.tsx`
- Tabelas OS com overflow scroll em telas estreitas

## Procedimento DevTools (Chrome)

Para cada viewport da matriz:

1. Abrir DevTools → Toggle device toolbar.
2. Selecionar preset ou dimensão customizada.
3. Navegar pelas 5 páginas prioritárias autenticado.
4. Capturar screenshot (`Ctrl+Shift+P` → "Capture screenshot").
5. Salvar em `docs/evidencias/NF-03-screenshots/` (criar pasta no dia da defesa).

## Checklist de aceitação

- [ ] Nenhum texto cortado ou sobreposto em 360px
- [ ] Menu hamburger / sidebar acessível em mobile
- [ ] Formulário de assinatura (canvas) utilizável em touch
- [ ] Cards de integração empilham verticalmente em mobile
- [ ] Breadcrumbs ocultos em mobile (`hidden md:flex`) — comportamento intencional

## Conclusão

**Parcialmente evidenciado** — matriz e checklist prontos; anexar screenshots na pasta indicada antes da apresentação DDE.
