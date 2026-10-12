import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Download,
  Layers,
  Plus,
  Settings as SettingsIcon,
  Upload,
  Waypoints,
} from 'lucide-react'
import { useGlobalStats, useTorrents } from '@/store/store'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatSpeed } from '@/lib/format'

export type View = 'all' | 'active' | 'done' | 'settings'

const NAV: { id: View; icon: typeof Layers; label: TranslationKey }[] = [
  { id: 'all', label: 'nav.all', icon: Layers },
  { id: 'active', label: 'nav.active', icon: Download },
  { id: 'done', label: 'nav.done', icon: CheckCircle2 },
  { id: 'settings', label: 'nav.settings', icon: SettingsIcon },
]

export function Sidebar({
  view,
  onViewChange,
  onAdd,
}: {
  view: View
  onViewChange: (view: View) => void
  onAdd: () => void
}) {
  const torrents = useTorrents()
  const global = useGlobalStats()
  const { t, plural } = useI18n()

  const counts = {
    all: torrents.length,
    active: torrents.filter((item) => item.state === 'downloading' || item.state === 'metadata').length,
    done: torrents.filter((item) => item.state === 'done').length,
    settings: 0,
  }

  return (
    <aside className="relative z-20 flex w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015] backdrop-blur-2xl">
      {/* Логотип: подпись вынесена на свою строку, иначе она обрезается */}
      <div className="flex h-16 flex-col justify-center gap-1 px-5 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
            <Waypoints size={17} className="text-white" strokeWidth={2.25} />
          </div>
          <p className="text-sm font-semibold tracking-tight text-white">{t('app.name')}</p>
        </div>
        <p
          className="truncate pl-[42px] text-[10px] leading-none text-zinc-500"
          title={t('app.tagline')}
        >
          {t('app.tagline')}
        </p>
      </div>

      {/* Добавить */}
      <div className="px-3.5">
        <button className="btn-primary w-full" onClick={onAdd}>
          <Plus size={16} strokeWidth={2.5} />
          {t('action.add')}
        </button>
      </div>

      {/* Навигация */}
      <nav className="mt-5 flex flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'focus-ring group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                active ? 'text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-white/[0.07] bg-white/[0.06]"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <Icon
                size={16}
                strokeWidth={2}
                className={cn('relative', active ? 'text-indigo-300' : 'text-zinc-500')}
              />
              <span className="relative flex-1 truncate text-left">{t(item.label)}</span>
              {counts[item.id] > 0 && (
                <span
                  className={cn(
                    'tabular relative rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                    active ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/[0.06] text-zinc-500',
                  )}
                >
                  {counts[item.id]}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Глобальная статистика */}
      <div className="mx-3 mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {t('sidebar.exchange')}
        </p>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Download size={12} />
              {t('sidebar.in')}
            </span>
            <span className="tabular font-medium text-emerald-300">
              {formatSpeed(global.downloadSpeed)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Upload size={12} />
              {t('sidebar.out')}
            </span>
            <span className="tabular font-medium text-indigo-300">
              {formatSpeed(global.uploadSpeed)}
            </span>
          </div>
        </div>

        {global.numTorrents > 0 && (
          <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[11px] text-zinc-600">
            {t('sidebar.torrentsCount', {
              count: global.numTorrents,
              noun: plural('torrent', global.numTorrents),
            })}
            {' · '}
            {global.numPaused > 0
              ? t('sidebar.paused', { count: global.numPaused })
              : t('sidebar.allActive')}
          </p>
        )}
      </div>
    </aside>
  )
}