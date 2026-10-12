import { Router } from 'express'
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { AppConfig } from '../config.js'
import { createLogger } from '../logger.js'
import { HttpError, badRequest } from '../errors.js'
import type { TorrentRegistry } from '../torrent/registry.js'
import type {
  AddTorrentRequest,
  SelectFilesRequest,
  SetStateRequest,
  SettingsPayload,
} from '../../shared/protocol.js'

const log = createLogger('rest')

const MAX_TORRENT_FILE_BYTES = 24 * 1024 * 1024

/** Оборачивает async-обработчики, чтобы ошибки попадали в error middleware. */
const route =
  (handler: (req: Request, res: Response) => Promise<void> | void): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next)
  }

function isMagmet(value: unknown): value is string {
  return typeof value === 'string' && /^magnet:\?xt=urn:btih:/i.test(value.trim())
}

export function createRestRouter(registry: TorrentRegistry, config: AppConfig): Router {
  const router = Router()

  router.get(
    '/health',
    route((_req, res) => {
      res.json({
        ok: true,
        version: '1.0.0',
        downloadDir: config.downloadDir,
        torrents: registry.list().length,
      })
    }),
  )

  router.get(
    '/torrents',
    route((_req, res) => {
      res.json({
        torrents: registry.list().map((session) => session.snapshot(false)),
        global: registry.globalSnapshot(),
      })
    }),
  )

  router.get(
    '/torrents/:id',
    route((req, res) => {
      const withFiles = req.query.files !== '0'
      res.json({ torrent: registry.snapshot(req.params.id, withFiles) })
    }),
  )

  router.post(
    '/torrents',
    route(async (req, res) => {
      const body = (req.body ?? {}) as AddTorrentRequest

      if (body.magnet !== undefined) {
        if (!isMagmet(body.magnet)) {
          throw badRequest('Некорректная magnet-ссылка', 'invalid_magnet')
        }
        const session = await registry.add({ source: body.magnet.trim(), label: 'magnet' })
        res.status(201).json({ torrent: session.snapshot(true) })
        return
      }

      if (body.file?.data) {
        const { name, data } = body.file
        const buffer = Buffer.from(data, 'base64')
        if (buffer.byteLength === 0) throw badRequest('Пустой .torrent-файл', 'invalid_torrent_file')
        if (buffer.byteLength > MAX_TORRENT_FILE_BYTES) {
          throw badRequest('Слишком большой .torrent-файл', 'invalid_torrent_file')
        }
        const session = await registry.add({ source: buffer, label: name || 'file.torrent' })
        res.status(201).json({ torrent: session.snapshot(true) })
        return
      }

      throw badRequest('Укажите magnet-ссылку или .torrent-файл', 'bad_request')
    }),
  )

  router.patch(
    '/torrents/:id',
    route((req, res) => {
      const { action } = (req.body ?? {}) as SetStateRequest
      switch (action) {
        case 'pause':
          res.json({ torrent: registry.setPaused(req.params.id, true).snapshot(false) })
          break
        case 'resume':
        case 'start':
          res.json({ torrent: registry.setPaused(req.params.id, false).snapshot(false) })
          break
        case 'check':
          // Повторная проверка: пересоздаём объект движка с тем же info hash.
          res.json({ torrent: registry.recheck(req.params.id).snapshot(false) })
          break
        default:
          throw badRequest('Неизвестное действие', 'unknown_action')
      }
    }),
  )

  router.delete(
    '/torrents/:id',
    route((req, res) => {
      const deleteFiles = req.query.deleteFiles === '1' || req.query.deleteFiles === 'true'
      registry.remove(req.params.id, deleteFiles)
      res.json({ id: req.params.id, removed: true })
    }),
  )

  router.put(
    '/torrents/:id/files',
    route((req, res) => {
      const { indices } = (req.body ?? {}) as SelectFilesRequest
      if (!Array.isArray(indices)) throw badRequest('Ожидается массив индексов файлов', 'bad_request')
      res.json({ torrent: registry.setFileSelection(req.params.id, indices) })
    }),
  )

  router.get(
    '/settings',
    route((_req, res) => {
      const payload: SettingsPayload = {
        downloadLimit: config.downloadLimit,
        uploadLimit: config.uploadLimit,
        downloadDir: config.downloadDir,
        persist: config.persist,
        dht: config.dht,
      }
      res.json(payload)
    }),
  )

  router.put(
    '/settings',
    route((req, res) => {
      const body = (req.body ?? {}) as Partial<SettingsPayload>
      registry.setLimits(Number(body.downloadLimit ?? -1), Number(body.uploadLimit ?? -1))
      const payload: SettingsPayload = {
        downloadLimit: config.downloadLimit,
        uploadLimit: config.uploadLimit,
        downloadDir: config.downloadDir,
        persist: config.persist,
        dht: config.dht,
      }
      log.info('Настройки обновлены', payload)
      res.json(payload)
    }),
  )

  return router
}

/**
 * Централизованный обработчик ошибок REST API.
 *
 * Отдаём и текст, и код: клиент показывает локализованное сообщение по `code`,
 * а `error` остаётся запасным вариантом (curl, отладка, старые клиенты).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code })
    return
  }
  const message = err instanceof Error ? err.message : 'Внутренняя ошибка'
  log.error('REST:', message)
  res.status(500).json({ error: message, code: 'internal' })
}