export const ROUTES = {
  workspaceRoot: '/workspace',
  home: '/workspace',
  acesso: '/workspace/acesso',
  acessoEmpresa: (slug: string) => `/workspace/acesso/${encodeURIComponent(slug)}`,
  convite: '/workspace/convite',
  ordens: '/workspace/ordens',
  ordensAgenda: '/workspace/ordens/agenda',
  novaOrdem: '/workspace/ordens/nova',
  ordemImprimir: (id: string) => `/workspace/ordens/${id}/imprimir`,
  metricas: '/workspace/metricas',
  ativos: '/workspace/ativos',
  novoAtivo: '/workspace/ativos/novo',
  admin: '/workspace/admin',
  platform: '/workspace/platform',
  clienteWorkspace: (slug: string) =>
    `/workspace/cliente/${encodeURIComponent(slug.trim().toLowerCase())`,
  configuracoes: '/workspace/configuracoes',
  perfil: '/workspace/perfil',
  pecas: '/workspace/pecas',
}

/** Rota interna do Next usa `/cliente/...`; a URL pública usa `/workspace/cliente/...`. */
export function isClientHandoffPath(pathname: string): boolean {
  return pathname.startsWith('/workspace/cliente/') || pathname.startsWith('/cliente/')
}

export function resolveClientSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/(?:workspace\/)?cliente\/([^/?#]+)/i)
  const slug = match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : ''
  return slug.length > 0 ? slug : null
}
