import { getDictionary, type Locale } from '@/lib/i18n'
import { WindowFrame } from './window-frame'

export function Gallery({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <section id="gallery" className="shell scroll-mt-24 py-24 sm:py-28">
      <header className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t.gallery.title}
        </h2>
        <p className="mt-4 text-pretty text-base text-zinc-400">{t.gallery.subtitle}</p>
      </header>

      <div className="mt-14 space-y-6">
        <WindowFrame
          src="/screenshots/files.png"
          alt="Torrential — панель деталей с выбором файлов"
          caption={t.gallery.captions.files}
          className="mx-auto max-w-5xl"
        />

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <WindowFrame
            src="/screenshots/list.png"
            alt="Torrential — список загрузок"
            caption={t.gallery.captions.list}
          />
          <WindowFrame
            src="/screenshots/settings.png"
            alt="Torrential — настройки и язык интерфейса"
            caption={t.gallery.captions.settings}
          />
        </div>
      </div>
    </section>
  )
}