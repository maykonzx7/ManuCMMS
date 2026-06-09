import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import type { IOrdemServicoRepositoryPort } from '../../domain/ports/ordem-servico.repository.port';
import type { NotificacaoService } from '../notificacoes/notificacao.service';
import { publishOrdemServicoStatus } from './ordem-servico-realtime.shared';

export async function resolveStatusAtribuicaoTecnico(
  ordens: IOrdemServicoRepositoryPort,
  empresaId: string,
  idUnidade: string,
  idTecnico: string,
): Promise<'ABERTA' | 'AGUARDANDO'> {
  const ocupado = await ordens.tecnicoTemOsEmExecucao(
    empresaId,
    idUnidade,
    idTecnico,
  );
  return ocupado ? 'AGUARDANDO' : 'ABERTA';
}

export async function promoverFilaTecnicoAposLiberarSlot(input: {
  ordens: IOrdemServicoRepositoryPort;
  notificacoes: NotificacaoService;
  empresaId: string;
  idUnidade: string;
  idTecnico: string | null;
}): Promise<OrdemServicoListaItem | null> {
  const { ordens, notificacoes, empresaId, idUnidade, idTecnico } = input;
  if (!idTecnico) {
    return null;
  }
  const promovida = await ordens.promoverProximaFilaTecnico(
    empresaId,
    idUnidade,
    idTecnico,
  );
  if (promovida) {
    publishOrdemServicoStatus(notificacoes, idUnidade, promovida);
  }
  return promovida;
}
