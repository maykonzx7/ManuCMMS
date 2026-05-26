# NF-10 — Política de backup e restore

**Data:** 26/05/2026  
**Escopo:** Postgres (dados operacionais), MongoDB (auditoria), volumes Docker locais.

## Política recomendada (homologação/produção)

| Ativo | Método | Frequência | Retenção |
|-------|--------|------------|----------|
| Postgres | Snapshot provedor ou `pg_dump -Fc` | Diário 02:00 UTC | 30 dias |
| MongoDB (audit) | `mongodump --gzip` | Diário 03:00 UTC | 90 dias |
| Uploads (`uploads/`) | Sync objeto (S3/R2) ou tarball | Diário | 30 dias |
| Segredos `.env` | Vault / secrets do provedor | Por release | N/A |

## Simulação local (Postgres)

```bash
# Backup
docker exec manucmms-postgres pg_dump -U manucmms -Fc manucmms \
  > docs/evidencias/NF-10-backup/manucmms-$(date +%F).dump

# Restore em banco limpo (teste)
docker exec -i manucmms-postgres pg_restore -U manucmms -d manucmms --clean --if-exists \
  < docs/evidencias/NF-10-backup/manucmms-YYYY-MM-DD.dump
```

## Simulação local (MongoDB auditoria)

```bash
docker exec manucmms-mongo mongodump \
  --uri="mongodb://manucmms:manucmms_dev@127.0.0.1:27017/manucmms?authSource=admin" \
  --gzip --archive=/tmp/audit.gz

docker cp manucmms-mongo:/tmp/audit.gz docs/evidencias/NF-10-backup/
```

## RPO / RTO alvo (homologação)

| Métrica | Alvo |
|---------|------|
| RPO (perda máxima de dados) | ≤ 24 h |
| RTO (tempo de restauração) | ≤ 4 h |

## Provedores sugeridos

- **Supabase / Railway Postgres:** backups automáticos point-in-time (evidência via dashboard).
- **MongoDB Atlas:** backup contínuo M10+ ou snapshots M0 documentados manualmente.

## Checklist DDE

- [ ] Política documentada (este arquivo)
- [ ] Evidência de backup automático do provedor (screenshot)
- [ ] Teste de restore executado e registrado (data + responsável)

## Conclusão

**Política definida** — executar simulação de restore e anexar comprovante do provedor na homologação HTTPS.
