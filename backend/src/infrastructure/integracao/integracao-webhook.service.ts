import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import { PrismaService } from '../persistence/prisma.service';
import { IntegracaoCircuitBreakerService } from './integracao-circuit-breaker.service';

type EmpresaIntegracaoRow = {
  id: string;
  webhookUrl: string | null;
  apiKeyIntegracao: string | null;
};

@Injectable()
export class IntegracaoWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: IntegracaoCircuitBreakerService,
  ) {}

  async enqueueOrdemServicoConcluida(input: {
    empresaId: string;
    idUnidade: string;
    ordem: OrdemServicoListaItem;
  }): Promise<void> {
    const empresa = await this.findEmpresaIntegracao(input.empresaId);
    if (!empresa?.webhookUrl?.trim()) {
      return;
    }

    const payload = {
      evento: 'ordem_servico.concluida',
      empresaId: input.empresaId,
      unidadeId: input.idUnidade,
      ordemServico: {
        id: input.ordem.id,
        tipo: input.ordem.tipo,
        status: input.ordem.status,
        prioridade: input.ordem.prioridade,
        ativoId: input.ordem.idAtivo,
        ativoNome: input.ordem.ativoNome,
        descricao: input.ordem.descricao,
        descricaoSolucao: input.ordem.descricaoSolucao,
        dataAbertura: input.ordem.dataAbertura.toISOString(),
        dataFechamento: input.ordem.dataFechamento?.toISOString() ?? null,
      },
      enviadoEm: new Date().toISOString(),
    };

    const eventoId = randomUUID();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO integracao_evento (
        id,
        empresa_id,
        id_unidade,
        tipo,
        payload,
        status,
        tentativas,
        created_at,
        updated_at
      )
      VALUES (
        ${eventoId}::uuid,
        ${input.empresaId}::uuid,
        ${input.idUnidade}::uuid,
        'ordem_servico.concluida',
        ${JSON.stringify(payload)}::jsonb,
        'PENDENTE',
        0,
        NOW(),
        NOW()
      )
    `);

    void this.deliverEvent(empresa, eventoId, payload).catch(() => undefined);
  }

  async deliverEvent(
    empresa: EmpresaIntegracaoRow,
    eventoId: string,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; message: string }> {
    const url = empresa.webhookUrl?.trim();
    if (!url) {
      return { ok: false, message: 'Webhook não configurado.' };
    }

    const breakerKey = `webhook:${empresa.id}`;
    if (this.circuitBreaker.isOpen(breakerKey)) {
      await this.markFailure(eventoId, 'Circuit breaker aberto para webhook.');
      return { ok: false, message: 'Circuit breaker aberto.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ManuCMMS-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = `Webhook respondeu ${response.status}.`;
        this.circuitBreaker.recordFailure(breakerKey);
        await this.markFailure(eventoId, message);
        return { ok: false, message };
      }

      this.circuitBreaker.recordSuccess(breakerKey);
      await this.markSuccess(eventoId);
      return { ok: true, message: 'Webhook entregue com sucesso.' };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao entregar webhook.';
      this.circuitBreaker.recordFailure(breakerKey);
      await this.markFailure(eventoId, message);
      return { ok: false, message };
    } finally {
      clearTimeout(timeout);
    }
  }

  async testWebhook(
    empresaId: string,
  ): Promise<{ ok: boolean; message: string }> {
    const empresa = await this.findEmpresaIntegracao(empresaId);
    if (!empresa?.webhookUrl?.trim()) {
      return { ok: false, message: 'Configure webhookUrl antes de testar.' };
    }

    const eventoId = randomUUID();
    const payload = {
      evento: 'integracao.teste',
      empresaId,
      mensagem: 'Evento de teste ManuCMMS',
      enviadoEm: new Date().toISOString(),
    };

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO integracao_evento (
        id, empresa_id, tipo, payload, status, tentativas, created_at, updated_at
      )
      VALUES (
        ${eventoId}::uuid,
        ${empresaId}::uuid,
        'integracao.teste',
        ${JSON.stringify(payload)}::jsonb,
        'PENDENTE',
        0,
        NOW(),
        NOW()
      )
    `);

    return this.deliverEvent(empresa, eventoId, payload);
  }

  async getResumo(empresaId: string) {
    const empresa = await this.findEmpresaIntegracao(empresaId);
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        tipo: string;
        status: string;
        tentativas: number;
        ultimoErro: string | null;
        entregueEm: Date | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        tipo,
        status,
        tentativas,
        ultimo_erro AS "ultimoErro",
        entregue_em AS "entregueEm",
        created_at AS "createdAt"
      FROM integracao_evento
      WHERE empresa_id = ${empresaId}::uuid
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return {
      webhookUrl: empresa?.webhookUrl ?? null,
      apiKeyIntegracao: empresa?.apiKeyIntegracao ?? null,
      circuitBreakerAberto: empresa
        ? this.circuitBreaker.isOpen(`webhook:${empresa.id}`)
        : false,
      eventosRecentes: rows.map((row) => ({
        id: row.id,
        tipo: row.tipo,
        status: row.status,
        tentativas: row.tentativas,
        ultimoErro: row.ultimoErro,
        entregueEm: row.entregueEm?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async ensureApiKey(empresaId: string): Promise<string> {
    const empresa = await this.findEmpresaIntegracao(empresaId);
    if (empresa?.apiKeyIntegracao) {
      return empresa.apiKeyIntegracao;
    }
    return this.regenerateApiKey(empresaId);
  }

  async regenerateApiKey(empresaId: string): Promise<string> {
    const apiKey = randomUUID().replace(/-/g, '');
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE empresa
      SET
        api_key_integracao = ${apiKey},
        updated_at = NOW()
      WHERE id = ${empresaId}::uuid
    `);
    return apiKey;
  }

  async updateWebhookUrl(
    empresaId: string,
    webhookUrl: string | null,
  ): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE empresa
      SET
        webhook_url = ${webhookUrl},
        updated_at = NOW()
      WHERE id = ${empresaId}::uuid
    `);
  }

  async findEmpresaByApiKey(
    apiKey: string,
  ): Promise<EmpresaIntegracaoRow | null> {
    const rows = await this.prisma.$queryRaw<EmpresaIntegracaoRow[]>(Prisma.sql`
      SELECT
        id,
        webhook_url AS "webhookUrl",
        api_key_integracao AS "apiKeyIntegracao"
      FROM empresa
      WHERE api_key_integracao = ${apiKey}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async findEmpresaIntegracao(
    empresaId: string,
  ): Promise<EmpresaIntegracaoRow | null> {
    const rows = await this.prisma.$queryRaw<EmpresaIntegracaoRow[]>(Prisma.sql`
      SELECT
        id,
        webhook_url AS "webhookUrl",
        api_key_integracao AS "apiKeyIntegracao"
      FROM empresa
      WHERE id = ${empresaId}::uuid
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async markSuccess(eventoId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE integracao_evento
      SET
        status = 'ENTREGUE',
        tentativas = tentativas + 1,
        ultimo_erro = NULL,
        entregue_em = NOW(),
        updated_at = NOW()
      WHERE id = ${eventoId}::uuid
    `);
  }

  private async markFailure(eventoId: string, message: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE integracao_evento
      SET
        status = 'FALHA',
        tentativas = tentativas + 1,
        ultimo_erro = ${message.slice(0, 500)},
        updated_at = NOW()
      WHERE id = ${eventoId}::uuid
    `);
  }
}
