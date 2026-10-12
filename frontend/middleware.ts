import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLocale, locales } from '@/lib/i18n'

/**
 * Короткий адрес `/` ведёт на локаль по умолчанию.
 * Роутинг локалей живёт в сегменте [locale], поэтому редирект делаем здесь —
 * так не нужен отдельный app/page.tsx без корневого layout.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
  if (hasLocale) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Пропускаем всё, что не страница локали: служебное и любые файлы
  // с расширением (картинки, иконки, сборки).
  matcher: ['/((?!_next|api|.*\\.[^/]+$).*)'],
}