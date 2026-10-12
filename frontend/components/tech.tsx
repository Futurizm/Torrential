import { getDictionary, type Locale } from '@/lib/i18n'

export function Tech({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <section id="tech" className="shell scroll-mt-24 py-24 sm:py-28">
      <div className="glass overflow-hidden rounded-3xl">
        <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t.tech.title}
            </h2>
            <p className="mt-4 text-pretty text-base text-zinc-400">{t.tech.subtitle}</p>

            <dl className="mt-8 space-y-3">
              {t.tech.items.slice(0, 3).map((item) => (
                <div key={item.label} className="flex items-baseline gap-3 text-sm">
                  <dt className="w-32 shrink-0 text-zinc-500">{item.label}</dt>
                  <dd className="font-mono text-zinc-200">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <dl className="grid grid-cols-1 gap-3 self-center sm:grid-cols-2">
            {t.tech.items.slice(3).map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <dt className="text-[11px] uppercase tracking-wide text-zinc-600">{item.label}</dt>
                <dd className="mt-1 font-mono text-[13px] text-zinc-200">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}