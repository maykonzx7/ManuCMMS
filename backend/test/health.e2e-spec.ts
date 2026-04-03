import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** Resposta típica do @nestjs/terminus */
interface TerminusHealthBody {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

describe('HealthController (e2e)', () => {
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

  it('GET /health — responde com status do Terminus (200 se Docker no ar, 503 se indisponível)', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    const body = res.body as TerminusHealthBody;

    expect([200, 503]).toContain(res.status);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('info');

    if (res.status === 200) {
      expect(body.status).toBe('ok');
      expect(body.info?.postgres?.status).toBe('up');
      expect(body.info?.mongodb?.status).toBe('up');
      expect(body.info?.rabbitmq?.status).toBe('up');
    }
  });
});
