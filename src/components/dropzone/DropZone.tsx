import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Link2, Magnet, Upload } from 'lucide-react'
import { store } from '@/store/store'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { AddTorrentDialog } from './AddTorrentDialog'

const MAGNET_RE = /^magnet:\?xt=urn:btih:/i

/**
 * Главная зона приложения: принимает .torrent перетаскиванием и magnet из буфера.
 * Глобальный оверлей перехватывает файлы, если окно не в фокусе конкретной зоны.
 */
export function DropZone({ compact = false }: { compact?: boolean }) {
  const [dragActive, setDragActive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [magnet, setMagnet] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return
    void store.addFiles(Array.from(files))
  }, [])

  const onDrop = (event: React.DragEvent): void => {
    event.preventDefault()
    setDragActive(false)
    handleFiles(event.dataTransfer.files)
  }

  const submitMagnet = (): void => {
    if (!MAGNET_RE.test(magnet.trim())) {
      store.pushToast({
        title: t('toast.needMagnet'),
        description: t('toast.needMagnetHint'),
        tone: 'error',
      })
      return
    }
    void store.addMagnet(magnet)
    setMagnet('')
    setDialogOpen(false)
  }

  return (
    <>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          setDragActive(false)
        }}
        onDrop={onDrop}
        className={cn(
          'group relative flex flex-col items-center justify-center overflow-hidden',
          'rounded-3xl border border-dashed text-center transition-all duration-300',
          compact ? 'px-6 py-8' : 'px-8 py-16',
          dragActive
            ? 'border-indigo-400/60 bg-indigo-500/[0.07] shadow-[0_0_60px_-20px_rgba(99,102,241,0.6)]'
            : 'border-white/[0.09] bg-white/[0.015] hover:border-white/[0.16] hover:bg-white/[0.03]',
        )}
      >
        {/* Мягкое свечение */}
        <div
          className={cn(
            'pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full',
            'bg-indigo-500/20 blur-[90px] transition-opacity duration-500',
            dragActive ? 'opacity-100' : 'opacity-40',
          )}
        />

        <motion.div
          animate={dragActive ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className={cn(
            'relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
            'border border-white/[0.08] bg-white/[0.05] text-indigo-300 backdrop-blur',
            dragActive && 'border-indigo-400/40 text-indigo-200',
          )}
        >
          <Upload size={22} strokeWidth={1.75} />
        </motion.div>

        <h2 className="relative text-base font-semibold tracking-tight text-zinc-100">
          {dragActive ? t('drop.titleActive') : t('drop.title')}
        </h2>
        <p className="relative mt-1.5 max-w-sm text-[13px] leading-relaxed text-zinc-500">
          {t('drop.hint', { paste: t('drop.pasteShortcut') })}
        </p>

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
          <button className="btn-primary" onClick={() => inputRef.current?.click()}>
            <Download size={15} />
            {t('drop.chooseFile')}
          </button>
          <button className="btn-ghost" onClick={() => setDialogOpen(true)}>
            <Link2 size={15} />
            {t('drop.pasteMagnet')}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".torrent,application/x-bittorrent"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <AddTorrentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        magnet={magnet}
        onMagnetChange={setMagnet}
        onSubmit={submitMagnet}
      />
    </>
  )
}

/** Полноэкранный оверлей, когда файл dragged над окном приложения. */
export function DragOverlay() {
  const [active, setActive] = useState(false)
  const depth = useRef(0)
  const { t } = useI18n()

  useEffect(() => {
    const hasFiles = (event: DragEvent): boolean => !!event.dataTransfer?.types?.includes('Files')

    const onEnter = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth.current += 1
      setActive(true)
    }
    const onLeave = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setActive(false)
    }
    const onDragOver = (event: DragEvent): void => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDrop = (event: DragEvent): void => {
      depth.current = 0
      setActive(false)
      if (event.dataTransfer?.files?.length) {
        event.preventDefault()
        void store.addFiles(Array.from(event.dataTransfer.files))
      }
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="flex flex-col items-center gap-4 rounded-3xl border border-indigo-400/40 bg-zinc-900/70 px-16 py-12 shadow-panel"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <Magnet size={28} strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold text-white">{t('dragOverlay.title')}</p>
            <p className="text-sm text-zinc-400">{t('dragOverlay.hint')}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}