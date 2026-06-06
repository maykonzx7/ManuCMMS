'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ORDER_STATUS_LABELS,
  PRIORITY_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/constants'
import { preloadPrintImages, toAbsoluteMediaUrl } from '@/lib/printable-media'
import type { ApiOrdem, ApiOrdemComentario } from '@/lib/backend-mappers'
import type { OrderStatus } from '@/types'

type PrintConfirmacao = {
  nome: string | null | undefined
  fotoUrl: string | null
  cargo: string | null
  perfil: string | null
  data: string | null | undefined
  legacyCanvas: string | null
} | null

export type OsPrintDocumentProps = {
  ordem: ApiOrdem
  comentarios: ApiOrdemComentario[]
  numero: string
  status: OrderStatus
  unidadeNome: string
  empresaNome: string
  geradoEm: string
  confirmacao: PrintConfirmacao
  onImagesReady?: (ready: boolean) => void
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(from: string, to: string | null | undefined): string {
  if (!to) return '—'
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (ms <= 0) return '—'
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.round((ms % 3_600_000) / 60_000)
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remH = hours % 24
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`
}

function PhotoBlock({ src, label }: { src: string; label: string }) {
  return (
    <figure className="os-print-photo">
      <figcaption className="os-print-photo-label">{label}</figcaption>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="os-print-photo-img" loading="eager" />
    </figure>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="os-print-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function OsPrintDocument({
  ordem,
  comentarios,
  numero,
  status,
  unidadeNome,
  empresaNome,
  geradoEm,
  confirmacao,
  onImagesReady,
}: OsPrintDocumentProps) {
  const tecnicoNome = ordem.finalizadoPorNome ?? ordem.iniciadoPorNome ?? '—'
  const [embeddedImages, setEmbeddedImages] = useState<Record<string, string | null>>({})
  const [imagesLoading, setImagesLoading] = useState(true)

  const imageSources = useMemo(
    () => ({
      logo: '/manucmms-icon-oficial.png',
      fotoProblema: ordem.fotoProblema,
      fotoSolucao: ordem.fotoSolucao,
      fotoAnexo: ordem.fotoAnexo,
      tecnicoFoto: confirmacao?.fotoUrl,
      tecnicoCanvas: confirmacao?.legacyCanvas,
    }),
    [
      ordem.fotoProblema,
      ordem.fotoSolucao,
      ordem.fotoAnexo,
      confirmacao?.fotoUrl,
      confirmacao?.legacyCanvas,
    ],
  )

  useEffect(() => {
    let cancelled = false
    setImagesLoading(true)

    void preloadPrintImages(imageSources).then((loaded) => {
      if (cancelled) return
      setEmbeddedImages(loaded)
      setImagesLoading(false)
      onImagesReady?.(true)
    })

    return () => {
      cancelled = true
    }
  }, [imageSources])

  useEffect(() => {
    onImagesReady?.(!imagesLoading)
  }, [imagesLoading, onImagesReady])

  const logoSrc = embeddedImages.logo ?? '/manucmms-icon-oficial.png'

  function photoSrc(key: keyof typeof imageSources, fallback?: string | null): string | null {
    if (embeddedImages[key]) return embeddedImages[key]
    if (!imagesLoading && fallback) return toAbsoluteMediaUrl(fallback)
    return null
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          [data-sidebar='sidebar'],
          [data-sidebar='rail'],
          [data-slot='sidebar-inset'] > header,
          .os-print-toolbar {
            display: none !important;
          }
          [data-slot='sidebar-inset'] > main {
            padding: 0 !important;
            overflow: visible !important;
          }
          .os-print-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .os-print-photo-img,
          .os-print-signature img,
          .os-print-brand-logo {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            max-height: 240px !important;
            page-break-inside: avoid;
          }
        }

        .os-print-page {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
        }

        .os-print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding: 28px 32px 20px;
          border-bottom: 3px solid #0f766e;
          background: linear-gradient(135deg, #f0fdfa 0%, #fff 55%);
        }

        .os-print-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .os-print-brand h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f766e;
        }

        .os-print-brand p {
          margin: 2px 0 0;
          font-size: 9pt;
          color: #64748b;
        }

        .os-print-meta-box {
          text-align: right;
          min-width: 180px;
        }

        .os-print-meta-box .os-code {
          font-size: 22pt;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #0f172a;
          font-family: ui-monospace, monospace;
        }

        .os-print-meta-box p {
          margin: 4px 0 0;
          font-size: 9pt;
          color: #64748b;
        }

        .os-print-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 16px 32px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .os-print-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 8.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .os-print-badge.status-aberta { background: #dbeafe; color: #1d4ed8; }
        .os-print-badge.status-andamento { background: #fef3c7; color: #b45309; }
        .os-print-badge.status-concluida { background: #d1fae5; color: #047857; }
        .os-print-badge.status-cancelada { background: #fee2e2; color: #b91c1c; }
        .os-print-badge.sla-atrasada { background: #fecaca; color: #991b1b; }

        .os-print-body {
          padding: 24px 32px 32px;
        }

        .os-print-section {
          margin-bottom: 24px;
          break-inside: avoid;
        }

        .os-print-section h2 {
          margin: 0 0 12px;
          padding-bottom: 6px;
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #0f766e;
          border-bottom: 1px solid #ccfbf1;
        }

        .os-print-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
        }

        .os-print-info-row {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 8px;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .os-print-info-row dt {
          font-size: 9pt;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .os-print-info-row dd {
          margin: 0;
          color: #0f172a;
        }

        .os-print-text-block {
          padding: 14px 16px;
          background: #f8fafc;
          border-left: 3px solid #0f766e;
          border-radius: 0 6px 6px 0;
          white-space: pre-wrap;
        }

        .os-print-photos {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .os-print-photo {
          margin: 0;
          break-inside: avoid;
        }

        .os-print-photo-label {
          font-size: 8.5pt;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .os-print-photo-img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .os-print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }

        .os-print-table th,
        .os-print-table td {
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .os-print-table th {
          font-size: 8.5pt;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          background: #f8fafc;
        }

        .os-print-comment {
          padding: 10px 12px;
          margin-bottom: 8px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .os-print-comment header {
          display: flex !important;
          justify-content: space-between;
          font-size: 9pt;
          color: #64748b;
          margin-bottom: 4px;
        }

        .os-print-signature {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 1px dashed #94a3b8;
          border-radius: 8px;
          background: #fafafa;
        }

        .os-print-signature img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e2e8f0;
        }

        .os-print-footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 8pt;
          color: #94a3b8;
        }
      `}</style>

      <article className="os-print-page">
        <header className="os-print-header">
          <div className="os-print-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="ManuCMMS"
              width={48}
              height={48}
              className="os-print-brand-logo rounded-lg"
              loading="eager"
            />
            <div>
              <h1>ManuCMMS</h1>
              <p>{empresaNome}</p>
              <p>{unidadeNome}</p>
            </div>
          </div>
          <div className="os-print-meta-box">
            <div className="os-code">{numero}</div>
            <p>Ordem de Serviço</p>
            <p>Emitido em {formatDateTime(geradoEm)}</p>
          </div>
        </header>

        <div className="os-print-badges">
          <span
            className={`os-print-badge status-${
              status === 'EM_ANDAMENTO'
                ? 'andamento'
                : status === 'CONCLUIDA'
                  ? 'concluida'
                  : status === 'CANCELADA'
                    ? 'cancelada'
                    : 'aberta'
            }`}
          >
            {ORDER_STATUS_LABELS[status]}
          </span>
          <span className="os-print-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
            {MAINTENANCE_TYPE_LABELS[ordem.tipo as keyof typeof MAINTENANCE_TYPE_LABELS] ?? ordem.tipo}
          </span>
          <span className="os-print-badge" style={{ background: '#fce7f3', color: '#9d174d' }}>
            {PRIORITY_LABELS[ordem.prioridade as keyof typeof PRIORITY_LABELS] ?? ordem.prioridade ?? 'Média'}
          </span>
          {ordem.statusSla === 'ATRASADA' ? (
            <span className="os-print-badge sla-atrasada">SLA Atrasado</span>
          ) : null}
        </div>

        <div className="os-print-body">
          <section className="os-print-section">
            <h2>Identificação</h2>
            <dl className="os-print-grid">
              <InfoRow label="Ativo" value={ordem.ativoNome} />
              <InfoRow label="Técnico" value={tecnicoNome} />
              <InfoRow label="Abertura" value={formatDateTime(ordem.dataAbertura)} />
              <InfoRow label="Fechamento" value={formatDateTime(ordem.dataFechamento)} />
              <InfoRow
                label="Duração"
                value={formatDuration(ordem.dataAbertura, ordem.dataFechamento)}
              />
              <InfoRow label="Prazo SLA" value={formatDateTime(ordem.dataLimiteSla)} />
              <InfoRow label="Criado por" value={ordem.criadoPorNome ?? '—'} />
              <InfoRow label="Iniciado por" value={ordem.iniciadoPorNome ?? '—'} />
              <InfoRow label="Finalizado por" value={ordem.finalizadoPorNome ?? '—'} />
            </dl>
          </section>

          <section className="os-print-section">
            <h2>Descrição da ordem</h2>
            <div className="os-print-text-block">{ordem.descricao}</div>
          </section>

          {ordem.descricaoProblema ? (
            <section className="os-print-section">
              <h2>Problema reportado</h2>
              <div className="os-print-text-block">{ordem.descricaoProblema}</div>
            </section>
          ) : null}

          {ordem.descricaoSolucao ? (
            <section className="os-print-section">
              <h2>Solução aplicada</h2>
              <div className="os-print-text-block">{ordem.descricaoSolucao}</div>
            </section>
          ) : null}

          {ordem.observacaoCancelamento ? (
            <section className="os-print-section">
              <h2>Motivo do cancelamento</h2>
              <div className="os-print-text-block">{ordem.observacaoCancelamento}</div>
            </section>
          ) : null}

          {ordem.fotoProblema || ordem.fotoSolucao || ordem.fotoAnexo ? (
            <section className="os-print-section">
              <h2>Evidências fotográficas</h2>
              {imagesLoading ? (
                <p className="text-sm text-muted-foreground">Carregando fotos...</p>
              ) : (
                <div className="os-print-photos">
                  {photoSrc('fotoProblema', ordem.fotoProblema) ? (
                    <PhotoBlock
                      src={photoSrc('fotoProblema', ordem.fotoProblema)!}
                      label="Foto do problema"
                    />
                  ) : null}
                  {photoSrc('fotoSolucao', ordem.fotoSolucao) ? (
                    <PhotoBlock
                      src={photoSrc('fotoSolucao', ordem.fotoSolucao)!}
                      label="Foto da solução"
                    />
                  ) : null}
                  {photoSrc('fotoAnexo', ordem.fotoAnexo) ? (
                    <PhotoBlock
                      src={photoSrc('fotoAnexo', ordem.fotoAnexo)!}
                      label="Foto da intervenção"
                    />
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          {(ordem.pecasConsumidas?.length ?? 0) > 0 ? (
            <section className="os-print-section">
              <h2>Peças consumidas</h2>
              <table className="os-print-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {ordem.pecasConsumidas!.map((peca) => (
                    <tr key={peca.pecaId}>
                      <td>{peca.codigo}</td>
                      <td>{peca.nome}</td>
                      <td>{peca.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {(ordem.transferencias?.length ?? 0) > 0 ? (
            <section className="os-print-section">
              <h2>Histórico de transferências</h2>
              <table className="os-print-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>De → Para</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {ordem.transferencias!.map((t) => (
                    <tr key={t.id}>
                      <td>{formatDateTime(t.createdAt)}</td>
                      <td>
                        {t.deTecnicoNome ?? 'N/D'} → {t.paraTecnicoNome ?? 'N/D'}
                      </td>
                      <td>{t.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {comentarios.length > 0 ? (
            <section className="os-print-section">
              <h2>Comentários ({comentarios.length})</h2>
              {comentarios.map((c) => (
                <div key={c.id} className="os-print-comment">
                  <header>
                    <strong>{c.usuarioNome}</strong>
                    <span>{formatDateTime(c.createdAt)}</span>
                  </header>
                  <p>{c.texto}</p>
                </div>
              ))}
            </section>
          ) : null}

          {confirmacao ? (
            <section className="os-print-section">
              <h2>Confirmação de conclusão</h2>
              <div className="os-print-signature">
                {photoSrc('tecnicoFoto', confirmacao.fotoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc('tecnicoFoto', confirmacao.fotoUrl)!}
                    alt={confirmacao.nome ?? 'Técnico'}
                    loading="eager"
                  />
                ) : photoSrc('tecnicoCanvas', confirmacao.legacyCanvas) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc('tecnicoCanvas', confirmacao.legacyCanvas)!}
                    alt="Assinatura"
                    style={{ borderRadius: 4, width: 120, height: 48 }}
                    loading="eager"
                  />
                ) : imagesLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando foto...</p>
                ) : null}
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{confirmacao.nome ?? '—'}</p>
                  {confirmacao.cargo ? (
                    <p style={{ margin: '2px 0', fontSize: '9pt', color: '#64748b' }}>{confirmacao.cargo}</p>
                  ) : null}
                  <p style={{ margin: '4px 0 0', fontSize: '9pt', color: '#64748b' }}>
                    Confirmado em {formatDateTime(confirmacao.data)}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="os-print-footer">
            <span>Documento gerado pelo ManuCMMS — gestão de manutenção industrial</span>
            <span>ID: {ordem.id ?? ordem.idOrdemServico}</span>
          </footer>
        </div>
      </article>
    </>
  )
}
