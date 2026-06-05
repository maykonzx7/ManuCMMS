import type { MetadataRoute } from 'next'

const APP_NAME = 'ManuCMMS'
const APP_DESCRIPTION =
  'Sistema CMMS industrial para gestão de manutenção, ativos e ordens de serviço.'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: '/workspace',
    scope: '/',
    id: '/workspace',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#1a1a2e',
    theme_color: '#1a1a2e',
    lang: 'pt-BR',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
