export const APP_NAME = 'ManuCMMS'
export const APP_DEFAULT_TITLE = 'ManuCMMS - Sistema de Gestão de Manutenção'
export const APP_DESCRIPTION =
  'Sistema CMMS industrial para gerenciamento completo de manutenção de ativos, ordens de serviço, preventivas e equipes técnicas em uma única plataforma.'
export const APP_KEYWORDS = [
  'CMMS',
  'manutenção industrial',
  'gestão de ativos',
  'ordens de serviço',
  'manutenção preventiva',
  'manutenção corretiva',
  'software de manutenção',
  'gestão de equipes técnicas',
  'indústria 4.0',
  'confiabilidade operacional',
] as const

export function resolveAppOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://manucmms.vercel.app').replace(/\/+$/, '')
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolveAppOrigin()}${normalizedPath}`
}
