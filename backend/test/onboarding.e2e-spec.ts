import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Onboarding global de empresa (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.PLATFORM_ADMIN_KEY = 'e2e-platform-key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.PLATFORM_ADMIN_KEY;
  });

  it('POST /empresas sem x-platform-admin-key retorna 403', () => {
    const suffix = randomUUID().slice(0, 8);
    return request(app.getHttpServer())
      .post('/empresas')
      .send({
        nomeEmpresa: `Empresa Sem Chave ${suffix}`,
        slug: `empresa-sem-chave-${suffix}`,
        emailResponsavel: `owner-sem-chave-${suffix}@manucmms.local`,
      })
      .expect(403);
  });

  it('POST /empresas com x-platform-admin-key valida cria onboarding inicial', async () => {
    const suffix = randomUUID().slice(0, 8);
    const res = await request(app.getHttpServer())
      .post('/empresas')
      .set('x-platform-admin-key', 'e2e-platform-key')
      .send({
        nomeEmpresa: `Empresa Com Chave ${suffix}`,
        slug: `empresa-com-chave-${suffix}`,
        emailResponsavel: `owner-com-chave-${suffix}@manucmms.local`,
      })
      .expect(201);

    const body = res.body as {
      empresa?: { id?: string; slug?: string };
      convite?: { id?: string; cargoCodigo?: string };
    };
    expect(body.empresa?.id).toBeTruthy();
    expect(body.empresa?.slug).toBe(`empresa-com-chave-${suffix}`);
    expect(body.convite?.id).toBeTruthy();
    expect(body.convite?.cargoCodigo).toBe('ADMIN');
  });
});

