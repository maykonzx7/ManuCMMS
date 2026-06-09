# NF-03 — Screenshots responsivos

**Data:** 08/06/2026  
**Frontend:** `https://manucmms.vercel.app`

## Viewports capturados

| Viewport | Arquivos |
|----------|----------|
| 360×800 (mobile) | `acesso-360`, `convite-360`, `workspace-360`, `ordens-360` |
| 768×1024 (tablet) | `acesso-768`, `workspace-768`, `ordens-768` |
| 1280×800 (desktop) | `acesso-1280`, `workspace-1280`, `ordens-1280`, `integracoes-1280` |

Manifesto: `manifest-2026-06-08.json`

## Regenerar

```bash
# Playwright (recomendado)
NF_TOOLS_DIR=/tmp/manucmms-nf-tools npm install --prefix $NF_TOOLS_DIR --no-save playwright
$NF_TOOLS_DIR/node_modules/.bin/playwright install chromium
NODE_PATH=$NF_TOOLS_DIR/node_modules FRONTEND_BASE_URL=https://manucmms.vercel.app \
  node scripts/nf-playwright-screenshots.mjs
```

Rotas protegidas redirecionam para login — evidência de shell responsivo e páginas públicas.
