import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import type { Torrent, Wire } from 'webtorrent'
import type {
  FileSnapshot,
  PeerSnapshot,
  TorrentSnapshot,
  TorrentState,
} from '../../shared/protocol.js'
import { createLogger } from '../logger.js'

const log = createLogger('session')

const MAX_PEERS_IN_SNAPSHOT = 12

function peerIdToString(peerId: Wire['peerId']): string {
  if (!peerId) return ''
  if (typeof peerId === 'string') return peerId
  return Buffer.from(peerId).toString('binary')
}

/**
 * Обёртка над одним торрентом движка: держит состояние, выбранные файлы,
 * паузу и строит сериализуемый снимок для UI.
 */
export class TorrentSession extends EventEmitter {
  readonly id: string = randomUUID()
  readonly addedAt: number = Date.now()

  torrent: Torrent | null = null
  source: string
  error: string | null = null
  completedAt: number | null = null
  paused = false
  noPeers = false

  /** Индексы файлов, выбранных пользователем. */
  private selected = new Set<number>()
  /** Пользователь уже редактировал выборку — не перетираем её автоматически. */
  private userPickedFiles = false
  /** Сессия удалена и больше не публикуется в UI. */
  isDead = false
  private onClose: (() => void) | null = null

  constructor(source: string) {
    super()
    this.source = source
  }

  /* ------------------------------ состояние ------------------------------ */

  get infoHash(): string | null {
    return this.torrent?.infoHash ?? null
  }

  get hasMetadata(): boolean {
    const t = this.torrent
    return !!t && !t.destroyed && !!t.metadata && t.files.length > 0
  }

  get progress(): number {
    if (!this.torrent?.bitfield) return 0
    return Math.min(1, Math.max(0, this.torrent.progress))
  }

  get downloaded(): number {
    return this.torrent?.downloaded ?? 0
  }

  get uploaded(): number {
    return this.torrent?.uploaded ?? 0
  }

  get selectedIndices(): number[] {
    return [...this.selected].sort((a, b) => a - b)
  }

  /** Суммарный объём выбранных файлов (байт). */
  get selectedSize(): number {
    const files = this.torrent?.files
    if (!files) return 0
    let total = 0
    for (const index of this.selected) {
      const file = files[index]
      if (file) total += file.length
    }
    return total
  }

  get state(): TorrentState {
    if (this.error) return 'error'
    if (this.paused) return 'paused'
    if (!this.hasMetadata) return 'metadata'
    if (this.progress >= 1) return 'done'
    return 'downloading'
  }

  /* ------------------------- жизненный цикл объекта ----------------------- */

  attach(torrent: Torrent): void {
    this.detach()
    this.isDead = false
    this.torrent = torrent

    torrent.on('metadata', () => {
      if (!this.userPickedFiles) this.selected = new Set(torrent.files.map((_, i) => i))
      this.applySelection()
      this.emit('change')
    })

    torrent.on('_infoHash', () => this.emit('infohash'))
    torrent.on('download', () => this.emit('change'))
    torrent.on('upload', () => this.emit('change'))

    torrent.on('noPeers', () => {
      this.noPeers = true
      this.emit('change')
    })

    torrent.on('warning', (err: Error) => log.warn(`[${this.id}] ${torrent.name}: ${err.message}`))

    torrent.on('done', () => {
      this.completedAt ??= Date.now()
      this.emit('change')
      this.emit('done')
    })

    torrent.on('error', (err: Error) => {
      this.error = err.message
      log.error(`[${this.id}] ${torrent.name}: ${err.message}`)
      this.emit('change')
    })

    this.onClose = () => {
      if (this.torrent === torrent) this.torrent = null
      this.emit('change')
    }
    torrent.on('close', this.onClose)

    this.applySelection()
  }

  /** Отписывается от текущего объекта движка, не трогая состояние сессии. */
  private detach(): void {
    const torrent = this.torrent
    if (!torrent) return
    if (this.onClose) torrent.removeListener('close', this.onClose)
    this.onClose = null
    this.torrent = null
  }

  /* ------------------------------ управление ----------------------------- */

  pause(): void {
    if (this.paused || !this.torrent) return
    this.paused = true
    this.torrent.pause()
    this.applySelection()
    this.setWiresInterested(false)
    this.emit('change')
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.torrent?.resume()
    this.applySelection()
    this.setWiresInterested(true)
    this.emit('change')
  }

  /**
   * Явно сообщает пирам о нашем интересе.
   *
   * Снятие выборки само по себе не отправляет «not interested»: WebTorrent
   * считает нас заинтересованными, пока у пира есть хоть один кусок. Без
   * этого сообщения на паузе продолжают долетать уже запрошенные куски —
   * до нескольких мегабайт, что выглядит как «пауза не работает».
   */
  private setWiresInterested(interested: boolean): void {
    const torrent = this.torrent
    if (!torrent || torrent.destroyed) return
    for (const wire of torrent.wires) {
      try {
        if (interested) wire.interested()
        else wire.uninterested()
      } catch {
        /* соединение могло закрыться между проверкой и вызовом */
      }
    }
  }

  setFileSelection(indices: number[]): void {
    const files = this.torrent?.files
    if (!files) return
    const next = new Set<number>()
    for (const raw of indices) {
      const index = Number(raw)
      if (Number.isInteger(index) && index >= 0 && index < files.length) next.add(index)
    }
    this.selected = next
    this.userPickedFiles = true
    this.applySelection()
    this.emit('change')
  }

