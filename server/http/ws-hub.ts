import type { Server } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import type { TorrentRegistry } from '../torrent/registry.js'
import { createLogger } from '../logger.js'
import type { ClientMessage, ServerMessage, TorrentSnapshot } from '../../shared/protocol.js'

const log = createLogger('ws')

/** Как часто отправляем живые обновления (мс). */
const TICK_MS = 400
/** Период обновления «спящих» торрентов (пауза/ошибка/нет метаданных). */
const SLOW_TICK_MS = 5_000
/** Не шлём очередному клиенту, если он не успевает читать. */
const MAX_BUFFERED_BYTES = 1_000_000
/** Полный sync каждые N тиков (~10 секунд). */
const FULL_SYNC_EVERY_TICKS = 25

interface Connection {
  socket: WebSocket
  /** id торрентов, чьи файлы клиент хочет получать. */
  subscriptions: Set<string>
  alive: boolean
}

/**
 * WebSocket-хаб: рассылает живые снимки состояния.
 *
 * Каждый тик на каждый подключённый клиент уходит один снимок на торрент;
 * список файлов прикладывается только к тем торрентам, на которые клиент
 * подписан (открыта панель деталей).
 */
export class RealtimeHub {
  private readonly wss: WebSocketServer
  private readonly connections = new Set<Connection>()
  private readonly dirty = new Set<string>()
  private readonly lastSent = new Map<string, number>()
  private tickCount = 0
  private timer: NodeJS.Timeout | null = null

  constructor(
    server: Server,
    private readonly registry: TorrentRegistry,
  ) {
    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (socket: WebSocket) => this.onConnection(socket))

    registry.on('added', () => this.broadcastNow())
    registry.on('change', (id: string) => this.dirty.add(id))
    registry.on('settings', () => {
      this.broadcast({
        type: 'settings',
        downloadLimit: registry.globalSnapshot().downloadLimit,
        uploadLimit: registry.globalSnapshot().uploadLimit,
      })
    })
    registry.on('removed', (id: string) => {
      this.dirty.delete(id)
      this.lastSent.delete(id)
      this.broadcast({ type: 'removed', id })
    })
  }

  private onConnection(socket: WebSocket): void {
    const connection: Connection = { socket, subscriptions: new Set(), alive: true }
    this.connections.add(connection)

    socket.on('message', (raw: Buffer | string) => this.onMessage(connection, raw.toString()))
    socket.on('pong', () => {
      connection.alive = true
    })
    socket.on('close', () => {
      this.connections.delete(connection)
    })
    socket.on('error', (err: Error) => {
      log.debug('Ошибка сокета:', err.message)
      this.connections.delete(connection)
    })

    this.send(connection, this.syncMessage())
    log.debug(`Клиент подключён (всего ${this.connections.size})`)
  }

  private onMessage(connection: Connection, raw: string): void {
    let message: ClientMessage
    try {
      message = JSON.parse(raw) as ClientMessage
    } catch {
      this.send(connection, { type: 'error', message: 'Некорректный JSON' })
      return
    }

    switch (message.type) {
      case 'sync':
        this.send(connection, this.syncMessage())
        break
      case 'subscribe':
        connection.subscriptions.add(message.id)
        // Сразу отдаём актуальное состояние с файлами.
        this.send(connection, { type: 'torrent', torrent: this.registry.snapshot(message.id, true) })
        break
      case 'unsubscribe':
        connection.subscriptions.delete(message.id)
        break
      case 'ping':
        this.send(connection, { type: 'pong', ts: Date.now() })
        break
    }
  }

  private syncMessage(): ServerMessage {
    return {
      type: 'sync',
      torrents: this.registry.list().map((session) => session.snapshot(false)),
      global: this.registry.globalSnapshot(),
    }
  }

  /** Отправляет всем клиентам (кроме перегруженных). */
  broadcast(message: ServerMessage): void {
    for (const connection of this.connections) this.send(connection, message)
  }

  /** Внеочередной тик — например, сразу после добавления торрента. */
  broadcastNow(): void {
    this.tick()
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    for (const connection of this.connections) connection.socket.close()
    this.connections.clear()
    this.wss.close()
  }

  private tick(): void {
    if (this.connections.size === 0) return

    // Периодическая полная синхронизация — страховка от потерянных сообщений.
    if (++this.tickCount % FULL_SYNC_EVERY_TICKS === 0) {
      const message = this.syncMessage()
      for (const connection of this.connections) this.send(connection, message)
    }

    const sessions = this.registry.list()
    const now = Date.now()

    for (const session of sessions) {
      if (session.isDead) continue

      // Активные торренты шлём каждый тик (живые скорости), остальные — по событию
      // либо раз в SLOW_TICK_MS, чтобы пиры/очередь тоже обновлялись.
      const dirty = this.dirty.delete(session.id)
      const active = session.state === 'downloading' || session.state === 'done'
      if (!dirty && !active && now - (this.lastSent.get(session.id) ?? 0) < SLOW_TICK_MS) continue
      this.lastSent.set(session.id, now)

      let withFiles: TorrentSnapshot | null = null
      for (const connection of this.connections) {
        const needsFiles = connection.subscriptions.has(session.id)
        if (needsFiles && !withFiles) withFiles = session.snapshot(true)
        const message: ServerMessage = {
          type: 'torrent',
          torrent: needsFiles ? (withFiles as TorrentSnapshot) : session.snapshot(false),
        }
        this.send(connection, message)
      }
    }
  }

  private send(connection: Connection, message: ServerMessage): void {
    const { socket } = connection
    if (socket.readyState !== WebSocket.OPEN) return
    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) return
    socket.send(JSON.stringify(message))
  }
}