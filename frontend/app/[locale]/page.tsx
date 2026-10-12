import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { Gallery } from '@/components/gallery'
import { Tech } from '@/components/tech'
import { Download } from '@/components/download'
import { Faq } from '@/components/faq'
import { CallToAction, SiteFooter } from '@/components/site-footer'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const typed: Locale = locale

  return (
    <>
      <SiteHeader locale={typed} />
      <main>
        <Hero locale={typed} />
        <Features locale={typed} />
        <Gallery locale={typed} />
        <Tech locale={typed} />
        <Download locale={typed} />
        <Faq locale={typed} />
        <CallToAction locale={typed} />
      </main>
      <SiteFooter locale={typed} />
    </>
  )
}