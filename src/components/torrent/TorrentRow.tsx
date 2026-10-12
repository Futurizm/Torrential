import { memo, useState } from 'react'
import { ArrowDown, ArrowUp, Clock, Pause, Play, Trash2, Users } from 'lucide-react'
import type { TorrentSnapshot } from '@shared/protocol'
import { store } from '@/store/store'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatBytes, formatEta, formatSpeed } from '@/lib/format'
import { FileGlyphBox } from '@/components/ui/FileGlyph'
import { ProgressBar, ProgressLabel } from '@/components/ui/ProgressBar'
import { StatusDot } from '@/components/ui/StateBadge'
import { ConfirmDialog } from '@/components/ui/Modal'

interface Props {
  torrent: TorrentSnapshot
  onOpen: (id: string) => void
  selected: boolean
}

function SpeedValue({
  value,
  tone,
  icon: Icon,
}: {
  value: number
  tone: 'down' | 'up'
  icon: typeof ArrowDown
}) {
  const active = value > 0
  return (
    <span
      className={cn(
        'tabular inline-flex w-24 items-center justify-end gap-1.5 text-xs font-medium',
        active
          ? tone === 'down'
            ? 'text-emerald-300'
            : 'text-indigo-300'
          : 'text-zinc-600',
      )}
    >
      <Icon size={12} strokeWidth={2.5} className={active ? 'opacity-80' : 'opacity-40'} />
      {formatSpeed(value)}
    </span>
  )
}

function TorrentRowImpl({ torrent, onOpen, selected }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [deleteFiles, setDeleteFiles] = useState(true)
  const { t } = useI18n()
  const isDone = torrent.state === 'done'
  const isPaused = torrent.state === 'paused'

  return (
    <>
      <div
        onClick={() => onOpen(torrent.id)}
        className={cn(
          'card card-hover group relative cursor-pointer px-3.5 py-3',
          selected && 'border-indigo-400/30 bg-indigo-500/[0.06]',
        )}
      >
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <FileGlyphBox name={torrent.name} />
            {isDone && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none">
                  <path
                    d="M2.5 6.2 4.8 8.5 9.5 3.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusDot state={torrent.state} />
              <h3 className="truncate text-[13px] font-medium text-zinc-100 transition-colors group-hover:text-white">
                {torrent.name}
              </h3>
            </div>

            <div className="mt-2 flex items-center gap-2.5">
              <ProgressBar value={torrent.progress} state={torrent.state} className="flex-1" />
              <ProgressLabel value={torrent.progress} />
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="tabular">{formatBytes(torrent.downloaded)}</span>
              <span className="text-zinc-700">/</span>
              <span className="tabular">{formatBytes(torrent.length)}</span>
              {torrent.filesTotal > 1 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="tabular">
                    {torrent.filesDone}/{torrent.filesTotal}
                  </span>
                </>
              )}
              {torrent.state === 'error' && torrent.error && (
                <span className="truncate text-rose-400">{torrent.error}</span>
              )}
            </div>
          </div>

          {/* Скорости */}
          <div className="hidden w-[104px] shrink-0 flex-col items-end gap-0.5 sm:flex">
            <SpeedValue value={torrent.downloadSpeed} tone="down" icon={ArrowDown} />
            <SpeedValue value={torrent.uploadSpeed} tone="up" icon={ArrowUp} />
          </div>

          {/* Остаток времени */}
          <div className="hidden w-24 shrink-0 items-center justify-end gap-1.5 md:flex">
            <Clock size={12} className="text-zinc-600" />
            <span
              className={cn(
                'tabular text-xs',
                isDone ? 'text-emerald-400' : torrent.eta === null ? 'text-zinc-600' : 'text-zinc-400',
              )}
            >
              {isDone ? t('torrent.done') : formatEta(torrent.eta)}
            </span>
          </div>

          {/* Пиры */}
          <div className="hidden w-16 shrink-0 items-center justify-end gap-1.5 lg:flex">
            <Users
              size={12}
              className={cn(torrent.numPeers > 0 ? 'text-zinc-500' : 'text-zinc-700')}
            />
            <span
              className={cn('tabular text-xs', torrent.numPeers > 0 ? 'text-zinc-300' : 'text-zinc-600')}
            >
              {torrent.numPeers}
            </span>
          </div>

          {/* Управление */}
          <div
            className="flex w-[76px] shrink-0 items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="btn-icon"
              title={isPaused ? t('action.resume') : t('action.pause')}
              aria-label={isPaused ? t('action.resume') : t('action.pause')}
              onClick={() => void store.setPaused(torrent.id, !isPaused)}
            >
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
            <button
              className="btn-icon hover:bg-rose-500/15 hover:text-rose-300"
              title={t('action.remove')}
              aria-label={t('action.remove')}
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          void store.remove(torrent.id, deleteFiles)
        }}
        title={t('torrent.removeTitle')}
        description={t('torrent.removeText', {
          name: torrent.name,
          size: formatBytes(torrent.downloaded),
        })}
        confirmLabel={t('action.remove')}
      >
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(event) => setDeleteFiles(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-rose-500"
          />
          <span className="text-xs leading-relaxed text-zinc-400">
            {t('torrent.removeWithFiles')}
          </span>
        </label>
      </ConfirmDialog>
    </>
  )
}

export const TorrentRow = memo(TorrentRowImpl)