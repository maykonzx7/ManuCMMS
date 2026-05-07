import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { signTestJwt } from './helpers/sign-test-jwt';

describe('AtivosController (e2e)', () => {
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

  it('GET /unidades/:id/ativos sem token retorna 401', () => {
    return request(app.getHttpServer())
      .get('/unidades/00000000-0000-4000-8000-000000000001/ativos')
      .expect(401);
  });

  const runComDb = process.env.CI === 'true' || process.env.RUN_DB_E2E === '1';

  (runComDb ? it : it.skip)(
    'GET /unidades/:id/ativos com JWT retorna lista (seed com ativo dev)',
    async () => {
      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });
      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const lista = unidadesRes.body as Array<{ id: string }>;
      expect(lista.length).toBeGreaterThanOrEqual(1);
      const unidadeId = lista[0].id;

      const res = await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as Array<{
        id: string;
        nome: string;
        status: string;
        limiteTemp: number;
      }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const first = body[0];
      expect(typeof first.nome).toBe('string');
      expect(['OPERACIONAL', 'MANUTENCAO', 'FALHA']).toContain(first.status);
      expect(first.limiteTemp).toBe(48);
    },
  );

  (runComDb ? it : it.skip)(
    'GET /unidades/:id/ativos fora da unidade autenticada retorna 403',
    async () => {
      const outraUnidade = await prisma.unidadeFabril.create({
        data: {
          nome: `Filial ativos ${Date.now()}`,
          localizacao: 'Olinda - PE (e2e)',
        },
      });

      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });

      await request(app.getHttpServer())
        .get(`/unidades/${outraUnidade.id}/ativos`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    },
  );

  (runComDb ? it : it.skip)(
    'CRUD de ativo: detail + update + delete',
    async () => {
      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });

      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const unidadeId = (unidadesRes.body as Array<{ id: string }>)[0].id;

      const created = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `Ativo CRUD ${Date.now()}` })
        .expect(201);
      const ativoId = (created.body as { id: string }).id;

      await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/ativos/${ativoId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const updated = await request(app.getHttpServer())
        .patch(`/unidades/${unidadeId}/ativos/${ativoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Ativo atualizado', limiteTemp: 55, status: 'FALHA' })
        .expect(200);
      expect((updated.body as { nome: string }).nome).toBe('Ativo atualizado');
      expect((updated.body as { status: string }).status).toBe('FALHA');

      await request(app.getHttpServer())
        .delete(`/unidades/${unidadeId}/ativos/${ativoId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/ativos/${ativoId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    },
  );

  (runComDb ? it : it.skip)(
    'DELETE ativo com OS vinculada retorna erro de negócio',
    async () => {
      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });

      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const unidadeId = (unidadesRes.body as Array<{ id: string }>)[0].id;

      const created = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `Ativo bloqueado ${Date.now()}` })
        .expect(201);
      const ativoId = (created.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          idAtivo: ativoId,
          tipo: 'PREVENTIVA',
          descricao: `vinculo delete ${Date.now()}`,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/unidades/${unidadeId}/ativos/${ativoId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    },
  );
});
