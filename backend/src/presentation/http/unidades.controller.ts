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
    @Body() body: { nome: string; localizacao: string; status?: 'ATIVA' | 'INATIVA' },
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    const empresaId = req.usuarioLocal?.empresa?.id;
    if (!empresaId) {
      throw new BadRequestException('Empresa do usuário autenticado não encontrada.');
    }

    const nome = (body.nome ?? '').trim();
    const localizacao = (body.localizacao ?? '').trim();
    const status = (body.status ?? 'ATIVA').toUpperCase();
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
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${empresaId}::uuid,
          ${nome},
          ${localizacao},
          ${status}::"StatusUnidadeFabril",
          NOW(),
          NOW()
        )
        RETURNING
          id,
          nome,
          localizacao,
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
    @Body() body: { nome?: string; localizacao?: string; status?: 'ATIVA' | 'INATIVA' },
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    const empresaId = req.usuarioLocal?.empresa?.id;
    if (!empresaId) {
      throw new BadRequestException('Empresa do usuário autenticado não encontrada.');
    }

    const nome = body.nome?.trim();
    const localizacao = body.localizacao?.trim();
    const status = body.status?.toUpperCase();

    if (nome !== undefined && (!nome || nome.length > 100)) {
      throw new BadRequestException('nome inválido. Use entre 1 e 100 caracteres.');
    }
    if (localizacao !== undefined && (!localizacao || localizacao.length > 255)) {
      throw new BadRequestException('localizacao inválida. Use entre 1 e 255 caracteres.');
    }
    if (status !== undefined && status !== 'ATIVA' && status !== 'INATIVA') {
      throw new BadRequestException('status inválido. Use ATIVA ou INATIVA.');
    }
    if (nome === undefined && localizacao === undefined && status === undefined) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }

    const fields: Prisma.Sql[] = [];
    if (nome !== undefined) fields.push(Prisma.sql`nome = ${nome}`);
    if (localizacao !== undefined) fields.push(Prisma.sql`localizacao = ${localizacao}`);
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
}
