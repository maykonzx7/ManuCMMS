import { ensureDatabaseUrl } from './config/compose-database-url';
import './presentation/auth/request-augment';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

ensureDatabaseUrl();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
