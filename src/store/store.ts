import { useSyncExternalStore } from 'react'
import type {
  GlobalSnapshot,
  ServerMessage,
  SettingsPayload,
  TorrentSnapshot,
} from '@shared/protocol'
import { api, ApiError, createSocket } from '@/lib/api'
import {
  createTranslator,
  readStoredLocale,
  type Locale,
  type TranslationKey,
} from '@/i18n/core'

export type ConnectionStatus = 'connecting' | 'open' | 'closed'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: 'default' | 'success' | 'error'
}

export interface StoreState {
  torrents: Record<string, TorrentSnapshot>
  order: string[]
  global: GlobalSnapshot
  settings: SettingsPayload | null
  connection: ConnectionStatus
  toasts: Toast[]
  ready: boolean
  /** Держим и в сторе: тосты и ошибки API переводятся вне React-дерева. */
  locale: Locale
}

const EMPTY_GLOBAL: GlobalSnapshot = {
  downloadSpeed: 0,
  uploadSpeed: 0,
  numTorrents: 0,
  numDownloading: 0,
  numSeeding: 0,
  numPaused: 0,
  numDone: 0,
  downloaded: 0,
  uploaded: 0,
  downloadLimit: -1,
  uploadLimit: -1,
}

const INITIAL: StoreState = {
  torrents: {},
  order: [],
  global: EMPTY_GLOBAL,
  settings: null,
  connection: 'connecting',
  toasts: [],
  ready: false,
  locale: readStoredLocale(),
}

type Listener = () => void

/**
 * Единственный источник правды на клиенте.
 *
 * Мутации ходят через REST, а состояние приходит живьём по WebSocket —
 * так интерфейс не блокируется и не несёт логики торрентов.
 */
class TorrentStore {
  private state: StoreState = INITIAL
  private listeners = new Set<Listener>()
  private socket: ReturnType<typeof createSocket> | null = null
  private toastSeq = 0
  /** Нужен, чтобы StrictMode-двойной mount не оставлял второе соединение. */
  private generation = 0
  private translator = createTranslator(INITIAL.locale)

  /* --------------------------- язык интерфейса --------------------------- */

  /** Вызывается провайдером i18n: переводит будущие тосты и ошибки. */
  setLocale(locale: Locale): void {
    this.translator = createTranslator(locale)
    this.set({ locale })
  }

  private t = (key: TranslationKey, values?: Record<string, string | number>): string =>
    this.translator.t(key, values)

  /** Текст ошибки: по коду из API, иначе как прислал сервер. */
  private errorText(error: unknown): string {
    if (error instanceof ApiError && error.code) {
      const key = `error.${error.code}` as TranslationKey
      return this.translator.t(key)
    }
    return error instanceof Error ? error.message : String(error)
  }

