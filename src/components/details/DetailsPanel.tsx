import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  Download,
  Info,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import type { TorrentSnapshot } from '@shared/protocol'
import { store, useStore } from '@/store/store'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import {
  formatBytes,
  formatDate,
  formatEta,
  formatPercent,
  formatRatio,
  formatSpeed,
} from '@/lib/format'
import { StateBadge } from '@/components/ui/StateBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ConfirmDialog } from '@/components/ui/Modal'
import { FileList } from './FileList'

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className={cn('tabular mt-0.5 text-[13px] font-medium', tone ?? 'text-zinc-200')}>{value}</p>
    </div>
  )
}

export function DetailsPanel({
  torrentId,
  onClose,
}: {
  torrentId: string
  onClose: () => void
}) {
  const state = useStore()
  const { t } = useI18n()
  const torrent: TorrentSnapshot | undefined = state.torrents[torrentId]
  const [confirm, setConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  // Пока панель открыта, движок присылает список файлов по подписке.
  useEffect(() => {
    store.subscribeDetails(torrentId)
    return () => store.unsubscribeDetails(torrentId)
  }, [torrentId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!torrent) return null

  const isPaused = torrent.state === 'paused'
  const isDone = torrent.state === 'done'

  const copyHash = async (): Promise<void> => {
    if (!torrent.infoHash) return
    try {
      await navigator.clipboard.writeText(torrent.infoHash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      store.pushToast({ title: t('toast.clipboard'), tone: 'error' })
    }
  }

  return (
    <>
      <motion.aside
        key={torrentId}
        initial={{ x: '100%', opacity: 0.4 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.3 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative z-30 flex h-full w-full max-w-[560px] shrink-0 flex-col border-l border-white/[0.08] bg-zinc-950/80 shadow-panel backdrop-blur-2xl"
      >
        {/* Шапка */}
        <div className="flex items-start gap-3 border-b border-white/[0.06] p-5">
          <div className="min-w-0 flex-1">
            <StateBadge state={torrent.state} />
            <h2 className="mt-2.5 break-words text-[15px] font-semibold leading-snug text-white">
              {torrent.name}
            </h2>
            {torrent.infoHash && (
              <button
                onClick={() => void copyHash()}
                className="group mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
                title={t('details.copyHash')}
              >
                <span className="tabular font-mono">{torrent.infoHash.slice(0, 24)}…</span>
                <Copy
                  size={11}
                  className={copied ? 'text-emerald-400' : 'opacity-0 group-hover:opacity-100'}
                />
              </button>
            )}
          </div>

          <button onClick={onClose} className="btn-icon" aria-label={t('action.close')}>
            <X size={17} />
          </button>
        </div>

        {/* Прогресс */}
        <div className="border-b border-white/[0.06] px-5 py-4">
          <div className="mb-2 flex items-end justify-between">
            <span className="tabular text-2xl font-semibold tracking-tight text-white">
              {formatPercent(torrent.progress, 1)}
            </span>
            <span className="tabular text-[11px] text-zinc-500">
              {formatBytes(torrent.downloaded)} / {formatBytes(torrent.length)}
            </span>
          </div>
          <ProgressBar value={torrent.progress} state={torrent.state} height="h-2" />

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <ArrowDown size={12} />
              <span className="tabular">{formatSpeed(torrent.downloadSpeed)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-indigo-300">
              <ArrowUp size={12} />
              <span className="tabular">{formatSpeed(torrent.uploadSpeed)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Clock size={12} />
              <span className="tabular">
                {isDone ? t('details.completed') : formatEta(torrent.eta)}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Users size={12} />
              <span className="tabular">{torrent.numPeers}</span>
            </span>
          </div>
        </div>

        {/* Цифры */}
        <div className="grid grid-cols-2 gap-2 border-b border-white/[0.06] p-4 sm:grid-cols-4">
          <Stat label={t('details.size')} value={formatBytes(torrent.length)} />
          <Stat label={t('details.uploaded')} value={formatBytes(torrent.uploaded)} />
          <Stat label={t('details.ratio')} value={formatRatio(torrent.ratio)} tone="text-indigo-300" />
          <Stat
            label={t('details.files')}
            value={`${torrent.filesDone}/${torrent.filesTotal}`}
          />
        </div>

        {/* Управление */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <button
            className="btn-ghost flex-1 py-2 text-xs"
            onClick={() => void store.setPaused(torrent.id, !isPaused)}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? t('action.resume') : t('action.pause')}
          </button>
          <button
            className="btn-ghost flex-1 py-2 text-xs"
            onClick={() => void store.recheck(torrent.id)}
            title={t('action.recheck')}
          >
            <RefreshCw size={14} />
            {t('action.recheck')}
          </button>
          <button
            className="btn-ghost px-3 py-2 text-xs hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
            onClick={() => setConfirm(true)}
            aria-label={t('action.remove')}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Файлы */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {t('details.filesTitle')}
            </h3>
            {torrent.state === 'metadata' && (
              <span className="flex items-center gap-1.5 text-[11px] text-sky-300">
                <Download size={12} className="animate-bounce" />
                {t('details.metadata')}
              </span>
            )}
          </div>

          {torrent.state === 'metadata' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="h-1 w-32 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-sky-400"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">{t('details.metadataHint')}</p>
            </div>
          ) : (
            <FileList torrentId={torrent.id} files={torrent.files ?? []} />
          )}
        </div>

        {/* Пиры */}
        {torrent.peers.length > 0 && (
          <div className="border-t border-white/[0.06] px-5 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600">
              {t('details.peers')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {torrent.peers.map((peer) => (
                <span
                  key={peer.address}
                  className="tabular rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-zinc-500"
                  title={`${peer.client} · ↓ ${formatSpeed(peer.downloadSpeed)} · ↑ ${formatSpeed(peer.uploadSpeed)}`}
                >
                  {peer.address}
                  {peer.isSeed && <span className="ml-1 text-emerald-500">•</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Подвал */}
        <div className="flex items-center gap-3 border-t border-white/[0.06] px-5 py-3 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1.5">
            <Info size={11} className="shrink-0" />
            {t('details.piecesHint')}
          </span>
          <span className="flex-1" />
          <span className="tabular shrink-0">
            {t('details.addedAt', { date: formatDate(torrent.addedAt) })}
          </span>
        </div>
      </motion.aside>

      <ConfirmDialog
        open={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          void store.remove(torrent.id, true)
          onClose()
        }}
        title={t('details.removeTitle')}
        description={t('details.removeText', {
          name: torrent.name,
          size: formatBytes(torrent.downloaded),
        })}
        confirmLabel={t('details.removeAll')}
      />
    </>
  )
}