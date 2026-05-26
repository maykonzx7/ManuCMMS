import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { GetUnidadeByIdUseCase } from '../../application/unidades/get-unidade-by-id.use-case';
import { ListUnidadesUseCase } from '../../application/unidades/list-unidades.use-case';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

/**
 * Listagem das unidades visíveis ao usuário autenticado (RN-08 v1: somente a própria unidade).
 */
@Controller('unidades')
export class UnidadesController {
  constructor(
    private readonly listUnidades: ListUnidadesUseCase,
    private readonly getUnidadeById: GetUnidadeByIdUseCase,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  findAll(@Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'unidade.visualizar');
    return this.listUnidades.execute(req.usuarioLocal);
  }

  @Get(':unidadeId')
  findById(@Req() req: Request, @Param('unidadeId') unidadeId: string) {
    this.authorizePermission.execute(req.usuarioLocal, 'unidade.visualizar');
    return this.getUnidadeById.execute(req.usuarioLocal!, unidadeId);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: {
      nome: string;
      localizacao: string;
      status?: 'ATIVA' | 'INATIVA';
      cep?: string;
      endereco?: string;
      numeroEndereco?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      complemento?: string;
      referencia?: string;
      slaCorretivaHoras?: number;
      slaPreventivaHoras?: number;
      slaPreditivaHoras?: number;
    },
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    const empresaId = req.usuarioLocal?.empresa?.id;
    if (!empresaId) {
      throw new BadRequestException('Empresa do usuário autenticado não encontrada.');
    }

    const nome = (body.nome ?? '').trim();
    const localizacao = (body.localizacao ?? '').trim();
    const status = (body.status ?? 'ATIVA').toUpperCase();
    const cep = body.cep?.trim() || null;
    const endereco = body.endereco?.trim() || null;
    const numeroEndereco = body.numeroEndereco?.trim() || null;
    const bairro = body.bairro?.trim() || null;
    const cidade = body.cidade?.trim() || null;
    const estado = body.estado?.trim().toUpperCase() || null;
    const complemento = body.complemento?.trim() || null;
    const referencia = body.referencia?.trim() || null;
    const slaCorretivaHoras = this.validarSla(body.slaCorretivaHoras, 24, 'slaCorretivaHoras');
    const slaPreventivaHoras = this.validarSla(body.slaPreventivaHoras, 168, 'slaPreventivaHoras');
    const slaPreditivaHoras = this.validarSla(body.slaPreditivaHoras, 72, 'slaPreditivaHoras');
    if (!nome || nome.length > 100) {
      throw new BadRequestException('nome inválido. Use entre 1 e 100 caracteres.');
    }
    if (!localizacao || localizacao.length > 255) {
      throw new BadRequestException('localizacao inválida. Use entre 1 e 255 caracteres.');
    }
    if (status !== 'ATIVA' && status !== 'INATIVA') {
      throw new BadRequestException('status inválido. Use ATIVA ou INATIVA.');
    }

    try {
      const created = await this.prisma.$queryRaw<
        Array<{ id: string; nome: string; localizacao: string; status: string; empresaId: string }>
      >(Prisma.sql`
        INSERT INTO unidade_fabril (
          id,
          empresa_id,
          nome,
          localizacao,
          cep,
          endereco,
          numero_endereco,
          bairro,
          cidade,
          estado,
          complemento,
          referencia,
          sla_corretiva_horas,
          sla_preventiva_horas,
          sla_preditiva_horas,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${empresaId}::uuid,
          ${nome},
          ${localizacao},
          ${cep},
          ${endereco},
          ${numeroEndereco},
          ${bairro},
          ${cidade},
          ${estado},
          ${complemento},
          ${referencia},
          ${slaCorretivaHoras},
          ${slaPreventivaHoras},
          ${slaPreditivaHoras},
          ${status}::"StatusUnidadeFabril",
          NOW(),
          NOW()
        )
        RETURNING
          id,
          nome,
          localizacao,
          cep,
          endereco,
          numero_endereco AS "numeroEndereco",
          bairro,
          cidade,
          estado,
          complemento,
          referencia,
          sla_corretiva_horas AS "slaCorretivaHoras",
          sla_preventiva_horas AS "slaPreventivaHoras",
          sla_preditiva_horas AS "slaPreditivaHoras",
          status::text AS status,
          empresa_id AS "empresaId"
      `);
      return created[0];
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' ||
          (error.code === 'P2010' &&
            (error.meta as { code?: string } | undefined)?.code === '23505'))
      ) {
        throw new BadRequestException('Já existe uma unidade com esse nome nesta empresa.');
      }
      throw error;
    }
  }

  @Patch(':unidadeId')
  async update(
    @Req() req: Request,
    @Param('unidadeId') unidadeId: string,
    @Body() body: {
      nome?: string;
      localizacao?: string;
      status?: 'ATIVA' | 'INATIVA';
      cep?: string;
      endereco?: string;
      numeroEndereco?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      complemento?: string;
      referencia?: string;
      slaCorretivaHoras?: number;
      slaPreventivaHoras?: number;
      slaPreditivaHoras?: number;
    },
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    const empresaId = req.usuarioLocal?.empresa?.id;
    if (!empresaId) {
      throw new BadRequestException('Empresa do usuário autenticado não encontrada.');
    }

    const nome = body.nome?.trim();
    const localizacao = body.localizacao?.trim();
    const status = body.status?.toUpperCase();
    const cep = body.cep?.trim();
    const endereco = body.endereco?.trim();
    const numeroEndereco = body.numeroEndereco?.trim();
    const bairro = body.bairro?.trim();
    const cidade = body.cidade?.trim();
    const estado = body.estado?.trim().toUpperCase();
    const complemento = body.complemento?.trim();
    const referencia = body.referencia?.trim();
    const slaCorretivaHoras = body.slaCorretivaHoras;
    const slaPreventivaHoras = body.slaPreventivaHoras;
    const slaPreditivaHoras = body.slaPreditivaHoras;

    if (nome !== undefined && (!nome || nome.length > 100)) {
      throw new BadRequestException('nome inválido. Use entre 1 e 100 caracteres.');
    }
    if (localizacao !== undefined && (!localizacao || localizacao.length > 255)) {
      throw new BadRequestException('localizacao inválida. Use entre 1 e 255 caracteres.');
    }
    if (status !== undefined && status !== 'ATIVA' && status !== 'INATIVA') {
      throw new BadRequestException('status inválido. Use ATIVA ou INATIVA.');
    }
    if (
      nome === undefined && localizacao === undefined && status === undefined &&
      cep === undefined && endereco === undefined && numeroEndereco === undefined &&
      bairro === undefined && cidade === undefined && estado === undefined &&
      complemento === undefined && referencia === undefined &&
      slaCorretivaHoras === undefined && slaPreventivaHoras === undefined && slaPreditivaHoras === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }

    const fields: Prisma.Sql[] = [];
    if (nome !== undefined) fields.push(Prisma.sql`nome = ${nome}`);
    if (localizacao !== undefined) fields.push(Prisma.sql`localizacao = ${localizacao}`);
    if (cep !== undefined) fields.push(Prisma.sql`cep = ${cep || null}`);
    if (endereco !== undefined) fields.push(Prisma.sql`endereco = ${endereco || null}`);
    if (numeroEndereco !== undefined) fields.push(Prisma.sql`numero_endereco = ${numeroEndereco || null}`);
    if (bairro !== undefined) fields.push(Prisma.sql`bairro = ${bairro || null}`);
    if (cidade !== undefined) fields.push(Prisma.sql`cidade = ${cidade || null}`);
    if (estado !== undefined) fields.push(Prisma.sql`estado = ${estado || null}`);
    if (complemento !== undefined) fields.push(Prisma.sql`complemento = ${complemento || null}`);
    if (referencia !== undefined) fields.push(Prisma.sql`referencia = ${referencia || null}`);
    if (slaCorretivaHoras !== undefined) fields.push(Prisma.sql`sla_corretiva_horas = ${this.validarSla(slaCorretivaHoras, 24, 'slaCorretivaHoras')}`);
    if (slaPreventivaHoras !== undefined) fields.push(Prisma.sql`sla_preventiva_horas = ${this.validarSla(slaPreventivaHoras, 168, 'slaPreventivaHoras')}`);
    if (slaPreditivaHoras !== undefined) fields.push(Prisma.sql`sla_preditiva_horas = ${this.validarSla(slaPreditivaHoras, 72, 'slaPreditivaHoras')}`);
    if (status !== undefined) fields.push(Prisma.sql`status = ${status}::"StatusUnidadeFabril"`);
    fields.push(Prisma.sql`updated_at = NOW()`);

    const updated = await this.prisma.$queryRaw<
      Array<{ id: string; nome: string; localizacao: string; status: string; empresaId: string }>
    >(Prisma.sql`
      UPDATE unidade_fabril
      SET ${Prisma.join(fields, ', ')}
      WHERE id = ${unidadeId}::uuid
        AND empresa_id = ${empresaId}::uuid
      RETURNING
        id,
        nome,
        localizacao,
        cep,
        endereco,
        numero_endereco AS "numeroEndereco",
        bairro,
        cidade,
        estado,
        complemento,
        referencia,
        sla_corretiva_horas AS "slaCorretivaHoras",
        sla_preventiva_horas AS "slaPreventivaHoras",
        sla_preditiva_horas AS "slaPreditivaHoras",
        status::text AS status,
        empresa_id AS "empresaId"
    `);

    if (!updated[0]) {
      throw new BadRequestException('Unidade não encontrada na empresa.');
    }
    return updated[0];
  }

  @Delete(':unidadeId')
  @HttpCode(204)
  async delete(@Req() req: Request, @Param('unidadeId') unidadeId: string) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    const empresaId = req.usuarioLocal?.empresa?.id;
    if (!empresaId) {
      throw new BadRequestException('Empresa do usuário autenticado não encontrada.');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ ativos: bigint; usuarios: bigint }>
    >(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM ativo a WHERE a.id_unidade = ${unidadeId}::uuid)::bigint AS ativos,
        (SELECT COUNT(*) FROM usuario u WHERE u.id_unidade = ${unidadeId}::uuid)::bigint AS usuarios
    `);
    const ativos = Number(rows[0]?.ativos ?? 0n);
    const usuarios = Number(rows[0]?.usuarios ?? 0n);
    if (ativos > 0 || usuarios > 0) {
      throw new BadRequestException('Unidade possui vínculos e não pode ser removida.');
    }

    const deleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM unidade_fabril
      WHERE id = ${unidadeId}::uuid
        AND empresa_id = ${empresaId}::uuid
    `);
    if (!deleted) {
      throw new BadRequestException('Unidade não encontrada na empresa.');
    }
  }

  private validarSla(valor: number | undefined, fallback: number, campo: string): number {
    const resolved = valor ?? fallback;
    if (!Number.isInteger(resolved) || resolved <= 0 || resolved > 24 * 365) {
      throw new BadRequestException(`${campo} deve ser inteiro entre 1 e 8760 horas.`);
    }
    return resolved;
  }
}
