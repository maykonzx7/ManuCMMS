import { Controller, Get } from '@nestjs/common';
import { AppService } from '../../application/app.service';

/**
 * Adaptador inbound HTTP (hexagonal).
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): string {
    return this.appService.getHealthMessage();
  }
}
