const BRAND = {
  name: 'ManuCMMS',
  primary: '#008080',
  headerBg: '#0e1419',
  cardBg: '#171d25',
  text: '#e8eef3',
  muted: '#9eb0bd',
  border: '#2a3a47',
  accent: '#66c0f4',
} as const;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function resolveBrandLogoUrl(frontendBaseUrl: string): string {
  const base = frontendBaseUrl.replace(/\/+$/, '');
  return `${base}/manucmms-icon-oficial.png`;
}

export type TransactionalEmailInput = {
  frontendBaseUrl: string;
  preheader?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  greeting?: string;
  paragraphs?: string[];
  details?: Array<{ label: string; value: string }>;
  quote?: string;
  cta?: { label: string; href: string };
  footerNote?: string;
  companyName?: string;
};

export function buildTransactionalEmailTemplate(input: TransactionalEmailInput) {
  const logoUrl = resolveBrandLogoUrl(input.frontendBaseUrl);
  const preheader = input.preheader ?? input.title;
  const greeting = input.greeting
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.text};">${input.greeting}</p>`
    : '';
  const paragraphs = (input.paragraphs ?? [])
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.muted};">${paragraph}</p>`,
    )
    .join('');
  const details =
    input.details && input.details.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#111820;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
          ${input.details
            .map(
              (item, index) => `<tr>
                <td style="padding:12px 16px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.muted};border-top:${index === 0 ? '0' : `1px solid ${BRAND.border}`};width:34%;">${escapeHtml(item.label)}</td>
                <td style="padding:12px 16px;font-size:15px;color:${BRAND.text};border-top:${index === 0 ? '0' : `1px solid ${BRAND.border}`};">${escapeHtml(item.value)}</td>
              </tr>`,
            )
            .join('')}
        </table>`
      : '';
  const quote = input.quote
    ? `<div style="margin:0 0 20px;padding:16px 18px;border-left:3px solid ${BRAND.primary};background:#111820;border-radius:0 10px 10px 0;color:${BRAND.text};font-size:15px;line-height:1.6;">${escapeHtml(input.quote)}</div>`
    : '';
  const cta = input.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.primary};">
            <a href="${input.cta.href}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:.02em;">${escapeHtml(input.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : '';
  const subtitle = input.subtitle
    ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(input.subtitle)}</p>`
    : '';
  const footerCompany = input.companyName
    ? `${escapeHtml(input.companyName)} via ${BRAND.name}`
    : BRAND.name;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.headerBg};font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.headerBg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:${BRAND.cardBg};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px;background:linear-gradient(180deg,#13202b 0%,${BRAND.cardBg} 100%);border-bottom:1px solid ${BRAND.border};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:56px;vertical-align:middle;">
                      <img src="${logoUrl}" alt="${BRAND.name}" width="48" height="48" style="display:block;border-radius:10px;" />
                    </td>
                    <td style="vertical-align:middle;padding-left:12px;">
                      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.accent};">${escapeHtml(input.eyebrow ?? BRAND.name)}</div>
                      <div style="margin-top:4px;font-size:24px;font-weight:700;line-height:1.2;color:${BRAND.text};">${escapeHtml(input.title)}</div>
                      ${subtitle}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 12px;">
                ${greeting}
                ${paragraphs}
                ${details}
                ${quote}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 24px;border-top:1px solid ${BRAND.border};font-size:12px;line-height:1.6;color:${BRAND.muted};">
                ${input.footerNote ? `<p style="margin:0 0 8px;">${escapeHtml(input.footerNote)}</p>` : ''}
                <p style="margin:0;">${footerCompany}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return html;
}

export function buildOrdemServicoAtribuidaEmail(input: {
  frontendBaseUrl: string;
  tecnicoNome: string;
  ordemId: string;
  ativoNome: string;
  tipo: string;
  status: string;
  unidadeNome: string;
  osLink?: string | null;
  reassigned?: boolean;
}) {
  const subject = input.reassigned
    ? `OS atribuída a você: ${input.ativoNome} (${input.tipo})`
    : `Nova OS atribuída: ${input.ativoNome} (${input.tipo})`;

  const text = [
    `Olá, ${input.tecnicoNome}.`,
    '',
    input.reassigned
      ? 'Uma ordem de serviço foi atribuída a você.'
      : 'Uma nova ordem de serviço foi atribuída a você.',
    `OS: ${input.ordemId}`,
    `Ativo: ${input.ativoNome}`,
    `Tipo: ${input.tipo}`,
    `Status: ${input.status}`,
    `Unidade: ${input.unidadeNome}`,
    input.osLink ? `Acesse: ${input.osLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Ordem de serviço',
    title: input.reassigned ? 'OS atribuída a você' : 'Nova OS atribuída',
    subtitle: input.ativoNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.tecnicoNome)}</strong>.`,
    paragraphs: [
      input.reassigned
        ? 'Uma ordem de serviço foi atribuída a você no ManuCMMS.'
        : 'Uma nova ordem de serviço foi atribuída a você no ManuCMMS.',
    ],
    details: [
      { label: 'OS', value: input.ordemId },
      { label: 'Ativo', value: input.ativoNome },
      { label: 'Tipo', value: input.tipo },
      { label: 'Status', value: input.status },
      { label: 'Unidade', value: input.unidadeNome },
    ],
    cta: input.osLink
      ? { label: 'Abrir ordem de serviço', href: input.osLink }
      : undefined,
    footerNote:
      'Você recebeu este e-mail por ser o técnico responsável pela ordem de serviço.',
  });

  return { subject, text, html };
}

