import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface AppConfig {
  port: number
  host: string
  downloadDir: string
  stateDir: string
  staticDir: string
  dht: boolean
  persist: boolean
  /** µTP (UDP-транспорт). Отключайте, если система блокирует UDP-порты. */
  utp: boolean
  /** Дополнительные трекеры (приватные, локальные сети и т.п.). */
  trackers: string[]
  /** Как открыть папку загрузок в файловом менеджере (задаёт Electron-обёртка). */
  openCommand?: 'explorer' | 'open' | 'xdg-open'
  /** Байт/сек, -1 = без ограничения. */
  downloadLimit: number
  uploadLimit: number
}

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback
  return !/^(0|false|no|off)$/i.test(value)
}

/** Минимальный парсер .env — без зависимостей. */
function loadDotEnv(file = path.resolve(process.cwd(), '.env')): void {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export function loadConfig(): AppConfig {
  loadDotEnv()

  const downloadDir = path.resolve(
    process.cwd(),
    process.env.DOWNLOAD_DIR ?? path.join(os.homedir(), 'Downloads', 'Torrential'),
  )
  const stateDir = path.join(downloadDir, '.torrential')
  const staticDir = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(process.cwd(), 'dist')

  fs.mkdirSync(downloadDir, { recursive: true })
  fs.mkdirSync(stateDir, { recursive: true })

  return {
    port: num(process.env.PORT, 8787),
    host: process.env.HOST ?? '127.0.0.1',
    downloadDir,
    stateDir,
    staticDir,
    dht: bool(process.env.DHT, true),
    persist: bool(process.env.PERSIST, true),
    utp: bool(process.env.UTP, true),
    trackers: (process.env.TRACKERS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    downloadLimit: num(process.env.TORRENTIAL_DOWNLOAD_LIMIT, -1),
    uploadLimit: num(process.env.TORRENTIAL_UPLOAD_LIMIT, -1),
  }
}