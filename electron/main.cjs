/**
 * Electron-обёртка Torrential.
 *
 * Окно загружает тот же UI, что и в браузере, а движок (WebTorrent) живёт
 * отдельным процессом: мы переиспользуем рантайм самого Electron
 * (ELECTRON_RUN_AS_NODE=1), поэтому второй node.exe в сборку не нужен.
 *
 * Dev-режим и packaged-режим отличаются только путями до движка.
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const isDev = !app.isPackaged
const ROOT = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'engine')

const ENGINE_ENTRY = path.join(ROOT, 'dist-server', 'server', 'index.js')
const STATIC_DIR = path.join(ROOT, 'dist')
const DOWNLOAD_DIR = path.join(app.getPath('downloads'), 'Torrential')

/** Порт выбирается динамически — два экземпляра не будут драться за 8787. */
const HOST = '127.0.0.1'

const APP_DESCRIPTION = 'minimalistic desktop torrent client'

/**
 * Нативные сообщения оболочки. Язык синхронизируется с интерфейсом:
 * renderer присылает его через IPC и мы кладём в userData/locale.txt.
 */
const MESSAGES = {
  ru: {
    engineStopped: 'Движок остановился',
    engineStoppedText: (code, log) =>
      `Процесс WebTorrent завершился с кодом ${code}. Перезапустите приложение.\n\nПодробности: ${log}`,
    startFailed: 'Не удалось запустить Torrential',
    startFailedText: (error, log) => `${error}\n\nПодробности: ${log}`,
    logDetails: (log) => `Подробности: ${log}`,
  },
  en: {
    engineStopped: 'Engine stopped',
    engineStoppedText: (code, log) =>
      `The WebTorrent process exited with code ${code}. Please restart the app.\n\nDetails: ${log}`,
    startFailed: 'Could not start Torrential',
    startFailedText: (error, log) => `${error}\n\nDetails: ${log}`,
    logDetails: (log) => `Details: ${log}`,
  },
}

let locale = 'ru'

function localeFile() {
  return path.join(app.getPath('userData'), 'locale.txt')
}

function readLocale() {
  try {
    const value = fs.readFileSync(localeFile(), 'utf8').trim()
    if (value === 'ru' || value === 'en') locale = value
  } catch {
    /* первый запуск — язык по умолчанию */
  }
}

function t(key, ...args) {
  const messages = MESSAGES[locale] ?? MESSAGES.ru
  const value = messages[key]
  return typeof value === 'function' ? value(...args) : value
}

let mainWindow = null
let engine = null
let enginePort = null
let quitting = false

/* ------------------------------- логирование ----------------------------- */

/**
 * На Windows консоль Electron не всегда доступна, поэтому дублируем лог в файл:
 * %APPDATA%/Torrential/desktop.log — его удобно приложить к баг-репорту.
 */
function log(level, ...args) {
  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : (arg?.stack ?? JSON.stringify(arg))))
    .join(' ')
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`

  if (level === 'error') console.error(line)
  else console.log(line)

  try {
    const file = path.join(app.getPath('userData'), 'desktop.log')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    if (fs.existsSync(file) && fs.statSync(file).size > 512 * 1024) fs.rmSync(file)
    fs.appendFileSync(file, `${line}\n`, 'utf8')
  } catch {
    /* логирование — не критичная функция */
  }
}

/* ------------------------------- утилиты -------------------------------- */

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.unref()
    probe.on('error', reject)
    probe.listen(0, HOST, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

async function waitForEngine(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (engine && engine.exitCode !== null) {
      throw new Error(`Движок завершился с кодом ${engine.exitCode}`)
    }
    try {
      const response = await fetch(`http://${HOST}:${port}/api/health`)
      if (response.ok) return
    } catch {
      /* движок ещё поднимается */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Движок не ответил за отведённое время')
}

