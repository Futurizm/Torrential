import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { store, useStore } from '@/store/store'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

const TONE = {
  default: { icon: Info, className: 'text-zinc-300', ring: 'ring-white/10' },
  success: { icon: CheckCircle2, className: 'text-emerald-300', ring: 'ring-emerald-500/20' },
  error: { icon: AlertCircle, className: 'text-rose-300', ring: 'ring-rose-500/20' },
} as const

export function Toasts() {
  const { toasts } = useStore()
  const t = useT()

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone]
          const Icon = tone.icon
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-panel ring-1',
                tone.ring,
              )}
            >
              <Icon size={16} className={cn('mt-0.5 shrink-0', tone.className)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-400">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => store.dismissToast(toast.id)}
                className="btn-icon -mr-1 -mt-1 h-6 w-6"
                aria-label={t('action.close')}
              >
                <X size={13} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}