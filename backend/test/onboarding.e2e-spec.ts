import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { signTestJwt } from './helpers/sign-test-jwt';

describe('Onboarding global de empresa (e2e)', () => {
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

  it('POST /empresas com usuario comum autenticado retorna 403', async () => {
    const suffix = randomUUID().slice(0, 8);
    const token = signTestJwt({
      sub: randomUUID(),
      email: `comum-${suffix}@manucmms.local`,
      appMetadata: { platform_owner: false },
    });

    await request(app.getHttpServer())
      .post('/empresas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nomeEmpresa: `Empresa Sem Privilegio ${suffix}`,
        slug: `empresa-sem-privilegio-${suffix}`,
        emailResponsavel: `owner-${suffix}@manucmms.local`,
      })
      .expect(403);
  });

  it('POST /empresas sem Authorization retorna 401', () => {
    const suffix = randomUUID().slice(0, 8);
    return request(app.getHttpServer())
      .post('/empresas')
      .send({
        nomeEmpresa: `Empresa Sem Auth ${suffix}`,
        slug: `empresa-sem-auth-${suffix}`,
        emailResponsavel: `owner-${suffix}@manucmms.local`,
      })
      .expect(401);
  });
});
