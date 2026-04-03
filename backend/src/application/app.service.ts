import { Injectable } from '@nestjs/common';

/**
 * Camada application: orquestração de casos de uso.
 * Serviços de domínio e repositórios serão injetados aqui conforme o projeto evoluir.
 */
@Injectable()
export class AppService {
  getHealthMessage(): string {
    return 'ManuCMMS API — fase 0';
  }
}