  /* ------------------------------ подписка ------------------------------- */

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): StoreState => this.state

  private set(patch: Partial<StoreState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  /* --------------------------------- init -------------------------------- */

  async init(): Promise<void> {
    const generation = ++this.generation
    const stale = (): boolean => generation !== this.generation

    try {
      const { torrents } = await api.list()
      if (stale()) return
      this.set({
        torrents: index(torrents),
        order: torrents.map((t) => t.id),
        ready: true,
      })
    } catch {
      if (stale()) return
      this.pushToast({
        title: this.t('toast.engineDown'),
        description: this.t('toast.engineDownHint'),
        tone: 'error',
      })
    }

    try {
      const settings = await api.settings()
      if (!stale()) this.set({ settings })
    } catch {
      /* настройки не критичны */
    }

    if (stale()) return

    const socket = createSocket({
      onStatus: (connection) => {
        if (!stale()) this.set({ connection })
      },
      onMessage: (message) => {
        if (!stale()) this.onMessage(message)
      },
    })

    if (stale()) socket.close()
    else this.socket = socket
  }

  dispose(): void {
    this.generation += 1
    this.socket?.close()
    this.socket = null
  }

  /* ------------------------------- сокет -------------------------------- */

  private onMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'sync': {
        // Полный снимок: заменяем карту, но сохраняем уже загруженные списки файлов.
        const torrents: Record<string, TorrentSnapshot> = {}
        for (const torrent of message.torrents) {
          torrents[torrent.id] = this.mergeFiles(torrent)
        }
        this.set({
          torrents,
          order: message.torrents.map((t) => t.id),
          global: message.global,
          ready: true,
        })
        break
      }
      case 'torrent': {
        this.upsert(message.torrent)
        break
      }
      case 'removed': {
        const torrents = { ...this.state.torrents }
        delete torrents[message.id]
        this.set({
          torrents,
          order: this.state.order.filter((id) => id !== message.id),
        })
        break
      }
      case 'settings': {
        const settings = this.state.settings
        if (settings) {
          this.set({ settings: { ...settings, downloadLimit: message.downloadLimit, uploadLimit: message.uploadLimit } })
        }
        break
      }
      default:
        break
    }
  }

  private mergeFiles(torrent: TorrentSnapshot): TorrentSnapshot {
    const previous = this.state.torrents[torrent.id]
    if (torrent.files || !previous?.files) return torrent
    return { ...torrent, files: previous.files }
  }

  private upsert(torrent: TorrentSnapshot): void {
    const merged = this.mergeFiles(torrent)
    const torrents = { ...this.state.torrents, [merged.id]: merged }
    const order = this.state.order.includes(merged.id)
      ? this.state.order
      : [merged.id, ...this.state.order]
    this.set({ torrents, order })
  }

  /* ------------------------------- команды ------------------------------ */

  async addMagnet(magnet: string): Promise<void> {
    const clean = magnet.trim()
    if (!clean) return
    try {
      const torrent = await api.addMagnet(clean)
      this.upsert(torrent)
      this.pushToast({ title: this.t('toast.added'), description: torrent.name, tone: 'success' })
    } catch (err) {
      this.pushToast({
        title: this.t('toast.addFailed'),
        description: this.errorText(err),
        tone: 'error',
      })
    }
  }

  async addFiles(files: File[]): Promise<void> {
    const valid = files.filter((file) => /\.torrent$/i.test(file.name))
    if (valid.length === 0) {
      this.pushToast({
        title: this.t('toast.notTorrent'),
        description: this.t('toast.notTorrentHint'),
        tone: 'error',
      })
      return
    }

    const results = await Promise.allSettled(valid.map((file) => api.addFile(file)))
    const added = results.filter((r) => r.status === 'fulfilled').length
    for (const result of results) {
      if (result.status === 'fulfilled') this.upsert(result.value)
    }
    const failed = results.length - added

    if (added > 0) {
      this.pushToast({
        title: added > 1 ? this.t('toast.addedMany', { count: added }) : this.t('toast.added'),
        tone: 'success',
      })
    }
    if (failed > 0) {
      const reason = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
      this.pushToast({
        title: this.t('toast.fileError'),
        description: reason ? this.errorText(reason.reason) : undefined,
        tone: 'error',
      })
    }
  }

  async setPaused(id: string, paused: boolean): Promise<void> {
    try {
      const torrent = await api.setState(id, paused ? 'pause' : 'resume')
      this.upsert(torrent)
    } catch (err) {
      this.pushToast({ title: this.t('toast.error'), description: this.errorText(err), tone: 'error' })
    }
  }

  async recheck(id: string): Promise<void> {
    try {
      this.upsert(await api.setState(id, 'check'))
    } catch (err) {
      this.pushToast({
        title: this.t('toast.recheckFailed'),
        description: this.errorText(err),
        tone: 'error',
      })
    }
  }

  async remove(id: string, deleteFiles: boolean): Promise<void> {
    try {
      await api.remove(id, deleteFiles)
      const torrents = { ...this.state.torrents }
      delete torrents[id]
      this.set({ torrents, order: this.state.order.filter((item) => item !== id) })
    } catch (err) {
      this.pushToast({
        title: this.t('toast.removeFailed'),
        description: this.errorText(err),
        tone: 'error',
      })
    }
  }

  async selectFiles(id: string, indices: number[]): Promise<void> {
    try {
      this.upsert(await api.selectFiles(id, indices))
    } catch (err) {
      this.pushToast({
        title: this.t('toast.selectFailed'),
        description: this.errorText(err),
        tone: 'error',
      })
    }
  }

  async saveSettings(payload: Partial<SettingsPayload>): Promise<void> {
    try {
      this.set({ settings: await api.saveSettings(payload) })
    } catch (err) {
      this.pushToast({ title: this.t('toast.error'), description: this.errorText(err), tone: 'error' })
    }
  }

  subscribeDetails(id: string): void {
    this.socket?.subscribe(id)
  }

  unsubscribeDetails(id: string): void {
    this.socket?.unsubscribe(id)
  }

  /* --------------------------------- тосты ------------------------------- */

  pushToast(toast: Omit<Toast, 'id'>): void {
    const id = `toast-${++this.toastSeq}`
    this.set({ toasts: [...this.state.toasts, { ...toast, id }] })
    window.setTimeout(() => this.dismissToast(id), toast.tone === 'error' ? 6000 : 3200)
  }

  dismissToast(id: string): void {
    this.set({ toasts: this.state.toasts.filter((toast) => toast.id !== id) })
  }
}

function index(torrents: TorrentSnapshot[]): Record<string, TorrentSnapshot> {
  return Object.fromEntries(torrents.map((torrent) => [torrent.id, torrent]))
}

export const store = new TorrentStore()

/* --------------------------------- хуки --------------------------------- */

export function useStore(): StoreState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useTorrents(): TorrentSnapshot[] {
  const state = useStore()
  return state.order.map((id) => state.torrents[id]).filter(Boolean)
}

/** Глобальные скорости считаем локально — они всегда свежее серверного sync. */
export function useGlobalStats() {
  const state = useStore()
  let down = 0
  let up = 0
  for (const torrent of Object.values(state.torrents)) {
    down += torrent.downloadSpeed
    up += torrent.uploadSpeed
  }
  return {
    ...state.global,
    downloadSpeed: down,
    uploadSpeed: up,
    numTorrents: state.order.length,
  }
}