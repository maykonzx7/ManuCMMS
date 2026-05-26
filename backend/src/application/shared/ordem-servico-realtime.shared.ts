import type { NotificacaoService } from '../notificacoes/notificacao.service';

type OrdemRealtimeInput = {
  id: string;
  status: string;
  tipo?: string;
  prioridade?: string;
  idAtivo?: string;
  idTecnico?: string | null;
};

export function publishOrdemServicoStatus(
  notificacoes: NotificacaoService,
  idUnidade: string,
  ordem: OrdemRealtimeInput,
): void {
  notificacoes.emitOrdemServicoStatus({
    id: ordem.id,
    idUnidade,
    status: ordem.status,
    tipo: ordem.tipo,
    prioridade: ordem.prioridade,
    idAtivo: ordem.idAtivo,
    idTecnico: ordem.idTecnico ?? null,
    updatedAt: new Date().toISOString(),
  });
}
