import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { bootstrapAuthUser } from './helpers/bootstrap-auth-user';

const ASSINATURA_E2E =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function fecharOsRequest(
  app: INestApplication<App>,
  unidadeId: string,
  osId: string,
  token: string,
) {
  return request(app.getHttpServer())
    .patch(`/unidades/${unidadeId}/ordens-servico/${osId}/fechar`)
    .set('Authorization', `Bearer ${token}`)
    .field('descricaoSolucao', 'Solucao aplicada no teste e2e')
    .field('assinaturaImagemDataUrl', ASSINATURA_E2E)
    .attach('fotoAnexo', Buffer.from('fake-image-content'), {
      filename: 'foto-intervencao.jpg',
      contentType: 'image/jpeg',
    });
}

describe('OrdensServicoController (e2e)', () => {
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
      .send({ fotoAnexo: 'https://a.invalid/f.jpg' })
      .expect(401);
  });

  const runComDb = process.env.CI === 'true' || process.env.RUN_DB_E2E === '1';

  (runComDb ? it : it.skip)(
    'GET ordens-servico com JWT retorna lista no contexto autenticado',
    async () => {
      const auth = await bootstrapAuthUser(prisma);
      const ativo = await request(app.getHttpServer())
        .post(`/unidades/${auth.unidadeId}/ativos`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ nome: `Ativo lista OS ${Date.now()}` })
        .expect(201);
      const idAtivo = (ativo.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`/unidades/${auth.unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({
          idAtivo,
          tipo: 'PREVENTIVA',
          descricao: `os lista ${Date.now()}`,
        })
        .expect(201);

      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);
      const lista = unidadesRes.body as Array<{ id: string }>;
      expect(lista.length).toBeGreaterThanOrEqual(1);
      const unidadeId = lista[0].id;

      const res = await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
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
      const auth = await bootstrapAuthUser(prisma);
      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);
      const unidades = unidadesRes.body as Array<{ id: string }>;
      const unidadeId = unidades[0].id;

      const ativoNovo = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ nome: `E2E fechar ${Date.now()}` })
        .expect(201);
      const idAtivo = (ativoNovo.body as { id: string }).id;

      const criar = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({
          idAtivo,
          tipo: 'PREDITIVA',
          descricao: `e2e fechar ${Date.now()}`,
        })
        .expect(201);
      const osId = (criar.body as { id: string }).id;

      const fechar = await fecharOsRequest(app, unidadeId, osId, auth.token).expect(200);

      const fechada = fechar.body as { status: string; dataFechamento: string };
      expect(fechada.status).toBe('CONCLUIDA');
      expect(fechada.dataFechamento).toBeDefined();
    },
  );

  (runComDb ? it : it.skip)(
    'GET ordens-servico fora da unidade autenticada retorna 403',
    async () => {
      const auth = await bootstrapAuthUser(prisma);
      const outraEmpresa = await prisma.empresa.create({
        data: {
          nomeEmpresa: `Empresa Ordens Bloqueada ${Date.now()}`,
          slug: `empresa-ordens-bloqueada-${Date.now()}`,
        },
      });
      const outraUnidade = await prisma.unidadeFabril.create({
        data: {
          empresaId: outraEmpresa.id,
          nome: `Filial ordens ${Date.now()}`,
          localizacao: 'Petrolina - PE (e2e)',
        },
      });

      await request(app.getHttpServer())
        .get(`/unidades/${outraUnidade.id}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(403);
    },
  );

  (runComDb ? it : it.skip)(
    'detail + update de OS aberta',
    async () => {
      const auth = await bootstrapAuthUser(prisma);
      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);
      const unidadeId = (unidadesRes.body as Array<{ id: string }>)[0].id;

      const ativo = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ nome: `Ativo OS CRUD ${Date.now()}` })
        .expect(201);
      const idAtivo = (ativo.body as { id: string }).id;

      const os = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({
          idAtivo,
          tipo: 'PREVENTIVA',
          descricao: `descricao inicial ${Date.now()}`,
        })
        .expect(201);
      const osId = (os.body as { id: string }).id;

      await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/ordens-servico/${osId}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);

      const updated = await request(app.getHttpServer())
        .patch(`/unidades/${unidadeId}/ordens-servico/${osId}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ descricao: 'descricao atualizada' })
        .expect(200);

      expect((updated.body as { descricao: string }).descricao).toBe(
        'descricao atualizada',
      );
    },
  );

  (runComDb ? it : it.skip)(
    'PATCH OS concluida: ADMIN pode editar descricao (RN-15)',
    async () => {
      const auth = await bootstrapAuthUser(prisma);
      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);
      const unidadeId = (unidadesRes.body as Array<{ id: string }>)[0].id;

      const ativo = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ nome: `Ativo update concluida ${Date.now()}` })
        .expect(201);
      const idAtivo = (ativo.body as { id: string }).id;

      const os = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({
          idAtivo,
          tipo: 'PREDITIVA',
          descricao: `os para fechar ${Date.now()}`,
        })
        .expect(201);
      const osId = (os.body as { id: string }).id;

      await fecharOsRequest(app, unidadeId, osId, auth.token).expect(200);

      const updated = await request(app.getHttpServer())
        .patch(`/unidades/${unidadeId}/ordens-servico/${osId}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ descricao: 'descricao corrigida pelo gestor' })
        .expect(200);

      expect((updated.body as { descricao: string }).descricao).toBe(
        'descricao corrigida pelo gestor',
      );
    },
  );

  (runComDb ? it : it.skip)(
    'PATCH fechar OS sem assinatura retorna 400 (RN-02)',
    async () => {
      const auth = await bootstrapAuthUser(prisma);
      const unidadesRes = await request(app.getHttpServer())
        .get('/unidades')
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);
      const unidadeId = (unidadesRes.body as Array<{ id: string }>)[0].id;

      const ativo = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ativos`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ nome: `Ativo sem assinatura ${Date.now()}` })
        .expect(201);
      const idAtivo = (ativo.body as { id: string }).id;

      const os = await request(app.getHttpServer())
        .post(`/unidades/${unidadeId}/ordens-servico`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({
          idAtivo,
          tipo: 'PREDITIVA',
          descricao: `os sem assinatura ${Date.now()}`,
        })
        .expect(201);
      const osId = (os.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/unidades/${unidadeId}/ordens-servico/${osId}/fechar`)
        .set('Authorization', `Bearer ${auth.token}`)
        .field('descricaoSolucao', 'Tentativa sem assinatura')
        .attach('fotoAnexo', Buffer.from('fake-image-content'), {
          filename: 'foto-intervencao.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    },
  );
});
