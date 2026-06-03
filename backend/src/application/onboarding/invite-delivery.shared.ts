import { createHash, randomBytes } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { IEmailPort } from '../../domain/ports/email.port';
import {
  buildInviteEmailTemplate,
  buildInviteLink,
  normalizePortalPath,
  resolveInviteFrontendBaseUrl,
} from './onboarding.shared';

export type InviteEmailDeliveryStatus =
  | 'ENVIADO'
  | 'ENVIANDO'
  | 'NAO_CONFIGURADO'
  | 'FALHOU';

export type InviteEmailPayload = {
  emailDestino: string;
  nomeDestino: string;
  nomeEmpresa: string;
  empresaSlug: string;
  token: string;
  expiraEm: Date;
  conviteCargoCodigo: string;
  cargoExibicao: string;
  unidadeDestinoNome: string | null;
};

export function createInviteToken() {
  const token = randomBytes(24).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function buildInviteAccessLink(
  config: ConfigService,
  input: Pick<
    InviteEmailPayload,
    'emailDestino' | 'empresaSlug' | 'token'
  >,
) {
  const frontendBaseUrl = resolveInviteFrontendBaseUrl({
    frontendNgrokBaseUrl: config.get<string>('FRONTEND_NGROK_PUBLIC_BASE_URL'),
    frontendPublicBaseUrl: config.get<string>('FRONTEND_PUBLIC_BASE_URL'),
    nodeEnv: config.get<string>('NODE_ENV'),
  });
  const invitePath = normalizePortalPath(
    config.get<string>('FRONTEND_INVITE_PORTAL_PATH'),
    '/convite',
  );

  return buildInviteLink({
    baseUrl: frontendBaseUrl,
    invitePath,
    token: input.token,
    emailDestino: input.emailDestino,
    empresaSlug: input.empresaSlug,
  });
}

export function formatInviteExpiration(expiraEm: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(expiraEm);
}

export function resolveInviteEmailDeliveryStatus(
  emailPort: IEmailPort,
): InviteEmailDeliveryStatus {
  return emailPort.isConfigured() ? 'ENVIANDO' : 'NAO_CONFIGURADO';
}

export async function sendInviteEmail(
  emailPort: IEmailPort,
  payload: InviteEmailPayload,
  inviteLink: string,
): Promise<InviteEmailDeliveryStatus> {
  if (!emailPort.isConfigured()) {
    return 'NAO_CONFIGURADO';
  }

  try {
    const template = buildInviteEmailTemplate({
      nomeDestinatario: payload.nomeDestino,
      nomeEmpresa: payload.nomeEmpresa,
      linkConvite: inviteLink,
      dataExpiracao: formatInviteExpiration(payload.expiraEm),
      cargoCodigo: payload.conviteCargoCodigo,
      cargoExibicao: payload.cargoExibicao,
      nomeUnidadeDestino: payload.unidadeDestinoNome,
    });
    await emailPort.send({
      to: payload.emailDestino,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    return 'ENVIADO';
  } catch {
    return 'FALHOU';
  }
}

export function queueInviteEmail(
  emailPort: IEmailPort,
  logger: { warn: (message: string) => void },
  payload: InviteEmailPayload,
  inviteLink: string,
) {
  void sendInviteEmail(emailPort, payload, inviteLink).then((status) => {
    if (status === 'FALHOU') {
      logger.warn(
        `Falha ao enviar email de convite para ${payload.emailDestino}.`,
      );
    }
  });
}
