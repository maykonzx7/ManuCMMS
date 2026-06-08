import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import type { AuthorizePlatformOperatorUseCase } from './authorize-platform-operator.use-case';

const PERFIL_HIERARCHY: Record<string, number> = {
  TECNICO: 10,
  SUPERVISOR: 20,
  GESTOR: 30,
  AUDITOR: 40,
  ADMIN: 50,
};

export function assertUsuarioGestaoTargetAllowed(input: {
  actor: UsuarioLocalContext | undefined;
  targetId: string;
  targetEmail: string;
  targetPerfil: string;
  authorizePlatformOperator: AuthorizePlatformOperatorUseCase;
  action: string;
}): void {
  if (!input.actor?.empresa?.id) {
    throw new ForbiddenException(
      'Contexto da empresa autenticada nao esta disponivel.',
    );
  }

  if (input.actor.id === input.targetId) {
    throw new BadRequestException(`Voce nao pode ${input.action} o proprio usuario.`);
  }

  if (input.authorizePlatformOperator.isProtectedOperatorEmail(input.targetEmail)) {
    throw new ForbiddenException(
      'Nao e permitido alterar a conta do operador da plataforma.',
    );
  }

  const actorLevel = PERFIL_HIERARCHY[input.actor.perfil.trim().toUpperCase()] ?? 0;
  const targetLevel =
    PERFIL_HIERARCHY[input.targetPerfil.trim().toUpperCase()] ?? 0;
  if (targetLevel >= actorLevel) {
    throw new ForbiddenException(
      'Nao e permitido alterar usuario com perfil igual ou superior ao seu.',
    );
  }
}
