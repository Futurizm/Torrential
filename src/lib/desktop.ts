/**
 * Мост к Electron-оболочке.
 *
 * В браузере объект `window.torrential` отсутствует — тогда все методы
 * становятся безопасными no-op, а интерфейс просто не показывает
 * кнопки, доступные только в десктопной версии.
 */

interface DesktopBridge {
  isDesktop: true
  platform: string
  info: () => Promise<{ version: string; platform: string; downloadDir: string }>
  revealDownloads: () => Promise<boolean>
  setLocale: (locale: string) => Promise<void>
}

declare global {
  interface Window {
    torrential?: DesktopBridge
  }
}

const bridge = typeof window !== 'undefined' ? window.torrential : undefined

export const isDesktop = Boolean(bridge?.isDesktop)

/** На Windows нативные кнопки окна рисуются поверх нашей шапки. */
export const hasNativeWindowControls = isDesktop && bridge?.platform === 'win32'

export async function revealDownloads(): Promise<boolean> {
  return bridge ? bridge.revealDownloads() : false
}

export async function desktopInfo(): Promise<{ version: string; platform: string; downloadDir: string } | null> {
  return bridge ? bridge.info() : null
}

/** Ставит флаг на <html>, чтобы CSS знал, что приложение запущено как десктоп. */
export function markDesktop(): void {
  if (!isDesktop || typeof document === 'undefined') return
  document.documentElement.dataset.desktop = 'true'
  document.title = 'Torrential'
}

/**
 * Сообщает оболочке язык интерфейса — она переводит свои нативные диалоги.
 * В браузере это no-op.
 */
export async function syncDesktopLocale(locale: string): Promise<void> {
  await bridge?.setLocale?.(locale)
}