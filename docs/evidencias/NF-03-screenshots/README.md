# NF-03 — Screenshots de responsividade

Salve capturas nesta pasta conforme a matriz em [NF-03-responsividade.md](../NF-03-responsividade.md).

## Nomenclatura sugerida

| Arquivo | Viewport | Página |
|---------|----------|--------|
| `acesso-360.png` | 360×800 | Login |
| `ordens-360.png` | 360×800 | Lista OS |
| `dashboard-768.png` | 768×1024 | Home gestor |
| `integracoes-1280.png` | 1280×800 | Integrações |

## Firefox (modo responsivo)

1. F12 → Modo de design responsivo.
2. Defina largura/altura da matriz.
3. Clique direito → **Capturar screenshot**.

## Script opcional (Chromium)

Com frontend em `http://localhost:3001`:

```bash
chmod +x scripts/capture-nf03-screenshots.sh
FRONTEND_BASE_URL=http://localhost:3001 ./scripts/capture-nf03-screenshots.sh
```
