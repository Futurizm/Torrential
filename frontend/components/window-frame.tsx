import Image from 'next/image'

/** Рамка «окна приложения» — придаёт скриншоту вид настоящего десктопа. */
export function WindowFrame({
  src,
  alt,
  caption,
  priority = false,
  className = '',
}: {
  src: string
  alt: string
  caption?: string
  priority?: boolean
  className?: string
}) {
  return (
    <figure className={className}>
      <div className="window-frame group relative">
        {/* Заголовок окна */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          <span className="ml-3 text-[11px] font-medium tracking-tight text-zinc-500">Torrential</span>
          {/* Блик стекла */}
          <span className="pointer-events-none absolute inset-x-0 top-9 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={src}
            alt={alt}
            width={1920}
            height={1200}
            priority={priority}
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="w-full"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-zinc-500">{caption}</figcaption>
      )}
    </figure>
  )
}