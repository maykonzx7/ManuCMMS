import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/workspace/acesso', '/workspace/convite'],
        disallow: [
          '/workspace/',
          '/api/',
          '/ordens/',
          '/ativos/',
          '/auditoria/',
          '/notificacoes/',
          '/relatorios/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl(),
  }
}
