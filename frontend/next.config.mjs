import { withSerwist } from '@serwist/turbopack'

/** @type {import('next').NextConfig} */
const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

const nextConfig = {
  serverExternalPackages: ['esbuild'],
  allowedDevOrigins: ['whelked-bess-promiscuously.ngrok-free.dev'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/acesso', destination: '/workspace/acesso', permanent: false },
      { source: '/acesso/:companySlug', destination: '/workspace/acesso/:companySlug', permanent: false },
      { source: '/convite', destination: '/workspace/convite', permanent: false },
      { source: '/ordens', destination: '/workspace/ordens', permanent: false },
      { source: '/ordens/agenda', destination: '/workspace/ordens/agenda', permanent: false },
      { source: '/ordens/nova', destination: '/workspace/ordens/nova', permanent: false },
      { source: '/metricas', destination: '/workspace/metricas', permanent: false },
      { source: '/ativos', destination: '/workspace/ativos', permanent: false },
      { source: '/ativos/novo', destination: '/workspace/ativos/novo', permanent: false },
      { source: '/usuarios', destination: '/workspace/usuarios', permanent: false },
      { source: '/unidades', destination: '/workspace/unidades', permanent: false },
      { source: '/dashboard', destination: '/workspace/dashboard', permanent: false },
      { source: '/auditoria', destination: '/workspace/auditoria', permanent: false },
      { source: '/notificacoes', destination: '/workspace/notificacoes', permanent: false },
      { source: '/relatorios', destination: '/workspace/relatorios', permanent: false },
      { source: '/integracoes', destination: '/workspace/integracoes', permanent: false },
      { source: '/iot', destination: '/workspace/iot', permanent: false },
      { source: '/permissoes', destination: '/workspace/permissoes', permanent: false },
      { source: '/configuracoes', destination: '/workspace/configuracoes', permanent: false },
    ]
  },
  async rewrites() {
    return [
      { source: '/workspace', destination: '/' },
      { source: '/workspace/:path*', destination: '/:path*' },
      { source: '/api/:path*', destination: `${configuredApiBaseUrl}/:path*` },
      { source: '/uploads/:path*', destination: `${configuredApiBaseUrl}/uploads/:path*` },
    ]
  },
}

export default withSerwist(nextConfig)
