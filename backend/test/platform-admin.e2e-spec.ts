import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { signTestJwt } from './helpers/sign-test-jwt';

describe('PlatformAdminController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.PLATFORM_ALLOW_EMAIL_FALLBACK = 'false';
    process.env.PLATFORM_OWNER_EMAILS = 'plataforma@manucmms.local';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.PLATFORM_ALLOW_EMAIL_FALLBACK;
    delete process.env.PLATFORM_OWNER_EMAILS;
  });

  it('GET /platform/painel bloqueia usuario comum', async () => {
    const token = signTestJwt({
      sub: randomUUID(),
      email: 'usuario-comum@manucmms.local',
      appMetadata: { platform_owner: false },
    });

    await request(app.getHttpServer())
      .get('/platform/painel')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /platform/painel permite operador de plataforma com claim forte', async () => {
    const token = signTestJwt({
      sub: randomUUID(),
      email: 'plataforma@manucmms.local',
      appMetadata: { platform_owner: true },
    });

    const res = await request(app.getHttpServer())
      .get('/platform/painel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as {
      resumo?: {
        empresasTotal?: number;
        usuariosTotal?: number;
      };
      clientesTop?: unknown[];
    };
    expect(typeof body.resumo?.empresasTotal).toBe('number');
    expect(typeof body.resumo?.usuariosTotal).toBe('number');
    expect(Array.isArray(body.clientesTop)).toBe(true);
  });
});
