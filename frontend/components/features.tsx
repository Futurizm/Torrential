import {
  CheckSquare,
  Gauge,
  PauseCircle,
  RefreshCw,
  Magnet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { getDictionary, type Locale } from '@/lib/i18n'

const ICONS: LucideIcon[] = [Magnet, CheckSquare, Zap, PauseCircle, Gauge, RefreshCw]

export function Features({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <section id="features" className="shell scroll-mt-24 py-24 sm:py-32">
      <header className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t.features.title}
        </h2>
        <p className="mt-4 text-pretty text-base text-zinc-400">{t.features.subtitle}</p>
      </header>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.features.items.map((item, index) => {
          const Icon = ICONS[index % ICONS.length]
          return (
            <li
              key={item.title}
              className="glass card-hover group rounded-2xl p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-indigo-300 transition-colors duration-300 group-hover:border-indigo-400/30 group-hover:text-indigo-200">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-zinc-400">{item.text}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}