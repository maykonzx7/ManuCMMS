import { BadRequestException } from '@nestjs/common';
import {
  buildTransactionalEmailTemplate,
  escapeHtml,
} from '../shared/email/email-template.shared';

const SLUG_RESERVED = new Set(['admin', 'api', 'login', 'root', 'system']);

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

export function normalizeDisplayName(
  value: string | undefined,
  fallback: string,
) {
  const nome = value?.trim().replace(/\s+/g, ' ') ?? '';
  return nome.length > 0 ? nome : fallback;
}

export function normalizePortalPath(
  value: string | undefined,
  fallback: string,
) {
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
  frontendBaseUrl: string;
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
    `Olá, ${input.nomeDestinatario}!`,
    '',
    `Você recebeu um convite para acessar o ambiente da empresa ${input.nomeEmpresa} no ManuCMMS.`,
    `Perfil inicial: ${cargoExibicao}.`,
    unidadeTexto,
    '',
    'Para ativar seu acesso, use o link exclusivo abaixo:',
    input.linkConvite,
    '',
    `Validade do convite: ${input.dataExpiracao}.`,
    '',
    'Importante: entre ou crie conta com o mesmo e-mail que recebeu este convite.',
    'Se você não reconhece este convite, ignore esta mensagem.',
    '',
    'Atenciosamente,',
    `Equipe ${input.nomeEmpresa} via ManuCMMS`,
  ].join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Convite de acesso',
    title: 'Ative seu acesso',
    subtitle: input.nomeEmpresa,
    greeting: `Olá, <strong style="color:#e8eef3;">${escapeHtml(input.nomeDestinatario)}</strong>!`,
    paragraphs: [
      `Você recebeu um convite para acessar o ambiente da empresa <strong style="color:#e8eef3;">${escapeHtml(input.nomeEmpresa)}</strong> no ManuCMMS.`,
      `Perfil inicial: <strong style="color:#e8eef3;">${escapeHtml(cargoExibicao)}</strong>. ${escapeHtml(unidadeTexto)}`,
      `Validade do convite: <strong style="color:#e8eef3;">${escapeHtml(input.dataExpiracao)}</strong>.`,
      'Entre ou crie sua conta com o mesmo e-mail que recebeu este convite.',
    ],
    cta: {
      label: 'Ativar meu acesso',
      href: input.linkConvite,
    },
    footerNote:
      'Se você não reconhece este convite, ignore este e-mail com segurança.',
    companyName: input.nomeEmpresa,
  });

  return { subject, text, html };
}
