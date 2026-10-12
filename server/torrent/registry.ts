import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import WebTorrent from 'webtorrent'
import type { Torrent as WebTorrentTorrent } from 'webtorrent'
import type { AppConfig } from '../config.js'
import { createLogger } from '../logger.js'
import { badRequest, conflict, notFound } from '../errors.js'
import { TorrentSession } from './torrent-session.js'
import type { GlobalSnapshot, TorrentSnapshot } from '../../shared/protocol.js'

const log = createLogger('engine')

const TORRENT_MAGNET_RE = /^magnet:\?/i

export interface AddInput {
  /** magnet-ссылка либо содержимое .torrent-файла. */
  source: string | Buffer
  /** Отображаемый источник для UI. */
  label: string
  /** Выбранные файлы (индексы) сразу после получения metadata. */
  select?: number[]
}

/**
 * Реестр живых торрентов. Владеет единственным экземпляром WebTorrent-клиента
 * и хранит состояние между перезапусками (.torrent-файлы в stateDir).
 */
export class TorrentRegistry extends EventEmitter {
  private readonly client: WebTorrent
  private readonly sessions = new Map<string, TorrentSession>()
  private readonly infoHashIndex = new Map<string, string>()

  constructor(private readonly config: AppConfig) {
    super()
    this.setMaxListeners(0)
    this.client = this.createClient()
  }

  private createClient(): WebTorrent {
    const client = new WebTorrent({
      dht: this.config.dht ? {} : false,
      maxConns: 55,
      webSeeds: true,
      utp: this.config.utp,
    })

    // Движок часто эмитит 'error' — без слушателя процесс упал бы.
    client.on('error', (err: Error) => log.error('Клиент:', err.message))
    client.on('listening', () => log.info(`Движок слушает порт ${client.torrentPort}`))

    client.throttleDownload(this.config.downloadLimit)
    client.throttleUpload(this.config.uploadLimit)

    return client
  }

  /* -------------------------------- чтение -------------------------------- */

  list(): TorrentSession[] {
    return [...this.sessions.values()]
  }

  get(id: string): TorrentSession {
    const session = this.sessions.get(id)
    if (!session) throw notFound('Торрент не найден')
    return session
  }

  snapshot(id: string, withFiles = false): TorrentSnapshot {
    return this.get(id).snapshot(withFiles)
  }

  globalSnapshot(): GlobalSnapshot {
    let downloaded = 0
    let uploaded = 0
    let numDownloading = 0
    let numSeeding = 0
    let numPaused = 0
    let numDone = 0

    for (const session of this.sessions.values()) {
      downloaded += session.downloaded
      uploaded += session.uploaded
      if (session.paused) numPaused++
      else if (session.state === 'done') numDone++
      if (session.state === 'downloading' || session.state === 'metadata') numDownloading++
      if (session.state === 'done') numSeeding++
    }

    return {
      downloadSpeed: Math.round(this.client.downloadSpeed),
      uploadSpeed: Math.round(this.client.uploadSpeed),
      numTorrents: this.sessions.size,
      numDownloading,
      numSeeding,
      numPaused,
      numDone,
      downloaded,
      uploaded,
      downloadLimit: this.config.downloadLimit,
      uploadLimit: this.config.uploadLimit,
    }
  }

  /* -------------------------------- запись -------------------------------- */

