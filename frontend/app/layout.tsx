import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { PwaInstallPrompt } from '@/components/pwa/install-prompt'
import { SerwistProvider } from '@/components/pwa/serwist-provider'
import { JsonLd } from '@/components/seo/json-ld'
import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_KEYWORDS,
  APP_NAME,
  absoluteUrl,
} from '@/lib/seo'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: '%s | ManuCMMS',
  },
  description: APP_DESCRIPTION,
  keywords: [...APP_KEYWORDS],
  authors: [{ name: APP_NAME, url: absoluteUrl() }],
  creator: APP_NAME,
  publisher: APP_NAME,
  category: 'business',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/manucmms-icon-oficial.png', sizes: '500x500', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: absoluteUrl('/workspace/acesso'),
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: absoluteUrl('/workspace/acesso'),
    siteName: APP_NAME,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: absoluteUrl('/manucmms-icon-oficial.png'),
        width: 500,
        height: 500,
        alt: `${APP_NAME} - Gestão de Manutenção Industrial`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    images: [absoluteUrl('/manucmms-icon-oficial.png')],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <JsonLd />
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
          <PwaInstallPrompt />
          <Toaster richColors position="top-right" />
        </SerwistProvider>
      </body>
    </html>
  )
}
