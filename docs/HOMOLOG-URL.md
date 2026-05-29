# URLs de homologação (preencher após deploy)

| Ambiente | URL | Status |
|----------|-----|--------|
| Frontend | `https://____________.vercel.app` | Pendente |
| API + WebSocket | `https://____________.railway.app` | Pendente |
| Health | `https://____________.railway.app/health` | Pendente |

## Validação

```bash
export API_BASE_URL=https://SUA-API
export FRONTEND_BASE_URL=https://SEU-FRONT
chmod +x scripts/homolog/check-homolog.sh
./scripts/homolog/check-homolog.sh
```

## Evidências NF que usam homolog

- NF-01: tempo de resposta HTTP — incluído em `collect-nf-evidence.sh`
- NF-11: axe DevTools manual — [NF-11-a11y/README.md](evidencias/NF-11-a11y/README.md)
- NF-02: `./scripts/nf-zap-baseline.sh` com `TARGET_URL=$FRONTEND_BASE_URL`
- NF-06: `k6 run -e API_BASE_URL=$API_BASE_URL scripts/nf-k6-load.js`
- NF-07: cadastrar monitor em UptimeRobot apontando para `/health`

Ver [14-DEPLOY-HOMOLOGACAO.md](14-DEPLOY-HOMOLOGACAO.md).