  async add(input: AddInput): Promise<TorrentSession> {
    const source = input.source
    const isMagnet = typeof source === 'string' && TORRENT_MAGNET_RE.test(source)

    if (typeof source === 'string' && !isMagnet && source.trim().length > 0) {
      throw badRequest('Ожидалась magnet-ссылка или .torrent-файл', 'invalid_source')
    }

    // client.get ищет по info hash среди живых торрентов — это и есть проверка дубликата.
    const duplicate = await this.client.get(source)
    if (duplicate) throw conflict('Такой торрент уже есть в списке', 'duplicate')

    const session = new TorrentSession(input.label)
    if (input.select) session.setFileSelection(input.select)

    let torrent
    try {
      torrent = this.client.add(source, {
        path: this.config.downloadDir,
        destroyStoreOnDestroy: false,
        strategy: 'sequential',
        announce: this.config.trackers.length > 0 ? this.config.trackers : undefined,
      })
    } catch (err) {
      throw badRequest(`Не удалось разобрать источник: ${(err as Error).message}`, 'invalid_source')
    }

    session.attach(torrent)

    try {
      await this.waitForInfoHash(session)
    } catch (err) {
      session.destroy(false)
      throw err
    }

    this.sessions.set(session.id, session)
    this.bindSession(session)

    if (this.config.persist) this.persistTorrent(torrent)
    torrent.once('metadata', () => {
      if (this.config.persist) this.persistTorrent(torrent)
    })

    this.emit('added', session)
    log.info(`Добавлен торрент «${session.source}»`)
    return session
  }

  /**
   * Ждёт, пока движок разберёт источник и узнает info hash.
   * Благодаря этому битый .torrent отсекается сразу, а не через «торрент в ошибке».
   */
  private waitForInfoHash(session: TorrentSession, timeoutMs = 10_000): Promise<void> {
    const torrent = session.torrent
    if (!torrent) return Promise.reject(badRequest('Движок не принял источник', 'invalid_source'))
    if (torrent.infoHash) return Promise.resolve()

    return new Promise<void>((resolve) => {
      const finish = (): void => {
        clearTimeout(timer)
        torrent.removeListener('_infoHash', finish)
        torrent.removeListener('error', finish)
        torrent.removeListener('close', finish)
        resolve()
      }
      const timer = setTimeout(finish, timeoutMs)
      torrent.once('_infoHash', finish)
      torrent.once('error', finish)
      torrent.once('close', finish)
    }).then(() => {
      if (session.error) {
        throw badRequest(`Некорректный торрент: ${session.error}`, 'invalid_torrent_file')
      }
      if (!session.infoHash) throw badRequest('Не удалось определить info hash', 'invalid_source')
    })
  }

  /** Подписка сессии на события реестра (вынесена, т.к. нужна и при recheck). */
  private bindSession(session: TorrentSession): void {
    session.removeAllListeners('change')
    session.removeAllListeners('infohash')
    session.on('change', () => this.emit('change', session.id))
    this.trackInfoHash(session)
  }

  /**
   * Пересоздаёт объект торрента в движке с тем же info hash и путём на диске —
   * стандартная «проверка» в BitTorrent-клиентах. Данные не трогаются.
   */
  recheck(id: string): TorrentSession {
    const session = this.get(id)
    const buffer = session.torrent?.torrentFile
    if (!buffer) throw badRequest('Метаданные ещё не получены — проверять нечего', 'no_metadata')

    const wasPaused = session.paused
    const selection = session.selectedIndices
    const infoHash = session.infoHash

    // Сначала убираем старый объект из client.torrents, иначе WebTorrent
    // посчитает новый торрент дубликатом и сразу уничтожит его.
    session.destroy(false)
    this.infoHashIndex.delete(infoHash ?? '')

    const torrent = this.client.add(buffer, {
      path: this.config.downloadDir,
      destroyStoreOnDestroy: false,
      strategy: 'sequential',
      announce: this.config.trackers.length > 0 ? this.config.trackers : undefined,
    })
    session.attach(torrent)
    this.sessions.set(session.id, session)
    this.bindSession(session)
    if (selection.length > 0) session.setFileSelection(selection)
    if (wasPaused) session.pause()

    this.emit('added', session)
    log.info(`Запущена проверка ${infoHash}`)
    return session
  }

  remove(id: string, deleteFiles: boolean): void {
    const session = this.get(id)
    if (deleteFiles && this.config.persist && session.infoHash) {
      this.unpersistTorrent(session.infoHash)
    }
    session.destroy(deleteFiles)
    this.removeSession(session)
    log.info(`Удалён торрент ${id}${deleteFiles ? ' вместе с данными' : ''}`)
  }

  private removeSession(session: TorrentSession): void {
    this.sessions.delete(session.id)
    if (session.infoHash) this.infoHashIndex.delete(session.infoHash)
    this.emit('removed', session.id)
  }

