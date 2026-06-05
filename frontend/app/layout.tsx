import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { PwaInstallPrompt } from '@/components/pwa/install-prompt'
import { SerwistProvider } from '@/components/pwa/serwist-provider'
import './globals.css'

const APP_NAME = 'ManuCMMS'
const APP_DEFAULT_TITLE = 'ManuCMMS - Sistema de Gestão de Manutenção'
const APP_DESCRIPTION =
  'Sistema CMMS industrial para gerenciamento completo de manutenção de ativos, ordens de serviço e equipes técnicas.'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: '%s | ManuCMMS',
  },
  description: APP_DESCRIPTION,
  keywords: ['CMMS', 'manutenção', 'industrial', 'gestão', 'ativos', 'ordens de serviço'],
  authors: [{ name: 'ManuCMMS' }],
  manifest: '/manifest.webmanifest',
  icons: '/icon.svg',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
          <PwaInstallPrompt />
          <Toaster richColors position="top-right" />
        </SerwistProvider>
      </body>
    </html>
  )
}
