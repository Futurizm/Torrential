import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Sidebar, type View } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBar } from '@/components/layout/StatusBar'
import { TorrentList } from '@/components/torrent/TorrentList'
import { DetailsPanel } from '@/components/details/DetailsPanel'
import { SettingsView } from '@/components/settings/SettingsView'
import { AddTorrentDialog } from '@/components/dropzone/AddTorrentDialog'
import { DragOverlay } from '@/components/dropzone/DropZone'
import { Toasts } from '@/components/ui/Toasts'
import { useI18n } from '@/i18n'
import { store, useStore } from '@/store/store'

const MAGNET_RE = /^magnet:\?xt=urn:btih:/i

export default function App() {
  const { ready } = useStore()
  const { t, locale } = useI18n()
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [dialog, setDialog] = useState(false)
  const [magnet, setMagnet] = useState('')

  // Стор живёт вне React, поэтому язык передаём ему явно:
  // так тосты и тексты ошибок API тоже оказываются на нужном языке.
  useEffect(() => {
    store.setLocale(locale)
  }, [locale])

  useEffect(() => {
    void store.init()
    return () => store.dispose()
  }, [])

  /** Глобальная вставка magnet из буфера — работает на любом экране. */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const text = event.clipboardData?.getData('text')?.trim() ?? ''
      if (!MAGNET_RE.test(text)) return
      event.preventDefault()
      void store.addMagnet(text)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  /** Горячие клавиши в духе десктопных приложений. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setDialog(true)
        return
      }
      if (event.key === '/' && !typing) {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('input[placeholder]')?.focus()
        return
      }
      if (event.key === 'Escape' && !typing && detailsId) setDetailsId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailsId])

  const submitMagnet = useCallback(() => {
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
    setDialog(false)
  }, [magnet, t])

  return (
    <div className="relative flex h-full overflow-hidden bg-base-950 text-zinc-200">
      {/* Атмосферный фон */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] animate-float rounded-full bg-indigo-600/[0.14] blur-[120px]" />
        <div
          className="absolute -bottom-52 right-0 h-[34rem] w-[34rem] animate-float rounded-full bg-emerald-500/[0.09] blur-[130px]"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="absolute left-1/3 top-1/4 h-72 w-72 animate-float rounded-full bg-sky-500/[0.06] blur-[120px]"
          style={{ animationDelay: '-12s' }}
        />
      </div>

      <Sidebar view={view} onViewChange={setView} onAdd={() => setDialog(true)} />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar view={view} onAdd={() => setDialog(true)} query={query} onQueryChange={setQuery} />

        {!ready ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
              <p className="text-xs text-zinc-600">{t('top.engineOffline')}…</p>
            </div>
          </div>
        ) : view === 'settings' ? (
          <SettingsView />
        ) : (
          <TorrentList
            view={view}
            query={query}
            selectedId={detailsId}
            onOpen={(id) => setDetailsId((current) => (current === id ? null : id))}
          />
        )}

        <StatusBar />
      </main>

      {/* Панель деталей */}
      <AnimatePresence>
        {detailsId && <DetailsPanel torrentId={detailsId} onClose={() => setDetailsId(null)} />}
      </AnimatePresence>

      <AddTorrentDialog
        open={dialog}
        onClose={() => setDialog(false)}
        magnet={magnet}
        onMagnetChange={setMagnet}
        onSubmit={submitMagnet}
      />

      <DragOverlay />
      <Toasts />
    </div>
  )
}