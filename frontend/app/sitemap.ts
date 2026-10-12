import type { MetadataRoute } from 'next'
import { defaultLocale, locales } from '@/lib/i18n'

const BASE = (process.env.SITE_URL ?? 'https://torrential.app').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: `${BASE}/${defaultLocale}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages: { ru: `${BASE}/ru`, en: `${BASE}/en` } },
    },
    ...locales
      .filter((locale) => locale !== defaultLocale)
      .map((locale) => ({
        url: `${BASE}/${locale}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.9,
        alternates: { languages: { ru: `${BASE}/ru`, en: `${BASE}/en` } },
      })),
  ]
}