export function buildOrdemServicoComentarioEmail(input: {
  frontendBaseUrl: string;
  destinatarioNome: string;
  autorNome: string;
  ordemId: string;
  ativoNome: string;
  unidadeNome: string;
  comentario: string;
  osLink?: string | null;
}) {
  const osCurta = input.ordemId.slice(0, 8).toUpperCase();
  const subject = `Novo comentário na OS ${osCurta}: ${input.ativoNome}`;

  const text = [
    `Olá, ${input.destinatarioNome}.`,
    '',
    `${input.autorNome} comentou na ordem de serviço que você acompanha.`,
    `OS: ${input.ordemId}`,
    `Ativo: ${input.ativoNome}`,
    `Unidade: ${input.unidadeNome}`,
    `Comentário: ${input.comentario}`,
    input.osLink ? `Acesse: ${input.osLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Comentário na OS',
    title: 'Novo comentário na ordem',
    subtitle: input.ativoNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.destinatarioNome)}</strong>.`,
    paragraphs: [
      `<strong style="color:${BRAND.text};">${escapeHtml(input.autorNome)}</strong> comentou na ordem de serviço que você acompanha.`,
    ],
    details: [
      { label: 'OS', value: input.ordemId },
      { label: 'Ativo', value: input.ativoNome },
      { label: 'Unidade', value: input.unidadeNome },
    ],
    quote: input.comentario,
    cta: input.osLink
      ? { label: 'Ver comentário na OS', href: input.osLink }
      : undefined,
    footerNote:
      'Você recebeu este e-mail por acompanhar esta ordem de serviço.',
  });

  return { subject, text, html };
}

export function buildOrdemServicoConcluidaEmail(input: {
  frontendBaseUrl: string;
  destinatarioNome: string;
  ordemId: string;
  ativoNome: string;
  unidadeNome: string;
  finalizadoPorNome: string;
  osLink?: string | null;
}) {
  const osCurta = input.ordemId.slice(0, 8).toUpperCase();
  const subject = `OS ${osCurta} concluída: ${input.ativoNome}`;

  const text = [
    `Olá, ${input.destinatarioNome}.`,
    '',
    `A ordem de serviço ${input.ordemId} foi concluída com evidências.`,
    `Ativo: ${input.ativoNome}`,
    `Unidade: ${input.unidadeNome}`,
    `Finalizada por: ${input.finalizadoPorNome}`,
    input.osLink ? `Acesse: ${input.osLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Ordem concluída',
    title: 'OS concluída com evidências',
    subtitle: input.ativoNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.destinatarioNome)}</strong>.`,
    paragraphs: [
      `A ordem de serviço <strong style="color:${BRAND.text};">${escapeHtml(input.ordemId)}</strong> foi concluída na unidade ${escapeHtml(input.unidadeNome)}.`,
    ],
    details: [
      { label: 'Ativo', value: input.ativoNome },
      { label: 'Finalizada por', value: input.finalizadoPorNome },
    ],
    cta: input.osLink
      ? { label: 'Ver ordem concluída', href: input.osLink }
      : undefined,
    footerNote: 'Notificação automática de manutenção.',
  });

  return { subject, text, html };
}

export function buildOrdemServicoEscaladaEmail(input: {
  frontendBaseUrl: string;
  destinatarioNome: string;
  solicitanteNome: string;
  ordemId: string;
  ativoNome: string;
  unidadeNome: string;
  motivo: string;
  osLink?: string | null;
}) {
  const osCurta = input.ordemId.slice(0, 8).toUpperCase();
  const subject = `OS ${osCurta} escalada para análise`;

  const text = [
    `Olá, ${input.destinatarioNome}.`,
    '',
    `${input.solicitanteNome} escalou a OS ${input.ordemId} para supervisão.`,
    `Ativo: ${input.ativoNome}`,
    `Unidade: ${input.unidadeNome}`,
    `Motivo: ${input.motivo}`,
    input.osLink ? `Acesse: ${input.osLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Escalonamento',
    title: 'OS escalada para análise',
    subtitle: input.ativoNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.destinatarioNome)}</strong>.`,
    paragraphs: [
      `<strong style="color:${BRAND.text};">${escapeHtml(input.solicitanteNome)}</strong> solicitou apoio da supervisão na OS ${escapeHtml(osCurta)}.`,
    ],
    details: [
      { label: 'OS', value: input.ordemId },
      { label: 'Unidade', value: input.unidadeNome },
    ],
    quote: input.motivo,
    cta: input.osLink
      ? { label: 'Analisar ordem de serviço', href: input.osLink }
      : undefined,
    footerNote: 'Você recebeu este e-mail por fazer parte da supervisão.',
  });

  return { subject, text, html };
}

