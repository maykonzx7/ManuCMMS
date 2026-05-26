# NF-08 — Circuit breaker (webhook outbound)

**Data:** 26/05/2026  
**Implementação:** `IntegracaoCircuitBreakerService` + `IntegracaoWebhookService`

## Parâmetros

| Parâmetro | Valor |
|-----------|-------|
| Limiar de falhas | 3 consecutivas |
| Tempo aberto | 60 segundos |
| Chave | `webhook:{empresaId}` |

## Evidência automatizada (unitário)

Arquivo de teste: `backend/src/infrastructure/integracao/integracao-circuit-breaker.service.spec.ts`

```bash
cd backend && npm test -- integracao-circuit-breaker.service.spec.ts
```

Cenários cobertos:

1. Circuito **fechado** com 0–2 falhas.
2. Circuito **aberto** na 3ª falha.
3. Circuito **resetado** após `recordSuccess`.

## Evidência funcional (UI + API)

### Procedimento manual (capturar screenshot para DDE)

1. Login como **Gestor/Admin**.
2. Acesse `/workspace/integracoes`.
3. Configure webhook inválido: `http://127.0.0.1:9/webhook-teste`.
4. Clique **Testar webhook** 3 vezes.
5. Observe badge **"Circuit breaker aberto"** na mesma tela.
6. Verifique em **Eventos recentes** registros com `status: FALHA`.

### Evidência via API (gestão)

```http
POST /empresas/{empresaId}/gestao/integracao/testar-webhook
Authorization: Bearer {token}
```

Após 3 falhas, resposta inclui mensagem de circuit breaker; eventos persistidos em `integracao_evento`.

## Conclusão

**Atendido** — isolamento de falhas do destino webhook com feedback visível ao operador (NF-08 + RF-15).
