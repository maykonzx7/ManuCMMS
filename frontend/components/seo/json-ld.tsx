import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_NAME,
  absoluteUrl,
} from '@/lib/seo'

export function JsonLd() {
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: APP_NAME,
        url: absoluteUrl(),
        logo: absoluteUrl('/manucmms-icon-oficial.png'),
        description: APP_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        name: APP_DEFAULT_TITLE,
        url: absoluteUrl(),
        inLanguage: 'pt-BR',
        publisher: {
          '@type': 'Organization',
          name: APP_NAME,
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: APP_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL',
        },
        description: APP_DESCRIPTION,
        url: absoluteUrl('/workspace/acesso'),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
