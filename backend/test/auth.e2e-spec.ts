import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';

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

  function signTestUserToken(): string {
    const secret = process.env.SUPABASE_JWT_SECRET!;
    const url = process.env.SUPABASE_URL!.replace(/\/$/, '');
    return jwt.sign(
      {
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'teste@manucmms.local',
        role: 'authenticated',
      },
      secret,
      {
        algorithm: 'HS256',
        issuer: `${url}/auth/v1`,
        audience: 'authenticated',
        expiresIn: '15m',
      },
    );
  }

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
    const token = signTestUserToken();
    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'teste@manucmms.local',
      role: 'authenticated',
    });
  });
});
