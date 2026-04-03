import { Controller, Get } from '@nestjs/common';
import { AppService } from '../../application/app.service';
import { Public } from '../auth/public.decorator';

/**
 * Adaptador inbound HTTP (hexagonal).
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getRoot(): string {
    return this.appService.getHealthMessage();
  }
}
