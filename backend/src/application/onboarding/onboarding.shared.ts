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

export function buildInviteEmailTemplate(input: {
  nomeDestinatario: string;
  nomeEmpresa: string;
  linkConvite: string;
  dataExpiracao: string;
  cargoCodigo: string;
  nomeUnidadeDestino?: string | null;
}) {
  const unidadeTexto = input.nomeUnidadeDestino
    ? `Unidade vinculada: ${input.nomeUnidadeDestino}.`
    : 'Escopo inicial: corporativo da empresa.';

  const subject = `Seu acesso ao ManuCMMS foi liberado`;
  const text = [
    `Ola, ${input.nomeDestinatario},`,
    '',
    `Voce recebeu um convite para acessar o ambiente da empresa ${input.nomeEmpresa} no ManuCMMS.`,
    `Cargo inicial: ${input.cargoCodigo}.`,
    unidadeTexto,
    '',
    `Para concluir seu primeiro acesso, use o link abaixo:`,
    input.linkConvite,
    '',
    `Esse convite expira em ${input.dataExpiracao}.`,
    '',
    `Se voce nao esperava este convite, ignore este email.`,
    '',
    'Equipe ManuCMMS',
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
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;">Ola, <strong>${input.nomeDestinatario}</strong>,</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  Voce recebeu um convite para acessar o ambiente da empresa
                  <strong>${input.nomeEmpresa}</strong> no ManuCMMS.
                </p>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                  Cargo inicial: <strong>${input.cargoCodigo}</strong><br />
                  ${unidadeTexto}
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  Para concluir seu primeiro acesso, clique no botao abaixo:
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${input.linkConvite}" style="display:inline-block;background:#23485c;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:600;">
                    Concluir primeiro acesso
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4d6472;">
                  Este convite expira em <strong>${input.dataExpiracao}</strong>.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4d6472;">
                  Se o botao nao funcionar, copie e cole este link no navegador:
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;word-break:break-word;">
                  <a href="${input.linkConvite}" style="color:#23485c;">${input.linkConvite}</a>
                </p>
                <hr style="border:none;border-top:1px solid #d9e0e4;margin:24px 0;" />
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6a7d88;">
                  Se voce nao esperava este convite, ignore este email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#eef2f4;font-size:12px;color:#5f7280;">
                Equipe ManuCMMS
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
