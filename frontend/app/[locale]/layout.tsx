import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale, locales, type Locale } from '@/lib/i18n'
import '../globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  themeColor: '#08080b',
  colorScheme: 'dark',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dictionary = getDictionary(isLocale(locale) ? locale : 'ru')
  const base = process.env.SITE_URL ?? 'https://torrential.app'

  return {
    metadataBase: new URL(base),
    title: dictionary.meta.title,
    description: dictionary.meta.description,
    keywords: dictionary.meta.keywords.split(', '),
    applicationName: 'Torrential',
    authors: [{ name: 'Torrential' }],
    openGraph: {
      type: 'website',
      siteName: 'Torrential',
      title: dictionary.meta.title,
      description: dictionary.meta.description,
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
      images: [{ url: '/og.png', width: 1903, height: 1048, alt: 'Torrential' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dictionary.meta.title,
      description: dictionary.meta.description,
      images: ['/og.png'],
    },
    icons: {
      icon: '/favicon.svg',
    },
    alternates: {
      canonical: `${base}/${locale}`,
      languages: { ru: `${base}/ru`, en: `${base}/en` },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const typed: Locale = locale

  return (
    <html lang={typed} className="dark">
      <body className="min-h-screen antialiased">
        {/* Атмосферный фон — такой же, как в приложении */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-52 -top-52 h-[38rem] w-[38rem] animate-float rounded-full bg-indigo-600/[0.16] blur-[130px]" />
          <div className="absolute -bottom-64 right-[-10rem] h-[40rem] w-[40rem] animate-float rounded-full bg-emerald-500/[0.10] blur-[140px]" style={{ animationDelay: '-8s' }} />
          <div className="absolute left-1/2 top-1/3 h-[26rem] w-[26rem] animate-drift rounded-full bg-sky-500/[0.06] blur-[130px]" />
        </div>
        <div className="relative">{children}</div>
      </body>
    </html>
  )
}