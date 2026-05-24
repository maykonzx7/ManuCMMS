import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ManuCMMS - Sistema de Gestão de Manutenção',
    template: '%s | ManuCMMS',
  },
  description: 'Sistema CMMS industrial para gerenciamento completo de manutenção de ativos, ordens de serviço e equipes técnicas.',
  keywords: ['CMMS', 'manutenção', 'industrial', 'gestão', 'ativos', 'ordens de serviço'],
  authors: [{ name: 'ManuCMMS' }],
  icons: {
    icon: '/manucmms-icon-oficial.png',
    shortcut: '/manucmms-icon-oficial.png',
    apple: '/manucmms-icon-oficial.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
