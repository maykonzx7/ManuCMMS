import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { bootstrapAuthUser } from './helpers/bootstrap-auth-user';

describe('UnidadesController (e2e)', () => {
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

  it('GET /unidades sem token retorna 401', () => {
    return request(app.getHttpServer()).get('/unidades').expect(401);
  });

  const runComDb = process.env.CI === 'true' || process.env.RUN_DB_E2E === '1';

  (runComDb ? it : it.skip)(
    'GET /unidades com JWT retorna apenas a unidade do contexto autenticado',
    async () => {
      const auth = await bootstrapAuthUser(prisma, { perfil: 'TECNICO' });
      await prisma.unidadeFabril.create({
        data: {
          empresaId: auth.empresaId,
          nome: `Filial bloqueada ${Date.now()}`,
          localizacao: 'Recife - PE (e2e)',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);

      const body = res.body as Array<{
        id: string;
        nome: string;
        localizacao: string;
      }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(auth.unidadeId);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('nome');
      expect(body[0]).toHaveProperty('localizacao');
    },
  );

  (runComDb ? it : it.skip)(
    'GET /unidades/:id retorna detalhe da unidade autorizada',
    async () => {
      const auth = await bootstrapAuthUser(prisma);

      const listaRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);
      const unidadeId = (listaRes.body as Array<{ id: string }>)[0].id;

      const detailRes = await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);

      expect((detailRes.body as { id: string }).id).toBe(unidadeId);
    },
  );
});
