import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { IntegracaoWebhookService } from '../src/infrastructure/integracao/integracao-webhook.service';
import { bootstrapAuthUser } from './helpers/bootstrap-auth-user';

describe('IntegracaoParceiroController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET integracao sem API key retorna 401', () => {
    return request(app.getHttpServer())
      .get(
        '/api/v1/integracao/unidades/00000000-0000-4000-8000-000000000001/ativos',
      )
      .expect(401);
  });

  const runComDb = process.env.CI === 'true' || process.env.RUN_DB_E2E === '1';

  (runComDb ? it : it.skip)(
    'GET integracao com API key retorna ativos da unidade',
    async () => {
      const auth = await bootstrapAuthUser(prisma);
      const integracao = app.get(IntegracaoWebhookService);
      const apiKey = await integracao.regenerateApiKey(auth.empresaId);

      await request(app.getHttpServer())
        .post(`/unidades/${auth.unidadeId}/ativos`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ nome: `Ativo integracao ${Date.now()}` })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/integracao/unidades/${auth.unidadeId}/ativos`)
        .set('x-api-key', apiKey)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    },
  );

  (runComDb ? it : it.skip)(
    'GET integracao rejeita unidade de outra empresa',
    async () => {
      const authA = await bootstrapAuthUser(prisma);
      const authB = await bootstrapAuthUser(prisma);
      const integracao = app.get(IntegracaoWebhookService);
      const apiKeyA = await integracao.regenerateApiKey(authA.empresaId);

      await request(app.getHttpServer())
        .get(`/api/v1/integracao/unidades/${authB.unidadeId}/ativos`)
        .set('x-api-key', apiKeyA)
        .expect(404);
    },
  );
});
