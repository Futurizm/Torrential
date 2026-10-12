import Link from 'next/link'
import { ArrowRight, Github, Waypoints } from 'lucide-react'
import { getDictionary, type Locale } from '@/lib/i18n'

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <footer className="border-t border-white/[0.06]">
      <div className="shell py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
                <Waypoints size={17} className="text-white" strokeWidth={2.25} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-white">Torrential</span>
            </div>
            <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-500">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t.footer.product}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {(
                [
                  ['#features', t.nav.features],
                  ['#gallery', t.nav.gallery],
                  ['#tech', t.nav.tech],
                  ['#download', t.nav.download],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-zinc-400 transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t.footer.project}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/webtorrent/webtorrent"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-white"
                >
                  <Github size={14} />
                  {t.nav.github}
                </a>
              </li>
              <li>
                <Link
                  href={`/${locale === 'ru' ? 'en' : 'ru'}`}
                  className="text-zinc-400 transition-colors hover:text-white"
                >
                  {locale === 'ru' ? 'English' : 'Русский'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.06] pt-8 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Torrential. {t.footer.rights}</p>
          <p className="max-w-md sm:text-right">{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  )
}

export function CallToAction({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <section className="shell py-8">
      <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-indigo-500/20 blur-[100px]"
        />
        <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t.cta.title}
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-pretty text-base text-zinc-400">
          {t.cta.text}
        </p>
        <a href="#download" className="btn-primary relative mt-9">
          {t.cta.button}
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  )
}