import { BadRequestException } from '@nestjs/common';

const SLUG_RESERVED = new Set([
  'admin',
  'api',
  'login',
  'root',
  'system',
]);

export function normalizeCompanyName(value: string | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

export function buildCompanySlug(
  rawSlug: string | undefined,
  nomeEmpresa: string,
) {
  const base = (rawSlug?.trim() || nomeEmpresa)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  if (!base || base.length < 3) {
    throw new BadRequestException(
      'slug da empresa invalido; use ao menos 3 caracteres alfanumericos.',
    );
  }

  if (SLUG_RESERVED.has(base)) {
    throw new BadRequestException('slug da empresa reservado.');
  }

  return base;
}

export function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

export function normalizeDisplayName(value: string | undefined, fallback: string) {
  const nome = value?.trim().replace(/\s+/g, ' ') ?? '';
  return nome.length > 0 ? nome : fallback;
}

export function normalizePortalPath(value: string | undefined, fallback: string) {
  const raw = value?.trim() || fallback;
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.replace(/\/+$/, '') || fallback;
}

export function buildInviteLink(input: {
  baseUrl: string;
  invitePath: string;
  token: string;
  emailDestino: string;
  empresaSlug: string;
}) {
  const url = new URL(input.baseUrl);
  url.pathname = normalizePortalPath(input.invitePath, '/convite');
  url.searchParams.set('token', input.token);
  url.searchParams.set('email', input.emailDestino);
  url.searchParams.set('empresa', input.empresaSlug);
  return url.toString();
}

export function resolveInviteFrontendBaseUrl(input: {
  frontendPublicBaseUrl?: string;
  frontendNgrokBaseUrl?: string;
  nodeEnv?: string;
}) {
  const baseUrl =
    input.frontendNgrokBaseUrl?.trim() || input.frontendPublicBaseUrl?.trim();
  if (baseUrl) {
    return baseUrl;
  }
  if (input.nodeEnv === 'production') {
    throw new BadRequestException(
      'FRONTEND_PUBLIC_BASE_URL deve ser configurada em producao para gerar links de convite validos.',
    );
  }
  return 'http://localhost:5173';
}

export function buildInviteEmailTemplate(input: {
  nomeDestinatario: string;
  nomeEmpresa: string;
  linkConvite: string;
  dataExpiracao: string;
  cargoCodigo: string;
  cargoExibicao?: string;
  nomeUnidadeDestino?: string | null;
}) {
  const cargoExibicao = input.cargoExibicao?.trim() || input.cargoCodigo;
  const unidadeTexto = input.nomeUnidadeDestino
    ? `Unidade vinculada: ${input.nomeUnidadeDestino}.`
    : 'Escopo inicial: corporativo da empresa.';

  const subject = `[${input.nomeEmpresa}] Convite de acesso ao ManuCMMS`;
  const text = [
    `Ola, ${input.nomeDestinatario}!`,
    '',
    `Voce recebeu um convite para acessar o ambiente da empresa ${input.nomeEmpresa} no ManuCMMS.`,
    `Perfil inicial: ${cargoExibicao}.`,
    unidadeTexto,
    '',
    `Para ativar seu acesso, use o link exclusivo abaixo:`,
    input.linkConvite,
    '',
    `Validade do convite: ${input.dataExpiracao}.`,
    '',
    `Importante: entre/crie conta com o mesmo email que recebeu este convite.`,
    `Se voce nao reconhece este convite, ignore esta mensagem.`,
    '',
    `Atenciosamente,`,
    `Equipe ${input.nomeEmpresa} via ManuCMMS`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f3f5f7;font-family:Segoe UI,Arial,sans-serif;color:#173042;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#23485c;padding:28px 32px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;">ManuCMMS</div>
                <div style="font-size:28px;font-weight:700;margin-top:8px;">Convite de acesso</div>
                <div style="font-size:13px;opacity:.9;margin-top:6px;">${input.nomeEmpresa}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;">Ola, <strong>${input.nomeDestinatario}</strong>!</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  Voce recebeu um convite para acessar o ambiente da empresa
                  <strong>${input.nomeEmpresa}</strong> no ManuCMMS.
                </p>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                  Perfil inicial: <strong>${cargoExibicao}</strong><br />
                  ${unidadeTexto}
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  Para ativar seu acesso, clique no botao abaixo:
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${input.linkConvite}" style="display:inline-block;background:#23485c;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:600;">
                    Ativar meu acesso
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4d6472;">
                  Validade do convite: <strong>${input.dataExpiracao}</strong>.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4d6472;">
                  Entre ou crie sua conta com o mesmo email que recebeu este convite.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4d6472;">
                  Se o botao nao funcionar, copie e cole este link no navegador:
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;word-break:break-word;">
                  <a href="${input.linkConvite}" style="color:#23485c;">${input.linkConvite}</a>
                </p>
                <hr style="border:none;border-top:1px solid #d9e0e4;margin:24px 0;" />
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6a7d88;">
                  Se voce nao reconhece este convite, ignore este email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#eef2f4;font-size:12px;color:#5f7280;">
                Equipe ${input.nomeEmpresa} via ManuCMMS
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
