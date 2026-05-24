import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

type OrdemResumoRow = {
  id: string;
  ativoNome: string;
  tipo: string;
  status: string;
  descricao: string;
  descricaoSolucao: string | null;
  criadoPorNome: string | null;
  iniciadoPorNome: string | null;
  finalizadoPorNome: string | null;
  tecnicoNome: string | null;
  fotoProblema: string | null;
  fotoSolucao: string | null;
  fotoAnexo: string | null;
  dataAbertura: Date;
  dataFechamento: Date | null;
};

@Controller('relatorios')
export class RelatoriosController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('export')
  async export(
    @Req() req: Request,
    @Res() res: Response,
    @Query('formato') formato?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('unidadeId') unidadeId?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');

    const unidade = unidadeId?.trim() || req.usuarioLocal?.idUnidade;
    if (!unidade) {
      throw new BadRequestException('unidadeId e obrigatorio.');
    }

    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidade);

    const formatoNormalizado = (formato ?? 'excel').trim().toLowerCase();
    if (formatoNormalizado !== 'excel' && formatoNormalizado !== 'pdf') {
      throw new BadRequestException('formato deve ser excel ou pdf.');
    }

    const { fromDate, toDate } = this.resolvePeriod(from, to);

    const rows = await this.prisma.$queryRaw<OrdemResumoRow[]>(Prisma.sql`
      SELECT
        os.id,
        a.nome AS "ativoNome",
        os.tipo,
        os.status,
        os.descricao,
        os.descricao_solucao AS "descricaoSolucao",
        uc.nome AS "criadoPorNome",
        ui.nome AS "iniciadoPorNome",
        uf.nome AS "finalizadoPorNome",
        ut.nome AS "tecnicoNome",
        os.foto_problema AS "fotoProblema",
        os.foto_solucao AS "fotoSolucao",
        os.foto_anexo AS "fotoAnexo",
        os.data_abertura AS "dataAbertura",
        os.data_fechamento AS "dataFechamento"
      FROM ordem_servico os
      JOIN ativo a ON a.id = os.id_ativo
      LEFT JOIN usuario uc ON uc.id = os.criado_por_usuario_id
      LEFT JOIN usuario ui ON ui.id = os.iniciado_por_usuario_id
      LEFT JOIN usuario uf ON uf.id = os.finalizado_por_usuario_id
      LEFT JOIN usuario ut ON ut.id = os.id_tecnico
      WHERE a.id_unidade = ${unidade}::uuid
        AND os.data_abertura BETWEEN ${fromDate} AND ${toDate}
      ORDER BY os.data_abertura DESC
    `);

    if (formatoNormalizado === 'excel') {
      const csv = this.buildCsv(rows, unidade, fromDate, toDate);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="relatorio_${unidade}_${Date.now()}.csv"`,
      );
      res.send(csv);
      return;
    }

    const pdfBuffer = this.buildSimplePdf(rows, unidade, fromDate, toDate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio_${unidade}_${Date.now()}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  private resolvePeriod(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const toDate = to ? new Date(to) : new Date();

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Periodo invalido.');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('from nao pode ser maior que to.');
    }

    return { fromDate, toDate };
  }

  private buildCsv(
    rows: OrdemResumoRow[],
    unidadeId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const generatedAt = new Date().toISOString();
    const meta = [
      ['gerado_em', generatedAt],
      ['unidade_id', unidadeId],
      ['periodo_inicio', fromDate.toISOString()],
      ['periodo_fim', toDate.toISOString()],
      ['total_ordens', String(rows.length)],
      [],
    ]
      .map((line) => line.map((v) => `"${v}"`).join(','))
      .join('\n');
    const header = 'id,ativo,tipo,status,descricao,descricao_solucao,tecnico,criado_por,iniciado_por,finalizado_por,data_abertura,data_fechamento,foto_problema,foto_solucao,foto_anexo';
    const data = rows.map((row) =>
      [
        row.id,
        row.ativoNome,
        row.tipo,
        row.status,
        row.descricao.replaceAll('"', '""'),
        (row.descricaoSolucao ?? '').replaceAll('"', '""'),
        row.tecnicoNome ?? '',
        row.criadoPorNome ?? '',
        row.iniciadoPorNome ?? '',
        row.finalizadoPorNome ?? '',
        row.dataAbertura.toISOString(),
        row.dataFechamento ? row.dataFechamento.toISOString() : '',
        row.fotoProblema ?? '',
        row.fotoSolucao ?? '',
        row.fotoAnexo ?? '',
      ]
        .map((value) => `"${value}"`)
        .join(','),
    );

    return [meta, header, ...data].join('\n');
  }

  private buildSimplePdf(
    rows: OrdemResumoRow[],
    unidadeId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const lines = [
      'Relatorio ManuCMMS',
      `Gerado em: ${new Date().toISOString()}`,
      `Unidade: ${unidadeId}`,
      `Periodo: ${fromDate.toISOString()} a ${toDate.toISOString()}`,
      `Total de ordens: ${rows.length}`,
      '',
      ...rows.slice(0, 40).map((row, index) =>
        `${index + 1}. ${row.ativoNome} | ${row.tipo} | ${row.status} | Tec: ${row.tecnicoNome ?? 'N/D'} | Abertura: ${row.dataAbertura.toISOString()}`
      ),
    ];
    const normalizedLines = lines.map((line) =>
      line
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    const escapedLines = normalizedLines.map((line) =>
      line.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'),
    );

    const textOps = [
      'BT',
      '/F1 10 Tf',
      '14 TL',
      '40 800 Td',
      ...escapedLines.map((line) => `(${line}) Tj T*`),
      'ET',
    ].join('\n');

    const stream = textOps;

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf-8')} >> stream\n${stream}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];

    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += `${obj}\n`;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }
}