  setPaused(id: string, paused: boolean): TorrentSession {
    const session = this.get(id)
    if (paused) session.pause()
    else session.resume()
    return session
  }

  setFileSelection(id: string, indices: number[]): TorrentSnapshot {
    const session = this.get(id)
    if (!session.hasMetadata) {
      throw conflict('Метаданные ещё не получены — подождите', 'metadata_pending')
    }
    session.setFileSelection(indices)
    return session.snapshot(true)
  }

  /* ------------------------------- настройки ------------------------------ */

  setLimits(downloadLimit: number, uploadLimit: number): void {
    this.config.downloadLimit = normalizeLimit(downloadLimit)
    this.config.uploadLimit = normalizeLimit(uploadLimit)
    this.client.throttleDownload(this.config.downloadLimit)
    this.client.throttleUpload(this.config.uploadLimit)
    this.emit('settings')
  }

  /* ------------------------- персистентность сессии ------------------------ */

  private persistPath(infoHash: string): string {
    return path.join(this.config.stateDir, `${infoHash}.magnet`)
  }

  /**
   * Сохраняет magnet-ссылку: она всегда валидна (в отличие от torrentFile,
   * который для magnet-источников не содержит info-секции) и достаточна
   * для восстановления сессии — данные лежат на диске и будут перепроверены.
   */
  private persistTorrent(torrent: WebTorrentTorrent): void {
    const infoHash = torrent.infoHash
    const uri = torrent.magnetURI
    if (!infoHash || !uri) return
    const file = this.persistPath(infoHash)
    if (fs.existsSync(file)) return
    try {
      fs.writeFileSync(file, uri, 'utf8')
    } catch (err) {
      log.warn('Не удалось сохранить magnet:', (err as Error).message)
    }
  }

  private unpersistTorrent(infoHash: string): void {
    for (const suffix of ['.magnet', '.torrent']) {
      try {
        fs.unlinkSync(path.join(this.config.stateDir, `${infoHash}${suffix}`))
      } catch {
        /* файла может не быть — это не ошибка */
      }
    }
  }

  /** Восстанавливает прошлую сессию из сохранённых magnet-ссылок. */
  async restore(): Promise<number> {
    if (!this.config.persist) return 0
    let entries: string[] = []
    try {
      entries = fs.readdirSync(this.config.stateDir).filter((name) => name.endsWith('.magnet'))
    } catch {
      return 0
    }

    let restored = 0
    for (const name of entries) {
      const file = path.join(this.config.stateDir, name)
      try {
        const magnet = fs.readFileSync(file, 'utf8').trim()
        if (!magnet.startsWith('magnet:?')) throw new Error('Файл не содержит magnet-ссылку')

        const duplicate = await this.client.get(magnet)
        if (duplicate) {
          fs.unlinkSync(file)
          continue
        }

        await this.add({ source: magnet, label: 'восстановлено' })
        restored++
      } catch (err) {
        // Файл намеренно не удаляем: временная ошибка не должна стирать сессию.
        log.warn(`Не удалось восстановить ${name}:`, (err as Error).message)
      }
    }
    if (restored > 0) log.info(`Восстановлено торрентов: ${restored}`)
    return restored
  }

  /* ------------------------------ жизненный цикл -------------------------- */

  private trackInfoHash(session: TorrentSession): void {
    const sync = (): void => {
      const infoHash = session.infoHash
      if (!infoHash) return
      const known = this.infoHashIndex.get(infoHash)
      if (known === session.id) return
      if (known) return // дубликат оставляем как есть
      this.infoHashIndex.set(infoHash, session.id)
    }
    session.on('infohash', sync)
    session.on('change', sync)
    sync()
  }

  destroy(): void {
    for (const session of this.sessions.values()) session.destroy(false)
    this.sessions.clear()
    this.infoHashIndex.clear()
    try {
      this.client.destroy()
    } catch (err) {
      log.error('Ошибка при остановке движка:', (err as Error).message)
    }
  }
}

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value)) return -1
  return Math.max(-1, Math.round(value))
}