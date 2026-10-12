import { Plus } from 'lucide-react'
import { getDictionary, type Locale } from '@/lib/i18n'

export function Faq({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <section id="faq" className="shell scroll-mt-24 py-24 sm:py-28">
      <header className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t.faq.title}
        </h2>
      </header>

      <div className="mx-auto mt-12 max-w-3xl divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        {t.faq.items.map((item) => (
          <details key={item.q} className="group">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.03]">
              {item.q}
              <Plus
                size={16}
                className="shrink-0 text-zinc-500 transition-transform duration-300 group-open:rotate-45"
              />
            </summary>
            <p className="px-6 pb-6 pr-12 text-pretty text-sm leading-relaxed text-zinc-400">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}