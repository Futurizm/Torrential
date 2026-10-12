import { AlertCircle, CheckCircle2, Loader2, PauseCircle, Wifi } from 'lucide-react'
import type { TorrentState } from '@shared/protocol'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'

const META: Record<
  TorrentState,
  { label: TranslationKey; icon: typeof Wifi; className: string; dot: string }
> = {
  downloading: {
    label: 'state.downloading',
    icon: Wifi,
    className: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  seeding: {
    label: 'state.seeding',
    icon: CheckCircle2,
    className: 'text-indigo-300',
    dot: 'bg-indigo-400',
  },
  done: {
    label: 'state.done',
    icon: CheckCircle2,
    className: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  paused: {
    label: 'state.paused',
    icon: PauseCircle,
    className: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  metadata: {
    label: 'state.metadata',
    icon: Loader2,
    className: 'text-sky-300',
    dot: 'bg-sky-400',
  },
  error: {
    label: 'state.error',
    icon: AlertCircle,
    className: 'text-rose-300',
    dot: 'bg-rose-400',
  },
}

export function StateBadge({
  state,
  className,
}: {
  state: TorrentState
  className?: string
}) {
  const meta = META[state]
  const { t } = useI18n()
  const Icon = meta.icon
  const spinning = state === 'metadata'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        'border border-white/[0.06] bg-white/[0.04]',
        meta.className,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2.25} className={cn(spinning && 'animate-spin')} />
      {t(meta.label)}
    </span>
  )
}

export function StatusDot({ state }: { state: TorrentState }) {
  const meta = META[state]
  return (
    <span className="relative flex h-2 w-2">
      {state === 'downloading' && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-70',
            meta.dot,
          )}
        />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', meta.dot)} />
    </span>
  )
}