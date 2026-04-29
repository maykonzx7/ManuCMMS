import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { signTestJwt } from './helpers/sign-test-jwt';

describe('Supabase JWT (e2e)', () => {
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

  it('GET /me sem Authorization retorna 401', () => {
    return request(app.getHttpServer()).get('/me').expect(401);
  });

  it('GET /me com Bearer inválido retorna 401', () => {
    return request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('GET /me com JWT assinado como Supabase retorna 200 e claims', async () => {
    const token = signTestJwt({
      sub: '00000000-0000-4000-8000-000000000001',
      email: 'teste@manucmms.local',
    });
    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as {
      userId: string;
      email: string;
      role: string;
      usuario: {
        id: string;
        idUnidade: string;
        email: string;
        nome: string;
        perfil: string;
      };
    };

    expect(body).toMatchObject({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'teste@manucmms.local',
      role: 'authenticated',
      usuario: {
        email: 'teste@manucmms.local',
        nome: 'teste',
        perfil: 'TECNICO',
      },
    });
    expect(body.usuario).toHaveProperty('id');
    expect(body.usuario).toHaveProperty('idUnidade');
  });
});
