import { Module } from '@nestjs/common';
import { AppService } from '../application/app.service';
import { AppController } from './http/app.controller';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class PresentationModule {}
