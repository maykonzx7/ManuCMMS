import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { APP_DESCRIPTION, absoluteUrl } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Entrar',
  description: `Acesse sua conta no ManuCMMS. ${APP_DESCRIPTION}`,
  alternates: {
    canonical: absoluteUrl('/workspace/acesso'),
  },
  openGraph: {
    title: 'Entrar no ManuCMMS',
    description: APP_DESCRIPTION,
    url: absoluteUrl('/workspace/acesso'),
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function AcessoLayout({ children }: { children: ReactNode }) {
  return children
}
