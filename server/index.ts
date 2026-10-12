import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { loadConfig } from './config.js'
import { createLogger } from './logger.js'
import { createRestRouter, errorHandler } from './http/rest.js'
import { RealtimeHub } from './http/ws-hub.js'
import { TorrentRegistry } from './torrent/registry.js'

const log = createLogger('app')

async function main(): Promise<void> {
  const config = loadConfig()
  const registry = new TorrentRegistry(config)

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32mb' }))
  app.use('/api', createRestRouter(registry, config))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Метод API не найден', code: 'not_found' })
  })

  // В продакшене (и в Electron/Tauri) тот же процесс отдаёт собранный UI.
  if (fs.existsSync(path.join(config.staticDir, 'index.html'))) {
    app.use(express.static(config.staticDir))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(config.staticDir, 'index.html'))
    })
    log.info(`Раздача UI из ${config.staticDir}`)
  }

  app.use(errorHandler)

  const server = http.createServer(app)
  const hub = new RealtimeHub(server, registry)
  hub.start()

  await registry.restore()

  server.listen(config.port, config.host, () => {
    log.info(`Torrential готов → http://${config.host}:${config.port}`)
    log.info(`Загрузки: ${config.downloadDir}`)
  })

  const shutdown = (signal: string): void => {
    log.info(`Получен ${signal}, останавливаюсь…`)
    hub.stop()
    registry.destroy()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => log.error('Unhandled rejection:', reason))
  process.on('uncaughtException', (err) => log.error('Uncaught exception:', err))
}

main().catch((err: unknown) => {
  log.error('Не удалось запустить Torrential:', err)
  process.exit(1)
})