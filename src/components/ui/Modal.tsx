import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  width?: string
}) {
  const t = useT()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={cn('glass-strong relative w-full rounded-2xl p-5 shadow-panel ring-1 ring-white/10', width)}
          >
            <button
              onClick={onClose}
              className="btn-icon absolute right-3 top-3"
              aria-label={t('action.close')}
            >
              <X size={16} />
            </button>
            <h2 className="pr-8 text-base font-semibold text-white">{title}</h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{description}</p>}
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}) {
  const t = useT()

  return (
    <Modal open={open} onClose={onCancel} title={title} description={description}>
      {children}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          {t('action.cancel')}
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'btn px-4 py-2 text-white',
            tone === 'danger' ? 'bg-rose-500/90 hover:bg-rose-500' : 'bg-indigo-500 hover:bg-indigo-400',
          )}
        >
          {confirmLabel ?? t('action.remove')}
        </button>
      </div>
    </Modal>
  )
}