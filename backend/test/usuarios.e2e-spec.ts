import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/persistence/prisma.service';
import { signTestJwt } from './helpers/sign-test-jwt';

describe('UsuariosController (e2e)', () => {
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

  it('GET /unidades/:id/usuarios sem token retorna 401', () => {
    return request(app.getHttpServer())
      .get('/unidades/00000000-0000-4000-8000-000000000001/usuarios')
      .expect(401);
  });

  const runComDb = process.env.CI === 'true' || process.env.RUN_DB_E2E === '1';

  (runComDb ? it : it.skip)(
    'GET /unidades/:id/usuarios retorna apenas usuarios da unidade autenticada',
    async () => {
      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
        email: 'teste-usuarios@manucmms.local',
      });

      const meResponse = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const unidadeId = (meResponse.body as { usuario: { idUnidade: string } })
        .usuario.idUnidade;

      await prisma.usuario.create({
        data: {
          authSub: `extra-${Date.now()}`,
          email: `colega-${Date.now()}@manucmms.local`,
          nome: 'Colega de unidade',
          idUnidade: unidadeId,
          perfil: 'SUPERVISOR',
        },
      });

      const outraUnidade = await prisma.unidadeFabril.create({
        data: {
          nome: `Filial usuarios ${Date.now()}`,
          localizacao: 'Caruaru - PE (e2e)',
        },
      });

      await prisma.usuario.create({
        data: {
          authSub: `fora-${Date.now()}`,
          email: `fora-${Date.now()}@manucmms.local`,
          nome: 'Usuario de outra unidade',
          idUnidade: outraUnidade.id,
          perfil: 'TECNICO',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/unidades/${unidadeId}/usuarios`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as Array<{
        id: string;
        idUnidade: string;
        nome: string;
        email: string;
        perfil: string;
      }>;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body.every((usuario) => usuario.idUnidade === unidadeId)).toBe(
        true,
      );
      expect(
        body.some((usuario) => usuario.nome === 'Usuario de outra unidade'),
      ).toBe(false);
    },
  );

  (runComDb ? it : it.skip)(
    'GET /unidades/:id/usuarios fora da unidade autenticada retorna 403',
    async () => {
      const outraUnidade = await prisma.unidadeFabril.create({
        data: {
          nome: `Filial bloqueada usuarios ${Date.now()}`,
          localizacao: 'Garanhuns - PE (e2e)',
        },
      });

      const token = signTestJwt({
        sub: '00000000-0000-4000-8000-000000000003',
      });

      await request(app.getHttpServer())
        .get(`/unidades/${outraUnidade.id}/usuarios`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    },
  );
});
