import { ArrowDown, ArrowUp, FolderOpen, Gauge } from 'lucide-react'
import { useGlobalStats } from '@/store/store'
import { useI18n } from '@/i18n'
import { formatBytes, formatSpeed } from '@/lib/format'

export function StatusBar() {
  const global = useGlobalStats()
  const { t } = useI18n()

  const limit = (value: number): string => (value < 0 ? t('statusbar.unlimited') : formatSpeed(value))

  return (
    <footer className="relative z-10 flex h-9 shrink-0 items-center gap-5 border-t border-white/[0.06] bg-white/[0.012] px-6 text-[11px] text-zinc-500 backdrop-blur-xl">
      <span className="flex items-center gap-1.5">
        <ArrowDown size={12} className="text-emerald-400/70" />
        <span className="tabular font-medium text-emerald-300">
          {formatSpeed(global.downloadSpeed)}
        </span>
        <span className="text-zinc-700">/ {limit(global.downloadLimit)}</span>
      </span>

      <span className="flex items-center gap-1.5">
        <ArrowUp size={12} className="text-indigo-400/70" />
        <span className="tabular font-medium text-indigo-300">
          {formatSpeed(global.uploadSpeed)}
        </span>
        <span className="text-zinc-700">/ {limit(global.uploadLimit)}</span>
      </span>

      <div className="flex-1" />

      <span className="tabular flex items-center gap-1.5">
        <Gauge size={12} className="text-zinc-600" />
        {t('statusbar.received')} {formatBytes(global.downloaded)}
      </span>
      <span className="tabular flex items-center gap-1.5">
        {t('statusbar.sent')} {formatBytes(global.uploaded)}
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        <FolderOpen size={12} className="text-zinc-600" />
        {t('statusbar.engine')}
      </span>
    </footer>
  )
}