export function buildSlaAtrasadoEmail(input: {
  frontendBaseUrl: string;
  nome: string;
  ordemId: string;
  ativoNome: string;
  perfilTexto: string;
  osLink?: string | null;
}) {
  const subject = `SLA atrasado na OS ${input.ordemId.slice(0, 8).toUpperCase()}`;

  const text = [
    `Olá, ${input.nome}.`,
    '',
    `A OS ${input.ordemId} do ativo ${input.ativoNome} ultrapassou o SLA e foi marcada como atrasada.`,
    `Você foi notificado por ser ${input.perfilTexto}.`,
    input.osLink ? `Acesse: ${input.osLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Alerta de SLA',
    title: 'SLA ultrapassado',
    subtitle: input.ativoNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.nome)}</strong>.`,
    paragraphs: [
      `A ordem de serviço <strong style="color:${BRAND.text};">${escapeHtml(input.ordemId)}</strong> ultrapassou o prazo de SLA e foi marcada como atrasada.`,
      `Você foi notificado por ser ${escapeHtml(input.perfilTexto)}.`,
    ],
    details: [
      { label: 'OS', value: input.ordemId },
      { label: 'Ativo', value: input.ativoNome },
    ],
    cta: input.osLink
      ? { label: 'Abrir ordem de serviço', href: input.osLink }
      : undefined,
    footerNote:
      'Este é um alerta automático de manutenção. Priorize a resolução da OS.',
  });

  return { subject, text, html };
}

export function buildResetSenhaEmail(input: {
  frontendBaseUrl: string;
  nome: string;
  empresaNome: string;
  resetLink: string;
}) {
  const subject = `[${input.empresaNome}] Redefinição de senha — ManuCMMS`;

  const text = [
    `Olá, ${input.nome}.`,
    '',
    'Um administrador solicitou a redefinição da sua senha no ManuCMMS.',
    `Empresa: ${input.empresaNome}`,
    '',
    'Use o link abaixo para criar uma nova senha:',
    input.resetLink,
    '',
    'Se você não solicitou esta alteração, ignore este e-mail.',
  ].join('\n');

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Segurança da conta',
    title: 'Redefinir senha',
    subtitle: input.empresaNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.nome)}</strong>.`,
    paragraphs: [
      'Um administrador solicitou a redefinição da sua senha no ManuCMMS.',
      'Clique no botão abaixo para criar uma nova senha. O link é pessoal e expira automaticamente.',
    ],
    cta: { label: 'Redefinir minha senha', href: input.resetLink },
    footerNote:
      'Se você não solicitou esta alteração, ignore este e-mail com segurança.',
    companyName: input.empresaNome,
  });

  return { subject, text, html };
}

export function buildAcessoPortalEmail(input: {
  frontendBaseUrl: string;
  nome: string;
  email: string;
  empresaNome: string;
  accessLink: string;
  usuarioAcesso?: string | null;
  mensagem?: string | null;
}) {
  const subject = `[${input.empresaNome}] Acesso ao ManuCMMS`;

  const text = [
    `Olá, ${input.nome}.`,
    '',
    `Segue o acesso ao portal da empresa ${input.empresaNome} no ManuCMMS.`,
    input.usuarioAcesso ? `Usuário de acesso: ${input.usuarioAcesso}` : '',
    `E-mail de login: ${input.email}`,
    input.mensagem ? `Mensagem: ${input.mensagem}` : '',
    '',
    `Portal: ${input.accessLink}`,
  ]
    .filter(Boolean)
    .join('\n');

  const paragraphs = [
    `Você recebeu este e-mail com as informações de acesso ao ambiente da empresa <strong style="color:${BRAND.text};">${escapeHtml(input.empresaNome)}</strong>.`,
    'Utilize o portal abaixo para entrar no sistema com seu e-mail cadastrado.',
  ];
  if (input.mensagem?.trim()) {
    paragraphs.push(
      `<strong style="color:${BRAND.text};">Mensagem do administrador:</strong> ${escapeHtml(input.mensagem.trim())}`,
    );
  }

  const html = buildTransactionalEmailTemplate({
    frontendBaseUrl: input.frontendBaseUrl,
    preheader: subject,
    eyebrow: 'Acesso ao sistema',
    title: 'Seu acesso ao ManuCMMS',
    subtitle: input.empresaNome,
    greeting: `Olá, <strong style="color:${BRAND.text};">${escapeHtml(input.nome)}</strong>.`,
    paragraphs,
    details: [
      { label: 'Empresa', value: input.empresaNome },
      { label: 'E-mail de login', value: input.email },
      ...(input.usuarioAcesso
        ? [{ label: 'Usuário de acesso', value: input.usuarioAcesso }]
        : []),
    ],
    cta: { label: 'Acessar portal', href: input.accessLink },
    footerNote:
      'Este é um e-mail automático de acesso. Não compartilhe sua senha.',
    companyName: input.empresaNome,
  });

  return { subject, text, html };
}
