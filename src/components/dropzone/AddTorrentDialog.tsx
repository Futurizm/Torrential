import { useState } from 'react'
import { FileUp, Link2, Loader2 } from 'lucide-react'
import { store } from '@/store/store'
import { useI18n } from '@/i18n'
import { Modal } from '@/components/ui/Modal'

const MAGNET_RE = /^magnet:\?xt=urn:btih:/i

export function AddTorrentDialog({
  open,
  onClose,
  magnet,
  onMagnetChange,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  magnet: string
  onMagnetChange: (value: string) => void
  onSubmit: () => void
}) {
  const [busy, setBusy] = useState(false)
  const { t } = useI18n()

  const pickFile = async (input: HTMLInputElement): Promise<void> => {
    const file = input.files?.[0]
    if (!file) return
    setBusy(true)
    await store.addFiles([file])
    setBusy(false)
    onClose()
    input.value = ''
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('dialog.title')}
      description={t('dialog.description')}
      width="max-w-lg"
    >
      <div className="space-y-3">
        <div className="relative">
          <Link2
            size={15}
            className="pointer-events-none absolute left-3 top-3.5 text-zinc-500"
          />
          <textarea
            autoFocus
            rows={3}
            value={magnet}
            onChange={(event) => onMagnetChange(event.target.value)}
            onPaste={(event) => {
              const text = event.clipboardData.getData('text')
              if (MAGNET_RE.test(text.trim())) {
                event.preventDefault()
                onMagnetChange(text.trim())
              }
            }}
            placeholder={t('dialog.placeholder')}
            className="focus-ring w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 py-2.5 pl-9 pr-3 font-mono text-xs leading-relaxed text-zinc-200 placeholder:text-zinc-600"
          />
        </div>

        <label className="btn-ghost w-full cursor-pointer py-2.5">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
          {t('dialog.chooseFile')}
          <input
            type="file"
            accept=".torrent"
            className="hidden"
            onChange={(event) => void pickFile(event.target)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onSubmit}
            disabled={busy}
          >
            {t('action.addShort')}
          </button>
        </div>
      </div>
    </Modal>
  )
}