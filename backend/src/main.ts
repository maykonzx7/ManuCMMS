import { ensureDatabaseUrl } from './config/compose-database-url';
import './presentation/auth/request-augment';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

ensureDatabaseUrl();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
