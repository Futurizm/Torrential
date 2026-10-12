import { AnimatePresence, motion } from 'framer-motion'
import { Download, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTorrents } from '@/store/store'
import type { TorrentSnapshot } from '@shared/protocol'
import { useI18n, type TranslationKey } from '@/i18n'
import { TorrentRow } from './TorrentRow'
import { DropZone } from '@/components/dropzone/DropZone'
import type { View } from '@/components/layout/Sidebar'

type SortKey = 'added' | 'name' | 'progress' | 'size' | 'speed'

const SORTS: { key: SortKey; label: TranslationKey }[] = [
  { key: 'added', label: 'list.sort.added' },
  { key: 'name', label: 'list.sort.name' },
  { key: 'progress', label: 'list.sort.progress' },
  { key: 'size', label: 'list.sort.size' },
  { key: 'speed', label: 'list.sort.speed' },
]

function sortTorrents(list: TorrentSnapshot[], key: SortKey): TorrentSnapshot[] {
  const sorted = [...list]
  switch (key) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    case 'progress':
      return sorted.sort((a, b) => b.progress - a.progress)
    case 'size':
      return sorted.sort((a, b) => b.length - a.length)
    case 'speed':
      return sorted.sort((a, b) => b.downloadSpeed - a.downloadSpeed)
    default:
      return sorted.sort((a, b) => {
        // Активные — сверху, остальные по дате добавления.
        const rank = (item: TorrentSnapshot): number => (item.state === 'downloading' ? 0 : 1)
        return rank(a) - rank(b) || b.addedAt - a.addedAt
      })
  }
}

export function TorrentList({
  view,
  query,
  selectedId,
  onOpen,
}: {
  view: Exclude<View, 'settings'>
  query: string
  selectedId: string | null
  onOpen: (id: string) => void
}) {
  const torrents = useTorrents()
  const { t } = useI18n()
  const [sort, setSort] = useState<SortKey>('added')

  const filtered = useMemo(() => {
    const byView = torrents.filter((torrent) => {
      if (view === 'active') return torrent.state === 'downloading' || torrent.state === 'metadata'
      if (view === 'done') return torrent.state === 'done'
      return true
    })

    const needle = query.trim().toLowerCase()
    const searched = needle
      ? byView.filter((torrent) => torrent.name.toLowerCase().includes(needle))
      : byView

    return sortTorrents(searched, sort)
  }, [torrents, view, query, sort])

  // Пустое состояние: большая зона перетаскивания вместо «голого» экрана.
  if (torrents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <div className="w-full max-w-2xl">
          <DropZone />
          <ol className="mt-8 grid gap-3 text-[11px] text-zinc-600 sm:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <li key={step} className="flex gap-2">
                <span className="kbd h-fit">{step}</span>
                {t(`empty.hint${step}` as TranslationKey)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Сортировка */}
      <div className="flex items-center gap-1 px-6 pb-3 pt-4">
        {SORTS.map((item) => (
          <button
            key={item.key}
            onClick={() => setSort(item.key)}
            className={
              sort === item.key
                ? 'rounded-lg bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-zinc-200'
                : 'rounded-lg px-2.5 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300'
            }
          >
            {t(item.label)}
          </button>
        ))}
        <span className="flex-1" />
        <span className="tabular text-[11px] text-zinc-600">
          {t('list.counter', { shown: filtered.length, total: torrents.length })}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <SearchX size={22} className="text-zinc-700" />
            <p className="text-sm text-zinc-500">{t('list.empty.title')}</p>
            <p className="text-xs text-zinc-600">
              {query ? t('list.empty.query', { query }) : t('list.empty.tab')}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {filtered.map((torrent) => (
                <motion.div
                  key={torrent.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                >
                  <TorrentRow
                    torrent={torrent}
                    selected={selectedId === torrent.id}
                    onOpen={onOpen}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {view === 'active' && (
              <motion.div layout className="pt-4">
                <DropZone compact />
              </motion.div>
            )}
          </div>
        )}

        {view !== 'active' && filtered.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-700">
            <Download size={12} />
            {t('list.hint')}
          </div>
        )}
      </div>
    </div>
  )
}