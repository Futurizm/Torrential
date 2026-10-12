import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Wifi, WifiOff } from 'lucide-react'
import { useStore, useTorrents } from '@/store/store'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'
import type { View } from './Sidebar'

const TITLES: Record<View, { title: TranslationKey; subtitle: TranslationKey }> = {
  all: { title: 'nav.all', subtitle: 'nav.all.hint' },
  active: { title: 'nav.active', subtitle: 'nav.active.hint' },
  done: { title: 'nav.done', subtitle: 'nav.done.hint' },
  settings: { title: 'nav.settings', subtitle: 'nav.settings.hint' },
}

export function TopBar({
  view,
  onAdd,
  query,
  onQueryChange,
}: {
  view: View
  onAdd: () => void
  query: string
  onQueryChange: (value: string) => void
}) {
  const { connection } = useStore()
  const torrents = useTorrents()
  const { t } = useI18n()
  const [searchOpen, setSearchOpen] = useState(false)

  const meta = TITLES[view]
  const activeCount = useMemo(
    () => torrents.filter((item) => item.state === 'downloading').length,
    [torrents],
  )

  return (
    <header className="window-drag relative z-10 flex h-16 shrink-0 items-center gap-4 border-b border-white/[0.06] bg-white/[0.012] px-6 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
          {t(meta.title)}
        </h1>
        <p className="truncate text-[11px] text-zinc-500">
          {t(meta.subtitle)}
          {view !== 'settings' && activeCount > 0 && (
            <span className="text-zinc-600">
              {' · '}
              {t('top.counting', { count: activeCount })}
            </span>
          )}
        </p>
      </div>

      <div className="flex-1" />

      {/* Поиск */}
      <motion.div
        animate={{ width: searchOpen ? 260 : 40 }}
        className="relative"
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <Search
          size={15}
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500',
            searchOpen && 'opacity-0',
          )}
        />
        {searchOpen ? (
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onBlur={() => {
              if (!query) setSearchOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onQueryChange('')
                setSearchOpen(false)
              }
            }}
            placeholder={t('search.placeholder')}
            className="focus-ring h-10 w-full rounded-xl border border-white/[0.08] bg-black/25 pl-3 pr-3 text-[13px] text-zinc-200 placeholder:text-zinc-600"
          />
        ) : (
          <button
            className="btn-icon h-10 w-10"
            onClick={() => setSearchOpen(true)}
            title={`${t('search.title')} (/)`}
          >
            <Search size={15} />
          </button>
        )}
      </motion.div>

      {/* Статус соединения с движком */}
      <div
        className={cn(
          'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:flex',
          connection === 'open'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-300',
        )}
        title={connection === 'open' ? t('top.engineOnlineHint') : t('top.engineOfflineHint')}
      >
        {connection === 'open' ? <Wifi size={12} /> : <WifiOff size={12} />}
        {connection === 'open' ? t('top.engineOnline') : t('top.engineOffline')}
      </div>

      <button className="btn-primary hidden lg:inline-flex" onClick={onAdd}>
        <Plus size={16} strokeWidth={2.5} />
        {t('action.addShort')}
      </button>
    </header>
  )
}