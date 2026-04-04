import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { signTestJwt } from './helpers/sign-test-jwt';

describe('OrdensServicoController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET ordens-servico sem token retorna 401', () => {
    return request(app.getHttpServer())
      .get('/unidades/00000000-0000-4000-8000-000000000001/ordens-servico')
      .expect(401);
  });

  it('PATCH fechar OS sem token retorna 401', () => {
    return request(app.getHttpServer())
      .patch(
        '/unidades/00000000-0000-4000-8000-000000000001/ordens-servico/00000000-0000-4000-8000-000000000002/fechar',
      )
      .send({ assinaturaDigital: 'x', fotoAnexo: 'https://a.invalid/f.jpg' })
      .expect(401);
  });

  const runComDb = process.env.CI === 'true' || process.env.RUN_DB_E2E === '1';

  (runComDb ? it : it.skip)(
    'GET ordens-servico com JWT retorna lista (seed com OS dev)',
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
        .get(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as Array<{
        id: string;
        tipo: string;
        status: string;
        ativoNome: string;
      }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const aberta = body.find((o) => o.status === 'ABERTA');
      expect(aberta).toBeDefined();
      expect(typeof aberta?.ativoNome).toBe('string');
    },
  );

  (runComDb ? it : it.skip)(
    'PATCH fechar OS preditiva: RN-02 + RN-14 (ativo OPERACIONAL)',
    async () => {
      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });
      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const unidades = unidadesRes.body as Array<{ id: string }>;
      const unidadeId = unidades[0].id;

      const ativosRes = await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const ativos = ativosRes.body as Array<{ id: string }>;
      expect(ativos.length).toBeGreaterThanOrEqual(1);
      const idAtivo = ativos[0].id;

      const criar = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          idAtivo,
          tipo: 'PREDITIVA',
          descricao: `e2e fechar ${Date.now()}`,
        })
        .expect(201);
      const osId = (criar.body as { id: string }).id;

      const fechar = await request(app.getHttpServer())
        .patch(`/unidades/${unidadeId}/ordens-servico/${osId}/fechar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          assinaturaDigital: 'assinatura-e2e',
          fotoAnexo: 'https://storage.invalid/bucket/foto-intervencao.jpg',
        })
        .expect(200);

      const fechada = fechar.body as { status: string; dataFechamento: string };
      expect(fechada.status).toBe('CONCLUIDA');
      expect(fechada.dataFechamento).toBeDefined();
    },
  );
});
