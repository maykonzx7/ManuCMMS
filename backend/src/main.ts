import { ensureDatabaseUrl } from './config/compose-database-url';
import './presentation/auth/request-augment';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';

ensureDatabaseUrl();

function parseCsvEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveDefaultCorsOrigins(): string[] {
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
}

function buildCorsOriginChecker() {
  const exactOrigins = parseCsvEnv('CORS_ALLOWED_ORIGINS');
  const suffixes = parseCsvEnv('CORS_ALLOWED_ORIGIN_SUFFIXES');
  const allowedExactOrigins =
    exactOrigins.length > 0 ? exactOrigins : resolveDefaultCorsOrigins();
  const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';

  function isLocalDevOrigin(origin: string): boolean {
    try {
      const { protocol, hostname } = new URL(origin);
      if (protocol !== 'http:' && protocol !== 'https:') return false;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1'
      ) {
        return true;
      }
      if (hostname.startsWith('192.168.')) return true;
      if (hostname.startsWith('10.')) return true;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
      return false;
    } catch {
      return false;
    }
  }

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Requests from curl, server-to-server clients and health checks may not send Origin.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedExactOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (!isProduction && isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    try {
      const hostname = new URL(origin).hostname;
      if (
        suffixes.some(
          (suffix) => hostname === suffix || hostname.endsWith(suffix),
        )
      ) {
        callback(null, true);
        return;
      }
    } catch {
      // Invalid Origin header falls through to denial below.
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploadsDir = process.env.UPLOAD_DIR ?? 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadsDir), {
    prefix: `/${uploadsDir}/`,
  });
  app.enableCors({
    origin: buildCorsOriginChecker(),
    credentials: true,
  });
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
void bootstrap();