function startEngine(port) {
  return spawn(process.execPath, [ENGINE_ENTRY], {
    // Ключевой момент: electron.exe в этом режиме работает как обычный Node.
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOST,
      PORT: String(port),
      DOWNLOAD_DIR,
      STATIC_DIR,
      LOG_LEVEL: process.env.TORRENTIAL_LOG ?? 'info',
      ...(process.env.TORRENTIAL_EXTRA ? JSON.parse(process.env.TORRENTIAL_EXTRA) : {}),
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function forwardEngineOutput() {
  if (!engine) return
  const send = (stream, level) => {
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      for (const line of chunk.split('\n')) {
        if (line.trim()) log(level, line)
      }
    })
  }
  send(engine.stdout, 'info')
  send(engine.stderr, 'error')
}

function stopEngine() {
  if (!engine || engine.exitCode !== null) return
  // На Windows сигналы не доставляются — процесс просто завершается.
  // Это безопасно: куски лежат на диске и при следующем старте перепроверяются.
  engine.kill('SIGTERM')
  setTimeout(() => {
    if (engine && engine.exitCode === null) engine.kill('SIGKILL')
  }, 4000).unref()
}

/* -------------------------------- окно ---------------------------------- */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: '#08080b',
    autoHideMenuBar: true,
    // В собранном приложении иконка берётся из ресурсов .exe, а в dev — отсюда.
    icon: isDev ? path.join(__dirname, '..', 'build', 'icon.png') : undefined,
    // Кастомная шапка: на Windows рисуем нативные кнопки поверх нашего TopBar.
    titleBarStyle: 'hidden',
    titleBarOverlay:
      process.platform === 'win32' ? { color: '#0b0b10', symbolColor: '#8b8b96', height: 44 } : undefined,
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Диагностика: без этих обработчиков падение рендерера выглядит как чёрный экран.
  mainWindow.webContents.on('did-fail-load', (_e, code, description, url) => {
    log('error', `Не удалось загрузить ${url}: ${description} (${code})`)
  })
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log('error', 'Рендерер завершился:', details)
  })
  mainWindow.webContents.on('unresponsive', () => log('warn', 'Окно перестало отвечать'))
  mainWindow.webContents.on('responsive', () => log('info', 'Окно снова отвечает'))
  mainWindow.webContents.on('preload-error', (_e, file, error) => {
    log('error', `Ошибка preload ${file}:`, error)
  })

  // Внешние ссылки открываем в системном браузере, внутри приложения — ничего.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://${HOST}:${enginePort}`)) event.preventDefault()
  })

  void mainWindow.loadURL(`http://${HOST}:${enginePort}`)
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: `About Torrential — ${APP_DESCRIPTION}` },
              { type: 'separator' },
              { role: 'hide', label: 'Hide' },
              { role: 'quit', label: 'Quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Перезагрузить' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Масштаб 100%' },
        { role: 'zoomIn', label: 'Приблизить' },
        { role: 'zoomOut', label: 'Отдалить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Во весь экран' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/* --------------------------------- IPC ---------------------------------- */

ipcMain.handle('torrential:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  downloadDir: DOWNLOAD_DIR,
}))

ipcMain.handle('torrential:set-locale', (_event, value) => {
  if (value !== 'ru' && value !== 'en') return false
  locale = value
  try {
    fs.writeFileSync(localeFile(), value, 'utf8')
  } catch {
    /* язык просто не запомнится между запусками */
  }
  log('info', `Язык интерфейса: ${value}`)
  return true
})

ipcMain.handle('torrential:reveal-downloads', () => {
  const command =
    process.platform === 'win32'
      ? { file: 'explorer.exe', args: [DOWNLOAD_DIR] }
      : process.platform === 'darwin'
        ? { file: 'open', args: [DOWNLOAD_DIR] }
        : { file: 'xdg-open', args: [DOWNLOAD_DIR] }
  spawn(command.file, command.args, { detached: true, stdio: 'ignore' }).unref()
  return true
})

/* ------------------------------- жизненный цикл ------------------------- */

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.torrential.desktop')
    readLocale()
    buildMenu()
    log('info', `Запуск. Режим: ${isDev ? 'разработка' : 'собранное приложение'} · язык: ${locale}`)
    log('info', `Движок: ${ENGINE_ENTRY}`)
    log('info', `Загрузки: ${DOWNLOAD_DIR}`)

    try {
      enginePort = await findFreePort()
      log('info', `Порт движка: ${enginePort}`)

      engine = startEngine(enginePort)
      forwardEngineOutput()
      engine.on('exit', (code) => {
        log('info', `Процесс движка завершился (код ${code})`)
        if (!quitting && mainWindow) {
          const logFile = path.join(app.getPath('userData'), 'desktop.log')
          dialog.showErrorBox(
            t('engineStopped'),
            t('engineStoppedText', code, logFile),
          )
          app.quit()
        }
      })

      await waitForEngine(enginePort)
      log('info', 'Движок готов, открываю окно')
      createWindow()
    } catch (error) {
      log('error', 'Не удалось запустить движок:', error)
      const logFile = path.join(app.getPath('userData'), 'desktop.log')
      dialog.showErrorBox(
        t('startFailed'),
        t('startFailedText', error?.message ?? String(error), logFile),
      )
      app.quit()
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  quitting = true
  stopEngine()
})