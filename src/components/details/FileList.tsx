import { memo, useMemo, useState } from 'react'
import { CheckSquare, Filter, Search, Square } from 'lucide-react'
import type { FileSnapshot } from '@shared/protocol'
import { store } from '@/store/store'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatBytes, formatPercent } from '@/lib/format'
import { FileGlyph } from '@/components/ui/FileGlyph'
import { ProgressBar } from '@/components/ui/ProgressBar'

const FileRow = memo(function FileRow({
  file,
  onToggle,
}: {
  file: FileSnapshot
  onToggle: (index: number, next: boolean) => void
}) {
  const Icon = FileGlyph(file.name)
  const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/') + 1) : ''
  const name = file.path.slice(dir.length)

  return (
    <button
      onClick={() => onToggle(file.index, !file.selected)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
        file.selected ? 'hover:bg-white/[0.04]' : 'opacity-50 hover:bg-white/[0.02]',
      )}
    >
      <span className="shrink-0 text-zinc-500">
        {file.selected ? (
          <CheckSquare size={15} className="text-indigo-400" />
        ) : (
          <Square size={15} />
        )}
      </span>

      <Icon size={15} strokeWidth={1.75} className="shrink-0 text-zinc-500" />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1 text-[12.5px] leading-tight">
          {dir && <span className="truncate text-[11px] text-zinc-600">{dir}</span>}
          <span className={cn('truncate', file.selected ? 'text-zinc-200' : 'text-zinc-400')}>
            {name}
          </span>
        </span>
        {file.progress > 0 && file.progress < 1 && (
          <ProgressBar
            value={file.progress}
            state="downloading"
            height="h-[3px]"
            className="mt-1.5"
          />
        )}
      </span>

      <span className="tabular shrink-0 text-[11px] text-zinc-500">{formatBytes(file.size)}</span>
      <span
        className={cn(
          'tabular w-9 shrink-0 text-right text-[11px]',
          file.done ? 'text-emerald-400' : 'text-zinc-600',
        )}
      >
        {file.done ? <CheckSquare size={13} className="ml-auto" /> : formatPercent(file.progress)}
      </span>
    </button>
  )
})

export function FileList({ torrentId, files }: { torrentId: string; files: FileSnapshot[] }) {
  const [filter, setFilter] = useState('')
  const { t } = useI18n()

  const selectedIndices = useMemo(
    () => files.filter((file) => file.selected).map((file) => file.index),
    [files],
  )
  const selectedSize = useMemo(
    () => files.filter((file) => file.selected).reduce((sum, file) => sum + file.size, 0),
    [files],
  )

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return files
    return files.filter((file) => file.path.toLowerCase().includes(query))
  }, [files, filter])

  const setSelection = (indices: number[]): void => {
    void store.selectFiles(torrentId, indices)
  }

  const toggle = (index: number, next: boolean): void => {
    const set = new Set(selectedIndices)
    if (next) set.add(index)
    else set.delete(index)
    setSelection([...set].sort((a, b) => a - b))
  }

  if (files.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-zinc-600">{t('details.filesPending')}</p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Панель управления выбором */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t('files.filter')}
            className="focus-ring h-8 w-full rounded-lg border border-white/[0.06] bg-black/25 pl-8 pr-2.5 text-[12px] text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <button
          className="btn-ghost h-8 px-2.5 py-0 text-[11px]"
          onClick={() => setSelection(visible.map((file) => file.index))}
          title={t('files.selectVisible')}
        >
          <CheckSquare size={13} />
          {t('action.selectAll')}
        </button>
        <button
          className="btn-ghost h-8 px-2.5 py-0 text-[11px]"
          onClick={() => setSelection([])}
          title={t('files.clearSelection')}
        >
          <Square size={13} />
          {t('action.selectNone')}
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-[11px] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <Filter size={11} />
          {t('files.counter', { selected: selectedIndices.length, total: files.length })}
          {filter && ` · ${t('files.found', { count: visible.length })}`}
        </span>
        <span className="tabular">{t('files.selectedSize', { size: formatBytes(selectedSize) })}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          {visible.map((file) => (
            <FileRow key={file.index} file={file} onToggle={toggle} />
          ))}
        </div>
      </div>
    </div>
  )
}