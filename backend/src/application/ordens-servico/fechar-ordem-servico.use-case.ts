import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';
import { NotificacaoService } from '../notificacoes/notificacao.service';

const URL_MAX = 2048;
const DESCRICAO_PROBLEMA_MAX = 4000;
const DESCRICAO_SOLUCAO_MAX = 4000;
const ASSINATURA_MAX = 1_000_000;

function normalizarUrl(v: unknown): string | null {
  if (v == null || typeof v !== 'string') {
    return null;
  }
  const t = v.trim();
  return t.length === 0 ? null : t;
}

@Injectable()
export class FecharOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    body: {
      fotoAnexo?: string | null;
      fotoProblema?: string | null;
      descricaoProblema?: string | null;
      fotoSolucao?: string | null;
      descricaoSolucao?: string | null;
      assinaturaDigital?: string | null;
    },
    finalizadoPorUsuarioId: string,
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (!unidadeOk.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const os = await this.ordens.findParaFechamento(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
    );
    if (!os) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada ou já encerrada',
      );
    }

    const osDetalhe = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
    );

    const fotoAnexo = normalizarUrl(body.fotoAnexo);
    const fotoProblema = normalizarUrl(body.fotoProblema) ?? osDetalhe?.fotoProblema ?? null;
    const descricaoProblema = normalizarUrl(body.descricaoProblema) ?? osDetalhe?.descricaoProblema ?? null;
    const fotoSolucao = normalizarUrl(body.fotoSolucao);
    const descricaoSolucao = normalizarUrl(body.descricaoSolucao);
    const assinaturaDigital = normalizarUrl(body.assinaturaDigital);

    for (const [nome, url] of [
      ['fotoAnexo', fotoAnexo],
      ['fotoProblema', fotoProblema],
      ['fotoSolucao', fotoSolucao],
    ] as const) {
      if (url != null && url.length > URL_MAX) {
        throw new BadRequestException(
          `${nome}: URL com até ${URL_MAX} caracteres`,
        );
      }
    }

    if (descricaoProblema != null && descricaoProblema.length > DESCRICAO_PROBLEMA_MAX) {
      throw new BadRequestException(
        `descricaoProblema deve ter até ${DESCRICAO_PROBLEMA_MAX} caracteres`,
      );
    }
    if (descricaoSolucao != null && descricaoSolucao.length > DESCRICAO_SOLUCAO_MAX) {
      throw new BadRequestException(
        `descricaoSolucao deve ter até ${DESCRICAO_SOLUCAO_MAX} caracteres`,
      );
    }
    if (assinaturaDigital != null && assinaturaDigital.length > ASSINATURA_MAX) {
      throw new BadRequestException(
        `assinaturaDigital deve ter até ${ASSINATURA_MAX} caracteres`,
      );
    }

    if (descricaoSolucao == null) {
      throw new BadRequestException(
        'Para concluir OS é obrigatória a descricaoSolucao.',
      );
    }

    if (os.tipo === 'CORRETIVA') {
      if (fotoProblema == null) {
        throw new BadRequestException(
          'OS corretiva exige fotoProblema (RN-13)',
        );
      }
      if (descricaoProblema == null) {
        throw new BadRequestException(
          'OS corretiva exige descricaoProblema (RN-13)',
        );
      }
      if (fotoSolucao == null) {
        throw new BadRequestException(
          'OS corretiva exige fotoSolucao para conclusão (RN-13)',
        );
      }
    } else if (fotoAnexo == null) {
      throw new BadRequestException(
        'É obrigatório enviar pelo menos uma foto da intervenção em fotoAnexo (RN-02)',
      );
    }

    const concluida = await this.ordens.fecharComEvidencias({
      idOrdemServico,
      empresaId: unidadeOk.empresaId,
      idUnidade,
      fotoAnexo: fotoAnexo ?? null,
      fotoProblema: os.tipo === 'CORRETIVA' ? fotoProblema : null,
      descricaoProblema: os.tipo === 'CORRETIVA' ? descricaoProblema : null,
      fotoSolucao: os.tipo === 'CORRETIVA' ? fotoSolucao : null,
      descricaoSolucao: os.tipo === 'CORRETIVA' ? (descricaoSolucao ?? null) : null,
      assinaturaDigital: assinaturaDigital ?? null,
      finalizadoPorUsuarioId,
    });
    await this.notifyOrderClosed({
      ordem: concluida,
      empresaId: unidadeOk.empresaId,
      idUnidade,
      unidadeNome: unidadeOk.nome,
    });
    return concluida;
  }

  private async notifyOrderClosed(input: {
    ordem: OrdemServicoListaItem;
    empresaId: string;
    idUnidade: string;
    unidadeNome: string;
  }): Promise<void> {
    const { ordem, empresaId, idUnidade, unidadeNome } = input;
    const usuarios = await this.usuarios.listByUnidade(idUnidade);
    const recipients = usuarios.filter(
      (u) => u.perfil === 'ADMIN' || u.id === ordem.idTecnico,
    );
    const fotoNotificacao = ordem.fotoSolucao ?? ordem.fotoAnexo ?? ordem.fotoProblema;
    const msg = `OS ${ordem.id.slice(0, 8).toUpperCase()} concluida na unidade ${unidadeNome}. Ativo: ${ordem.ativoNome}. Evidencias foram anexadas.`;

    for (const user of recipients) {
      await this.notificacoes.create({
        usuarioId: user.id,
        empresaId,
        idUnidade,
        ordemServicoId: ordem.id,
        tipo: 'success',
        titulo: 'OS concluida com evidencia',
        mensagem: msg,
        fotoUrl: fotoNotificacao,
        linkPath: `/workspace/ordens/${ordem.id}`,
      });
    }
  }
}
