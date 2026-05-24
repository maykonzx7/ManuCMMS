export const ROUTES = {
  workspaceRoot: '/workspace',
  home: '/workspace',
  acesso: '/workspace/acesso',
  acessoEmpresa: (slug: string) => `/workspace/acesso/${encodeURIComponent(slug)}`,
  convite: '/workspace/convite',
  platform: '/workspace/platform',
  ordens: '/workspace/ordens',
  novaOrdem: '/workspace/ordens/nova',
  ativos: '/workspace/ativos',
  novoAtivo: '/workspace/ativos/novo',
  configuracoes: '/workspace/configuracoes',
}

