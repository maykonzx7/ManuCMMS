import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Patch,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import type { AuthUserContext } from '../auth/auth-user.types';
import { UpdateMeuPerfilUseCase } from '../../application/iam/update-meu-perfil.use-case';
import { ListUnidadesUseCase } from '../../application/unidades/list-unidades.use-case';
import { SupabaseStorageService } from '../../infrastructure/storage/supabase-storage.service';

type RequestWithUser = Request & { user: AuthUserContext };

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

function isImagemMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * JWT Supabase + usuário corporativo local (`usuario` / `auth_sub`).
 */
@Controller('me')
export class MeController {
  constructor(
    private readonly updateMeuPerfil: UpdateMeuPerfilUseCase,
    private readonly listUnidades: ListUnidadesUseCase,
    private readonly supabaseStorage: SupabaseStorageService,
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
      usuario: local
        ? {
            id: local.id,
            idUnidade: local.idUnidade,
            nome: local.nome,
            email: local.email,
            fotoUrl: local.fotoUrl ?? null,
            perfil: local.perfil,
            status: local.status,
            empresa: local.empresa,
            cargos: local.cargos,
            permissoes: local.permissoes,
          }
        : null,
    };
  }

  @Patch('perfil')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isImagemMimeType(file.mimetype)) {
          cb(
            new BadRequestException('Apenas arquivos de imagem são permitidos'),
            false,
          );
          return;
        }
        cb(null, true);
      },
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
      await this.deleteStoredPhoto(local.fotoUrl);
      nextFotoUrl = null;
    } else if (file) {
      await this.deleteStoredPhoto(local.fotoUrl);
      nextFotoUrl = await this.storeProfilePhoto(local.id, file);
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

  private async storeProfilePhoto(
    usuarioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (this.supabaseStorage.isConfigured()) {
      return this.supabaseStorage.uploadProfilePhoto({
        usuarioId,
        buffer: file.buffer,
        contentType: file.mimetype,
        extension: extname(file.originalname || '') || '.jpg',
      });
    }

    throw new InternalServerErrorException(
      'Supabase Storage não configurado. Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e crie o bucket avatars.',
    );
  }

  private async deleteStoredPhoto(fotoUrl: string | null | undefined): Promise<void> {
    if (!fotoUrl) return;
    await this.supabaseStorage.deleteProfilePhotoIfStored(fotoUrl);
  }
}
