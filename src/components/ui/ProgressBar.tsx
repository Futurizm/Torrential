import { motion } from 'framer-motion'
import type { TorrentState } from '@shared/protocol'
import { cn } from '@/lib/cn'
import { formatPercent } from '@/lib/format'

/**
 * Мини-прогрессбар для строки торрента.
 * Активные торренты получают бегущий блик, чтобы статус читался боковым зрением.
 */
export function ProgressBar({
  value,
  state,
  height = 'h-1.5',
  className,
}: {
  value: number
  state: TorrentState
  height?: string
  className?: string
}) {
  const percent = Math.min(100, Math.max(0, value * 100))
  const animated = state === 'downloading'

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-white/[0.07]', height, className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn(
          'relative h-full rounded-full',
          state === 'error'
            ? 'bg-gradient-to-r from-rose-500/80 to-rose-400/80'
            : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-400',
        )}
        initial={false}
        animate={{ width: `${percent}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 0.4 }}
      >
        {animated && (
          <span className="absolute inset-y-0 left-0 w-full animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        )}
      </motion.div>
    </div>
  )
}

export function ProgressLabel({ value }: { value: number }) {
  return (
    <span className="tabular text-[11px] font-medium text-zinc-400">{formatPercent(value)}</span>
  )
}