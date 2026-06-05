import type { MetadataRoute } from 'next'

const APP_NAME = 'ManuCMMS'
const APP_DESCRIPTION =
  'Sistema CMMS industrial para gestão de manutenção, ativos e ordens de serviço.'
const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://manucmms.vercel.app'
).replace(/\/+$/, '')

type PwaManifest = MetadataRoute.Manifest & {
  capture_links?: 'new-client' | 'existing-client-navigate' | 'none'
  url_handlers?: Array<{
    origin: string
    paths: string[]
  }>
}

export default function manifest(): PwaManifest {
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
        src: '/manucmms-icon-oficial.png',
        sizes: '500x500',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/manucmms-icon-oficial.png',
        sizes: '500x500',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    capture_links: 'new-client',
    url_handlers: [
      {
        origin: APP_ORIGIN,
        paths: ['/*'],
      },
    ],
  }
}
