import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import type { AuthUserContext } from '../auth/auth-user.types';
import { AuthorizePlatformOperatorUseCase } from '../../application/iam/authorize-platform-operator.use-case';
import { UpdateMeuPerfilUseCase } from '../../application/iam/update-meu-perfil.use-case';
import { ListUnidadesUseCase } from '../../application/unidades/list-unidades.use-case';
import {
  assertAllowedImageFile,
  MAX_IMAGE_SIZE_BYTES,
} from '../../application/shared/image-upload.shared';
import { ManagedUploadService } from '../../infrastructure/storage/managed-upload.service';
import { resolveEffectiveUsuarioStatus } from './response-mappers';

type RequestWithUser = Request & { user: AuthUserContext };

/**
 * JWT Supabase + usuário corporativo local (`usuario` / `auth_sub`).
 */
@Controller('me')
export class MeController {
  constructor(
    private readonly updateMeuPerfil: UpdateMeuPerfilUseCase,
    private readonly listUnidades: ListUnidadesUseCase,
    private readonly managedUpload: ManagedUploadService,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
  ) {}

  @Get()
  getMe(@Req() req: RequestWithUser) {
    return this.buildMeResponse(req);
  }

  @Get('bootstrap')
  async getBootstrap(@Req() req: RequestWithUser) {
    const me = this.buildMeResponse(req);
    const unidades = await this.listUnidades.execute(req.usuarioLocal);
    return { ...me, unidades };
  }

  private buildMeResponse(req: RequestWithUser) {
    const u = req.user;
    const local = req.usuarioLocal;
    return {
      email: u.email,
      role: u.role,
      isPlatformOperator: this.authorizePlatformOperator.isOperator(u),
      isWorkspaceImpersonation: local?.isWorkspaceImpersonation === true,
      usuario: local
        ? {
            id: local.id,
            idUnidade: local.idUnidade,
            nome: local.nome,
            email: local.email,
            fotoUrl: local.fotoUrl ?? null,
            perfil: local.perfil,
            status: resolveEffectiveUsuarioStatus(local),
            empresa: local.empresa,
            cargos: local.cargos,
            permissoes: local.permissoes,
            isWorkspaceImpersonation: local.isWorkspaceImpersonation === true,
          }
        : null,
    };
  }

  @Patch('perfil')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  async updatePerfil(
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body: { removerFoto?: string } = {},
  ) {
    const local = req.usuarioLocal;
    if (!local) {
      throw new BadRequestException('Usuário local não encontrado');
    }

    const removerFoto =
      body.removerFoto === 'true' ||
      String(body.removerFoto ?? '').toLowerCase() === 'true';

    let nextFotoUrl: string | null = local.fotoUrl ?? null;

    if (removerFoto) {
      await this.managedUpload.deleteIfStored(local.fotoUrl);
      nextFotoUrl = null;
    } else if (file) {
      try {
        assertAllowedImageFile(file);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Imagem inválida',
        );
      }
      await this.managedUpload.deleteIfStored(local.fotoUrl);
      nextFotoUrl = await this.managedUpload.storeFile({
        subdir: 'usuarios',
        scopeSegments: [local.id],
        buffer: file.buffer,
        contentType: file.mimetype,
        originalname: file.originalname,
      });
    }

    const atualizado = await this.updateMeuPerfil.execute(local, nextFotoUrl);
    return {
      ok: true,
      usuario: {
        id: atualizado.id,
        nome: atualizado.nome,
        email: atualizado.email,
        fotoUrl: atualizado.fotoUrl ?? null,
        perfil: atualizado.perfil,
        cargos: atualizado.cargos,
      },
    };
  }
}
