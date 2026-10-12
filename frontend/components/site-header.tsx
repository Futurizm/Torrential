import Link from 'next/link'
import { Waypoints } from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n'

const SECTIONS = [
  { href: '#features', key: 'features' },
  { href: '#gallery', key: 'gallery' },
  { href: '#tech', key: 'tech' },
  { href: '#download', key: 'download' },
  { href: '#faq', key: 'faq' },
] as const

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const other: Locale = locale === 'ru' ? 'en' : 'ru'

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="shell flex h-16 items-center gap-6">
        <Link href={`/${locale}`} className="focus-ring flex items-center gap-2.5 rounded-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
            <Waypoints size={17} className="text-white" strokeWidth={2.25} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">Torrential</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="focus-ring rounded-lg px-3 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {t.nav[section.key]}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Переключатель языка */}
        <Link
          href={`/${other}`}
          hrefLang={other}
          className="focus-ring rounded-lg border border-white/[0.08] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:border-white/[0.16] hover:text-white"
          aria-label={other === 'ru' ? 'Переключить на русский' : 'Switch to English'}
        >
          {other}
        </Link>

        <a href="#download" className="btn-primary hidden px-4 py-2 sm:inline-flex">
          {t.nav.download}
        </a>
      </div>
    </header>
  )
}