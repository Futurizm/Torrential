import { ArrowDownToLine, FileArchive, Info } from 'lucide-react'
import { getDictionary, type Locale } from '@/lib/i18n'
import { downloads } from '@/lib/downloads'

export function Download({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  const cards = [
    { ...t.download.installer, icon: ArrowDownToLine, href: downloads.installer },
    { ...t.download.portable, icon: FileArchive, href: downloads.portable },
  ]

  return (
    <section id="download" className="shell scroll-mt-24 py-24 sm:py-28">
      <header className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t.download.title}
        </h2>
        <p className="mt-4 text-pretty text-base text-zinc-400">{t.download.subtitle}</p>
      </header>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <a
              key={card.title}
              href={card.href}
              download
              className="glass card-hover focus-ring group flex flex-col rounded-2xl p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-indigo-300 transition-colors duration-300 group-hover:border-indigo-400/30">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-white">
                {card.title}
              </h3>
              <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-zinc-400">
                {card.text}
              </p>
              <p className="tabular mt-4 font-mono text-[11px] text-zinc-500">{card.meta}</p>
            </a>
          )
        })}
      </div>

      <p className="mx-auto mt-8 flex max-w-3xl items-start justify-center gap-2.5 text-center text-xs leading-relaxed text-zinc-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          {t.download.requirements} {t.download.note}
        </span>
      </p>
    </section>
  )
}