/**
 * Единый контракт между Node-движком и React-интерфейсом.
 * Файл содержит ТОЛЬКО типы, поэтому импортируется как type-only и
 * не требует рантайм-резолвинга ни на стороне сервера, ни на стороне UI.
 */

/** Жизненный цикл торрента в UI. */
export type TorrentState =
  | 'metadata' // ждём метаданные (magnet без .torrent)
  | 'downloading'
  | 'seeding' // скачан, раздаём
  | 'paused'
  | 'done'
  | 'error'

export interface FileSnapshot {
  index: number
  name: string
  /** Относительный путь внутри торрента (с названием корневой папки). */
  path: string
  size: number
  downloaded: number
  /** 0..1 */
  progress: number
  done: boolean
  /** Выбран ли пользователем для скачивания. */
  selected: boolean
}

export interface PeerSnapshot {
  address: string
  /** Краткий fingerprint клиента (первые символы peer id). */
  client: string
  downloadSpeed: number
  uploadSpeed: number
  /** true — пир ничего не отдаёт нам (сидер). */
  isSeed: boolean
}

export interface TorrentSnapshot {
  /** Стабильный внутренний id сессии (не меняется после получения metadata). */
  id: string
  infoHash: string | null
  name: string
  state: TorrentState
  error: string | null

  /** Источник: magnet-ссылка или имя .torrent-файла. */
  source: string

  length: number
  downloaded: number
  uploaded: number
  /** 0..1 */
  progress: number
  ratio: number

  downloadSpeed: number
  uploadSpeed: number
  /** Секунд до завершения, null — неизвестно/пауза. */
  eta: number | null

  numPeers: number
  peers: PeerSnapshot[]

  filesTotal: number
  filesDone: number
  selectedSize: number

  addedAt: number
  completedAt: number | null

  comment: string | null
  /** Присутствует только когда UI подписан на детали торрента. */
  files?: FileSnapshot[]
}

export interface GlobalSnapshot {
  downloadSpeed: number
  uploadSpeed: number
  numTorrents: number
  numDownloading: number
  numSeeding: number
  numPaused: number
  numDone: number
  downloaded: number
  uploaded: number
  downloadLimit: number
  uploadLimit: number
}

/* ------------------------------- WebSocket ------------------------------- */

export type ClientMessage =
  | { type: 'sync' }
  | { type: 'subscribe'; id: string }
  | { type: 'unsubscribe'; id: string }
  | { type: 'ping' }

export type ServerMessage =
  /** Полный снимок состояния (ответ на `sync` и при подключении). */
  | { type: 'sync'; torrents: TorrentSnapshot[]; global: GlobalSnapshot }
  /** Инкрементальное обновление одного торрента. */
  | { type: 'torrent'; torrent: TorrentSnapshot }
  /** Торрент был удалён или исчез из движка. */
  | { type: 'removed'; id: string }
  /** Настройки изменились. */
  | { type: 'settings'; downloadLimit: number; uploadLimit: number }
  | { type: 'pong'; ts: number }
  | { type: 'error'; message: string }

/* --------------------------------- REST ---------------------------------- */

export interface AddTorrentRequest {
  /** Либо magnet-ссылка, либо { name, data(base64) } .torrent-файла. */
  magnet?: string
  file?: { name: string; data: string }
}

export interface AddTorrentResponse {
  torrent: TorrentSnapshot
}

export interface RemoveTorrentResponse {
  id: string
  removed: boolean
}

export interface SelectFilesRequest {
  indices: number[]
}

export interface SetStateRequest {
  action: 'pause' | 'resume' | 'start' | 'check'
}

export interface TorrentListResponse {
  torrents: TorrentSnapshot[]
  global: GlobalSnapshot
}

export interface SettingsPayload {
  downloadLimit: number
  uploadLimit: number
  downloadDir: string
  persist: boolean
  dht: boolean
}