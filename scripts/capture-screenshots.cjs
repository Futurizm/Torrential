/**
 * Снимает реальные скриншоты приложения для лендинга.
 *
 * Скрипт поднимает локальный трекер и сидер, запускает движок Torrential,
 * добавляет торренты, переключает язык и снимает три состояния окна:
 * список, панель деталей с выбором файлов, настройки.
 *
 *   node scripts/capture-screenshots.cjs
 *   (запускать из корня репозитория, Electron берётся из node_modules)
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { app, BrowserWindow } = require('electron')

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'screenshots')
const WORK = path.join(os.tmpdir(), 'torrential-shots')
const PORT = 8877
const TRACKER_PORT = 9876
const TRACKER_URL = `http://127.0.0.1:${TRACKER_PORT}/announce`
const API = `http://127.0.0.1:${PORT}/api`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (...args) => console.log('•', ...args)

const DEMO = [
  {
    name: 'Sintel.2010.1080p.BluRay.x265-RUS',
    files: [
      { name: 'Sintel.2010.1080p.BluRay.x265-RUS.mkv', size: 62 * 1024 * 1024 },
      { name: 'Sintel.2010.1080p.BluRay.x265-RUS.srt', size: 86 * 1024 },
      { name: 'Sintel.2010.1080p.BluRay.x265-RUS.nfo', size: 4 * 1024 },
    ],
  },
  {
    name: 'Ubuntu 24.04 LTS Desktop amd64',
    files: [
      { name: 'ubuntu-24.04-desktop-amd64.iso', size: 26 * 1024 * 1024 },
      { name: 'ubuntu-24.04-desktop-amd64.iso.md5sum', size: 512 },
    ],
  },
  {
    name: 'Font Pack — Inter & JetBrains Mono',
    files: [
      { name: 'Inter-Regular.ttf', size: 1024 * 1024 },
      { name: 'JetBrainsMono-Regular.ttf', size: 900 * 1024 },
    ],
  },
]

let tracker
let seeder
let engine

async function main() {
  // webtorrent и bittorrent-tracker — ESM, из CommonJS их нужно грузить динамически.
  const { default: WebTorrent } = await import('webtorrent')
  const { Server: TrackerServer } = await import('bittorrent-tracker')

  // Чистим прошлый раз
  fs.rmSync(WORK, { recursive: true, force: true })
  fs.mkdirSync(path.join(WORK, 'seed'), { recursive: true })
  fs.mkdirSync(path.join(WORK, 'out'), { recursive: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // 1. Трекер
  tracker = new TrackerServer({ http: true, udp: false, ws: false, stats: false })
  await new Promise((resolve) => tracker.listen(TRACKER_PORT, '127.0.0.1', resolve))

  // 2. Сидер с демо-раздачами
  seeder = new WebTorrent({
    dht: false,
    lsd: false,
    utp: false,
    natUpnp: false,
    natPmp: false,
    tracker: { announce: [TRACKER_URL] },
  })
  seeder.on('error', (err) => console.log('  [seed!]', err.message))
  await new Promise((resolve) => (seeder.ready ? resolve() : seeder.once('ready', resolve)))

  const magnets = []
  for (const pack of DEMO) {
    for (const file of pack.files) {
      fs.writeFileSync(path.join(WORK, 'seed', file.name), Buffer.alloc(file.size, 42))
    }
    const seed = await new Promise((resolve) =>
      seeder.seed(
        pack.files.map((file) => path.join(WORK, 'seed', file.name)),
        { name: pack.name, path: path.join(WORK, 'seed') },
        resolve,
      ),
    )
    magnets.push(
      `magnet:?xt=urn:btih:${seed.infoHash}&dn=${encodeURIComponent(pack.name)}&tr=${encodeURIComponent(TRACKER_URL)}`,
    )
    log(`сид: ${pack.name}`)
  }

  // 3. Движок Torrential (собранный dist-server + dist)
  engine = spawn(process.execPath, [path.join(ROOT, 'dist-server', 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DOWNLOAD_DIR: path.join(WORK, 'out'),
      STATIC_DIR: path.join(ROOT, 'dist'),
      // DHT включаем: в настройках он должен выглядеть включённым,
      // как у настоящего приложения (в песочнице UDP может быть заблокирован).
      DHT: 'true',
      UTP: 'false',
      TRACKERS: TRACKER_URL,
      // Замедляем приём, чтобы в кадре была видна активная загрузка
      TORRENTIAL_DOWNLOAD_LIMIT: '1600000',
      TORRENTIAL_UPLOAD_LIMIT: '400000',
      LOG_LEVEL: 'warn',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) break
    } catch {
      /* ждём */
    }
    await sleep(250)
  }
  log('движок поднялся')

  // 4. Добавляем торренты
  for (const magnet of magnets) {
    const response = await fetch(`${API}/torrents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ magnet }),
    })
    if (!response.ok) throw new Error(`add failed: ${await response.text()}`)
  }
  log(`добавлено торрентов: ${magnets.length}`)

  // 5. Окно приложения
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    // Окно должно быть видимым: в скрытом Chromium не проигрываются
    // анимации framer-motion, и панель деталей осталась бы за краем кадра.
    show: true,
    backgroundColor: '#08080b',
    title: 'Torrential',
  })

  // Английский язык — он же в скриншотах приложения
  await win.loadURL(`http://127.0.0.1:${PORT}`)
  await win.webContents.executeJavaScript(
    `localStorage.setItem('torrential.locale', 'en'); location.reload()`,
  )
  await new Promise((resolve) => win.webContents.once('did-finish-load', resolve))

  // Ждём, пока качают (для правдоподобных цифр в кадре)
  log('жду прогресса…')
  await sleep(7000)

  const shoot = async (name) => {
    const image = await win.webContents.capturePage()
    const file = path.join(OUT_DIR, `${name}.png`)
    fs.writeFileSync(file, image.toPNG())
    const { width, height } = image.getSize()
    log(`снимок ${name}.png (${width}×${height})`)
  }

  // Список загрузок
  await shoot('list')

  // Панель деталей: кликаем по карточке торрента
  const opened = await win.webContents.executeJavaScript(`
    (() => {
      const title = [...document.querySelectorAll('h3')].find((h) => h.textContent.includes('Sintel'))
      const card = title?.closest('.card')
      if (!card) return 'нет карточки'
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return 'ок'
    })()
  `)
  if (opened !== 'ок') throw new Error(`клик по торренту не удался: ${opened}`)
  await sleep(2200)

  // Панель деталей — это второй <aside> (первый — сайдбар).
  const panelOpen = await win.webContents.executeJavaScript(
    `document.querySelectorAll('aside').length > 1`,
  )
  if (!panelOpen) throw new Error('панель деталей не открылась после клика')
  await shoot('files')

  // Настройки: сначала закрываем панель деталей, чтобы кадр был чистым
  await win.webContents.executeJavaScript(`
    (() => {
      const close = document.querySelector('button[aria-label="Close"]')
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return Boolean(close)
    })()
  `)
  await sleep(900)

  const openedSettings = await win.webContents.executeJavaScript(`
    (() => {
      const button = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === 'Settings')
      if (!button) return 'нет кнопки'
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return 'ок'
    })()
  `)
  if (openedSettings !== 'ок') throw new Error(`вкладка Settings: ${openedSettings}`)
  await sleep(1400)
  await shoot('settings')

  // Русский язык для проверки локализации
  const switched = await win.webContents.executeJavaScript(`
    (() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'RU')
      if (!button) return 'нет кнопки RU'
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return 'ок'
    })()
  `)
  if (switched !== 'ок') log(`переключение языка пропущено: ${switched}`)
  await sleep(1200)
  await shoot('settings-ru')

  log(`готово: ${OUT_DIR}`)
  shutdown(0)
}

/** Уборка временной папки: движок может ещё держать файлы — это не ошибка. */
function removeWork() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.rmSync(WORK, { recursive: true, force: true })
      return
    } catch {
      // Windows иногда держит файлы первые секунды после выхода процесса
    }
  }
}

function shutdown(code) {
  try {
    engine?.kill()
  } catch {
    /* ignore */
  }
  try {
    seeder?.destroy()
  } catch {
    /* ignore */
  }
  try {
    tracker?.close()
  } catch {
    /* ignore */
  }
  removeWork()
  process.exit(code)
}

process.on('exit', removeWork)

// Окно можно создавать только после готовности приложения.
app.disableHardwareAcceleration()
app.whenReady().then(() =>
  main().catch((err) => {
    console.error('Ошибка захвата:', err)
    shutdown(1)
  }),
)

process.on('exit', () => {
  fs.rmSync(WORK, { recursive: true, force: true })
})