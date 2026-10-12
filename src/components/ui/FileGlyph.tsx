import {
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/** Подбирает иконку по расширению файла — дешевле, чем тянуть mime-типы. */
export function FileGlyph(name: string): LucideIcon {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (!name.includes('.')) return Folder

  const map: Record<string, LucideIcon> = {
    mp4: FileVideo, mkv: FileVideo, avi: FileVideo, mov: FileVideo, webm: FileVideo,
    mp3: FileAudio, flac: FileAudio, wav: FileAudio, aac: FileAudio, m4a: FileAudio,
    jpg: FileImage, jpeg: FileImage, png: FileImage, gif: FileImage, webp: FileImage, svg: FileImage,
    pdf: FileText, txt: FileText, md: FileText, doc: FileText, docx: FileText, epub: FileText,
    zip: FileArchive, rar: FileArchive, '7z': FileArchive, tar: FileArchive, gz: FileArchive,
  }

  return map[extension] ?? FileIcon
}

export function FileGlyphBox({
  name,
  size = 16,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = FileGlyph(name)
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
        'border border-white/[0.06] bg-white/[0.04] text-zinc-400',
        className,
      )}
    >
      <Icon size={size} strokeWidth={1.75} />
    </span>
  )
}