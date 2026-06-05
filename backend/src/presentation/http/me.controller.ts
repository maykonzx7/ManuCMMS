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
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import type { AuthUserContext } from '../auth/auth-user.types';
import { UpdateMeuPerfilUseCase } from '../../application/iam/update-meu-perfil.use-case';

type RequestWithUser = Request & { user: AuthUserContext };

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? 'uploads';
const fotoUploadDir = join(process.cwd(), UPLOADS_DIR, 'usuarios');
mkdirSync(fotoUploadDir, { recursive: true });
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

function isImagemMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function fileToPublicUrl(req: Request, file: Express.Multer.File): string {
  const baseUrl = process.env.PUBLIC_BASE_URL?.trim();
  const origin =
    baseUrl && baseUrl.length > 0
      ? baseUrl
      : `${req.protocol}://${req.get('host')}`;
  return `${origin}/${UPLOADS_DIR}/usuarios/${file.filename}`;
}

/**
 * JWT Supabase + usuário corporativo local (`usuario` / `auth_sub`).
 */
@Controller('me')
export class MeController {
  constructor(private readonly updateMeuPerfil: UpdateMeuPerfilUseCase) {}

  @Get()
  getMe(@Req() req: RequestWithUser) {
    const u = req.user;
    const local = req.usuarioLocal;
    return {
      userId: u.userId,
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
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, fotoUploadDir),
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname || '')}`),
      }),
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
    @Body() body: { fotoUrl?: string | null; removerFoto?: string } = {},
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
      nextFotoUrl = null;
    } else if (file) {
      nextFotoUrl = fileToPublicUrl(req, file);
    } else if (body.fotoUrl !== undefined) {
      nextFotoUrl = body.fotoUrl?.trim() || null;
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
