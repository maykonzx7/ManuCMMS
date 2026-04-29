import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { signTestJwt } from './helpers/sign-test-jwt';

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
      await prisma.unidadeFabril.create({
        data: {
          nome: `Filial bloqueada ${Date.now()}`,
          localizacao: 'Recife - PE (e2e)',
        },
      });

      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });
      const res = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as Array<{
        id: string;
        nome: string;
        localizacao: string;
      }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('nome');
      expect(body[0]).toHaveProperty('localizacao');
    },
  );
});
