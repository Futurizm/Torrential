'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getDictionary, isLocale, type Locale } from '@/lib/i18n'

/**
 * Страница 404 внутри локали.
 *
 * Сделана клиентским компонентом намеренно: `not-found` рендерится сервером
 * без доступа к `params`, и при серверной реализации русский вариант попадал
 * в RSC-payload английской страницы — в разметке `/en` оставался русский текст.
 * Здесь локаль берётся из адреса уже в браузере.
 */
export default function LocaleNotFound() {
  const pathname = usePathname()
  const segment = pathname.split('/')[1] ?? ''
  const locale: Locale = isLocale(segment) ? segment : 'ru'
  const other: Locale = locale === 'ru' ? 'en' : 'ru'
  const t = getDictionary(locale)

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          {locale === 'ru' ? 'Такой страницы нет' : 'This page does not exist'}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-400">
          {locale === 'ru'
            ? 'Возможно, адрес набран с ошибкой или материал был перемещён.'
            : 'The address may have a typo, or the page may have moved.'}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={`/${locale}`} className="btn-primary">
            {t.hero.primary}
          </Link>
          <Link href={`/${other}`} className="btn-ghost font-mono text-xs uppercase">
            {other}
          </Link>
        </div>
      </div>
    </main>
  )
}