/**
 * Минимальные типы для webtorrent (пакет не поставляет .d.ts).
 * Описывают ровно тот API, который использует Torrential.
 */
declare module 'webtorrent' {
  import type { EventEmitter } from 'node:events'

  export interface TorrentFile {
    name: string
    /** Путь относительно корня торрента. */
    path: string
    length: number
    size: number
    /** mime-тип по расширению. */
    type: string
    /** Смещение файла внутри набора данных торрента (в байтах). */
    offset: number
    done: boolean
    readonly downloaded: number
    readonly progress: number
    select(priority?: number): void
    deselect(): void
    createReadStream(opts?: { start?: number; end?: number }): NodeJS.ReadableStream
  }

  export interface TorrentPeer {
    type: string
    addr: string
    client?: string
  }

  export interface Wire {
    peerId: string | Buffer
    remoteAddress?: string
    remotePort?: number
    downloadSpeed: number
    uploadSpeed: number
    /** Кусочки, которые отдал этот пир. */
    _pieces?: number[]
    /** Мы задушили пира (то есть перестали отдавать). */
    choke(): void
    unchoke(): void
    /** Мы заинтересованы в кусках пира / не заинтересованы. */
    interested(): void
    uninterested(): void
    destroy(error?: Error): void
  }

  export interface TorrentOptions {
    /** Каталог для сохранения данных. */
    path?: string
    /** Дополнительные трекеры, добавляются к списку из .torrent/magnet. */
    announce?: string[]
    /** Не удалять данные при destroy(). */
    destroyStoreOnDestroy?: boolean
    /** 'rarest' | 'sequential' */
    strategy?: 'rarest' | 'sequential'
    /** Отдавать раздающим только выбранные файлы. */
    alwaysChokeSeeders?: boolean
    /** Пропустить проверку хешей. */
    skipVerify?: boolean
    private?: boolean
    /** Максимум одновременных подключений на торрент. */
    maxConns?: number
    name?: string
  }

  export interface Torrent extends EventEmitter {
    infoHash: string | null
    name: string
    /** Каноническая magnet-ссылка на этот торрент (после разбора источника). */
    magnetURI: string
    /** Сырой .torrent (Buffer) — null для magnet до получения metadata. */
    torrentFile: Buffer | null
    comment: string
    length: number
    done: boolean
    destroyed: boolean
    ready: boolean
    paused: boolean
    /** true, если метаданные получены. */
    metadata: boolean
    files: TorrentFile[]
    pieces: unknown[]
    pieceLength: number
    lastPieceLength: number
    bitfield: { get(index: number): boolean } | null
    peers: TorrentPeer[]
    wires: Wire[]
    numPeers: number

    readonly progress: number
    readonly downloaded: number
    readonly uploaded: number
    readonly received: number
    readonly ratio: number
    readonly downloadSpeed: number
    readonly uploadSpeed: number
    readonly timeRemaining: number

    select(start?: number, end?: number, priority?: number, notify?: boolean): void
    deselect(start: number, end: number): void
    critical(start: number, end: number): void

    /** Прекращает открывать новые соединения (не останавливает передачу). */
    pause(): void
    resume(): void

    destroy(opts?: { destroyStore?: boolean } | ((err?: Error) => void), cb?: (err?: Error) => void): void
  }

  export interface ClientOptions {
    torrentPort?: number
    dhtPort?: number
    dht?: boolean | Record<string, unknown>
    tracker?: boolean | Record<string, unknown>
    lsd?: boolean
    utp?: boolean
    utPex?: boolean
    maxConns?: number
    downloadLimit?: number
    uploadLimit?: number
    webSeeds?: boolean
    natUpnp?: boolean
    natPmp?: boolean
  }

  export default class WebTorrent extends EventEmitter {
    constructor(opts?: ClientOptions)
    torrents: Torrent[]
    torrentPort: number
    readonly downloadSpeed: number
    readonly uploadSpeed: number
    readonly progress: number
    readonly ratio: number
    add(torrentId: string | Buffer, opts?: TorrentOptions, ontorrent?: (t: Torrent) => void): Torrent
    get(torrentId: string | Buffer | Torrent): Promise<Torrent | null>
    remove(torrentId: string | Buffer | Torrent, opts?: unknown, cb?: (err?: Error) => void): Promise<void>
    throttleDownload(rate: number): void
    throttleUpload(rate: number): void
    address(): { address: string; family: string; port: number } | null
    destroy(cb?: (err?: Error) => void): void
    static readonly VERSION: string
  }
}