  /**
   * Пересобирает выбранные куски.
   *
   * Важно: BitTorrent оперирует кусками (pieces), а не файлами, поэтому файл
   * может скачаться целиком, если он делит куски с соседним выбранным файлом,
   * и наоборот — один кусок может покрывать часть пропущенного файла.
   * Соседние выбранные файлы склеиваются в диапазоны, чтобы не делать
   * тысячи отдельных select()-ов на больших раздачах.
   */
  private applySelection(): void {
    const torrent = this.torrent
    if (!torrent || torrent.destroyed || !torrent.metadata || torrent.pieces.length === 0) return

    torrent.deselect(0, torrent.pieces.length - 1)
    if (this.paused) return

    const files = torrent.files
    const indices = this.selectedIndices.filter((index) => index < files.length)

    const selectRange = (from: number, to: number): void => {
      const first = files[from]
      const last = files[to]
      if (!first || !last) return
      const startPiece = Math.floor(first.offset / torrent.pieceLength)
      const endFile = last.length > 0 ? last.offset + last.length - 1 : last.offset
      const endPiece = Math.floor(endFile / torrent.pieceLength)
      if (endPiece < startPiece) return
      torrent.select(startPiece, Math.min(endPiece, torrent.pieces.length - 1))
    }

    let runStart = -1
    let runEnd = -1
    for (const index of indices) {
      if (runStart === -1) {
        runStart = index
        runEnd = index
        continue
      }
      if (index === runEnd + 1) {
        runEnd = index
        continue
      }
      selectRange(runStart, runEnd)
      runStart = index
      runEnd = index
    }
    if (runStart !== -1) selectRange(runStart, runEnd)
  }

  /* ------------------------------- снимки --------------------------------- */

  private peersSnapshot(): PeerSnapshot[] {
    const torrent = this.torrent
    if (!torrent || torrent.wires.length === 0) return []
    return torrent.wires.slice(0, MAX_PEERS_IN_SNAPSHOT).map((wire) => ({
      address: `${wire.remoteAddress ?? '?'}:${wire.remotePort ?? 0}`,
      client: peerIdToString(wire.peerId).slice(1, 9),
      downloadSpeed: Math.round(wire.downloadSpeed ?? 0),
      uploadSpeed: Math.round(wire.uploadSpeed ?? 0),
      isSeed: (wire._pieces?.length ?? 0) === 0,
    }))
  }

  private filesSnapshot(): FileSnapshot[] {
    const torrent = this.torrent
    if (!torrent || torrent.files.length === 0) return []
    return torrent.files.map((file, index) => ({
      index,
      name: file.name,
      path: file.path,
      size: file.length,
      downloaded: Math.min(file.length, Math.round(file.downloaded)),
      progress: file.length ? Math.min(1, file.progress) : 1,
      done: file.done,
      selected: this.selected.has(index),
    }))
  }

  /** ETA в секундах; null — скорость нулевая, пауза или нет метаданных. */
  private estimateEta(downloaded: number, downloadSpeed: number): number | null {
    if (!this.hasMetadata || this.paused) return null
    if (downloadSpeed <= 0) return null
    const remaining = Math.max(0, this.selectedSize - downloaded)
    if (remaining <= 0) return 0
    return Math.round(remaining / downloadSpeed)
  }

  snapshot(withFiles = false): TorrentSnapshot {
    const torrent = this.torrent
    const downloaded = torrent?.downloaded ?? 0
    const uploaded = torrent?.uploaded ?? 0
    const length = torrent?.length ?? 0
    const downloadSpeed = Math.round(torrent?.downloadSpeed ?? 0)
    const uploadSpeed = Math.round(torrent?.uploadSpeed ?? 0)
    const files = torrent?.files ?? []

    return {
      id: this.id,
      infoHash: this.infoHash,
      name: torrent?.name || (torrent?.metadata ? 'Без названия' : 'Получение метаданных…'),
      state: this.state,
      error: this.error,
      source: this.source,
      length,
      downloaded,
      uploaded,
      progress: this.progress,
      ratio: downloaded > 0 ? uploaded / downloaded : 0,
      downloadSpeed,
      uploadSpeed,
      eta: this.estimateEta(downloaded, downloadSpeed),
      numPeers: torrent?.numPeers ?? 0,
      peers: this.peersSnapshot(),
      filesTotal: files.length,
      filesDone: files.reduce((total, file) => total + (file.done ? 1 : 0), 0),
      selectedSize: this.selectedSize,
      addedAt: this.addedAt,
      completedAt: this.completedAt,
      comment: torrent?.comment || null,
      ...(withFiles ? { files: this.filesSnapshot() } : {}),
    }
  }

  /* ------------------------------ удаление ------------------------------- */

  destroy(deleteFiles: boolean): void {
    this.isDead = true
    const torrent = this.torrent
    this.detach()
    this.removeAllListeners()
    if (!torrent || torrent.destroyed) return
    try {
      if (deleteFiles) torrent.destroy({ destroyStore: true })
      else torrent.destroy()
    } catch (err) {
      log.error(`Не удалось удалить торрент ${this.id}:`, (err as Error).message)
    }
  }
}