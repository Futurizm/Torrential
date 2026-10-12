import { ArrowRight, Sparkles } from 'lucide-react'
import { getDictionary, type Locale } from '@/lib/i18n'
import { WindowFrame } from './window-frame'

export function Hero({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <section className="relative overflow-hidden pt-20 sm:pt-28">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow animate-rise">
            <Sparkles size={12} className="text-indigo-300" />
            {t.hero.badge}
          </span>

          <h1
            className="mt-7 animate-rise text-balance text-4xl font-semibold leading-[1.08] tracking-tightest text-white sm:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            {t.hero.title}
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl animate-rise text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            {t.hero.subtitle}
          </p>

          <div
            className="mt-10 flex animate-rise flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '180ms' }}
          >
            <a href="#download" className="btn-primary w-full sm:w-auto">
              {t.hero.primary}
              <ArrowRight size={16} />
            </a>
            <a href="#gallery" className="btn-ghost w-full sm:w-auto">
              {t.hero.secondary}
            </a>
          </div>

          <p className="mt-5 animate-rise text-xs text-zinc-600" style={{ animationDelay: '240ms' }}>
            {t.hero.note}
          </p>
        </div>

        {/* Скриншот приложения */}
        <div
          className="relative mx-auto mt-16 max-w-5xl animate-rise"
          style={{ animationDelay: '300ms' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[2rem] bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent blur-3xl"
          />
          <WindowFrame
            src="/screenshots/list.png"
            alt="Torrential — список загрузок с живыми скоростями"
            priority
          />
        </div>

        {/* Три метрики */}
        <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {t.hero.stats.map((stat) => (
            <div key={stat.label} className="glass card-hover rounded-2xl px-5 py-4 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="tabular text-2xl font-semibold tracking-tight text-white">
                {stat.value}
              </dd>
              <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}