/**
 * Smoke-тест интерфейса: монтирует App в jsdom с фейковым движком,
 * открывает панель деталей и вкладку настроек, проверяет ключевые элементы.
 *
 *   npm run test:ui
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5273/',
  pretendToBeVisual: true,
})

const g = globalThis as any
g.window = dom.window
g.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
})
g.HTMLElement = dom.window.HTMLElement
g.Element = dom.window.Element
g.Node = dom.window.Node
g.SVGElement = dom.window.SVGElement
g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 16)
g.cancelAnimationFrame = (id: number) => clearTimeout(id)
g.getComputedStyle = dom.window.getComputedStyle
g.location = dom.window.location
g.MutationObserver = dom.window.MutationObserver
g.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
g.IS_REACT_ACT_ENVIRONMENT = true

const magnets = [
  {
    id: 't1',
    infoHash: '60e919bbd2bc0f73f5bde767d80c5d37bba4a063',
    name: 'Sintel.2010.1080p.BluRay.x265-RUS',
    state: 'downloading',
    error: null,
    source: 'magnet',
    length: 67108864,
    downloaded: 24117248,
    uploaded: 1048576,
    progress: 0.36,
    ratio: 0.04,
    downloadSpeed: 2456789,
    uploadSpeed: 312458,
    eta: 17,
    numPeers: 14,
    peers: [
      { address: '10.0.0.5:51413', client: 'qB4550', downloadSpeed: 900000, uploadSpeed: 12000, isSeed: false },
      { address: '10.0.0.9:6881', client: 'TR3000', downloadSpeed: 0, uploadSpeed: 0, isSeed: true },
    ],
    filesTotal: 2,
    filesDone: 0,
    selectedSize: 67108864,
    addedAt: Date.now() - 60_000,
    completedAt: null,
    comment: null,
  },
  {
    id: 't2',
    infoHash: '54112b0270d476d69fe32d644f54f1646a5370a0',
    name: 'Font Pack — Inter & JetBrains Mono',
    state: 'done',
    error: null,
    source: 'magnet',
    length: 1992294,
    downloaded: 1992294,
    uploaded: 8912334,
    progress: 1,
    ratio: 4.47,
    downloadSpeed: 0,
    uploadSpeed: 184320,
    eta: null,
    numPeers: 3,
    peers: [],
    filesTotal: 2,
    filesDone: 2,
    selectedSize: 1992294,
    addedAt: Date.now() - 600_000,
    completedAt: Date.now() - 120_000,
    comment: null,
  },
  {
    id: 't3',
    infoHash: null,
    name: 'Получение метаданных…',
    state: 'metadata',
    error: null,
    source: 'magnet',
    length: 0,
    downloaded: 0,
    uploaded: 0,
    progress: 0,
    ratio: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    eta: null,
    numPeers: 0,
    peers: [],
    filesTotal: 0,
    filesDone: 0,
    selectedSize: 0,
    addedAt: Date.now(),
    completedAt: null,
    comment: null,
  },
  {
    id: 't4',
    infoHash: 'aaaa1111',
    name: 'Ubuntu 24.04 LTS Desktop amd64',
    state: 'paused',
    error: null,
    source: 'magnet',
    length: 31457280,
    downloaded: 10485760,
    uploaded: 0,
    progress: 0.33,
    ratio: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    eta: null,
    numPeers: 2,
    peers: [],
    filesTotal: 2,
    filesDone: 0,
    selectedSize: 31457280,
    addedAt: Date.now() - 30_000,
    completedAt: null,
    comment: null,
  },
]

g.fetch = async (url: string) => {
  const target = String(url)
  if (target.includes('/api/torrents')) {
    return { ok: true, json: async () => ({ torrents: magnets, global: {} }) }
  }
  if (target.includes('/api/settings')) {
    return {
      ok: true,
      json: async () => ({
        downloadLimit: 2500000,
        uploadLimit: 800000,
        downloadDir: 'C:/Users/Downloads/Torrential',
        persist: true,
        dht: true,
      }),
    }
  }
  return { ok: false, json: async () => ({ error: 'offline' }) }
}

const frames: unknown[] = []
const files = [
  {
    index: 0,
    name: 'Sintel.2010.1080p.BluRay.x265-RUS.mkv',
    path: 'Sintel.2010.1080p.BluRay.x265-RUS/Sintel.2010.1080p.BluRay.x265-RUS.mkv',
    size: 67104768,
    downloaded: 24117248,
    progress: 0.36,
    done: false,
    selected: true,
  },
  {
    index: 1,
    name: 'Sintel.2010.1080p.BluRay.x265-RUS.srt',
    path: 'Sintel.2010.1080p.BluRay.x265-RUS/Sintel.2010.1080p.BluRay.x265-RUS.srt',
    size: 86016,
    downloaded: 0,
    progress: 0,
    done: false,
    selected: true,
  },
]

g.WebSocket = class {
  static readonly OPEN = 1
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState = 1
  constructor() {
    setTimeout(() => {
      this.onopen?.()
      this.onmessage?.({
        data: JSON.stringify({
          type: 'sync',
          torrents: magnets,
          global: { downloadLimit: 2500000, uploadLimit: 800000 },
        }),
      })
    }, 10)
  }
  // Сервер на подписку отвечает снимком с файлами — как это делает ws-hub.
  send(raw: string) {
    const message = JSON.parse(raw) as { type: string; id?: string }
    if (message.type === 'subscribe') {
      const torrent = magnets.find((m) => m.id === message.id)
      setTimeout(() => {
        this.onmessage?.({ data: JSON.stringify({ type: 'torrent', torrent: { ...torrent, files } }) })
      }, 30)
    }
  }
  close() {}
}

const errors: string[] = []
const originalError = console.error
console.error = (...args: unknown[]) => {
  errors.push(args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' '))
  originalError(...args)
}

const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { I18nProvider } = await import('../src/i18n')
const { default: App } = await import('../src/App')

const root = createRoot(document.getElementById('root')!)

// По умолчанию проверяем русский — так интерфейс выглядит у пользователя.
dom.window.localStorage.setItem('torrential.locale', 'ru')
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(I18nProvider, null, React.createElement(App)),
  ),
)
await new Promise((r) => setTimeout(r, 1200))

const text = (): string => document.getElementById('root')!.textContent ?? ''
const click = async (selector: string | ((el: Element) => boolean), label: string): Promise<void> => {
  const nodes = [...document.querySelectorAll('button, [role="dialog"], input')]
  const target = nodes.find((node) =>
    typeof selector === 'string' ? (node.textContent ?? '').includes(selector) : selector(node),
  )
  if (!target) throw new Error(`не нашёл элемент для клика: ${label}`)
  target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  await new Promise((r) => setTimeout(r, 700))
}

const checks: [string, boolean][] = [
  ['логотип Torrential', text().includes('Torrential')],
  ['подпись клиента', text().includes('минималистичный торрент-клиент')],
  ['пункт «Все торренты»', text().includes('Все торренты')],
  ['пункт «Завершённые»', text().includes('Завершённые')],
  ['кнопка добавления', text().includes('Добавить торрент')],
  ['строка Sintel', text().includes('Sintel')],
  ['строка Font Pack', text().includes('Font Pack')],
  ['точка состояния', document.querySelectorAll('.rounded-full').length > 0],
  ['размер файла', text().includes('MB')],
  ['скорость приёма', text().includes('MB/s')],
  ['статус движка', text().includes('Движок онлайн')],
  ['счётчик файлов', /\d\/\d/.test(text())],
  ['сортировка', text().includes('Скорость')],
  ['подпись вкладки', text().includes('Активные и завершённые загрузки')],
]

// --- Панель деталей: клик по строке открывает список файлов ---
const row = [...document.querySelectorAll('h3')].find((h) => h.textContent?.includes('Sintel'))
row?.parentElement?.parentElement?.dispatchEvent(
  new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }),
)
await new Promise((r) => setTimeout(r, 800))

const panelText = text()
checks.push(
  ['панель деталей открылась', panelText.includes('Рейтинг')],
  ['заголовок панели', panelText.includes('Sintel.2010.1080p')],
  ['кнопка проверки', panelText.includes('Проверить')],
  ['раздел «Файлы»', panelText.includes('Файлы')],
  ['список пиров', panelText.includes('Подключённые пиры')],
  ['файл в списке', panelText.includes('Sintel.2010.1080p.BluRay.x265-RUS.mkv')],
  ['файл-субтитры', panelText.includes('Sintel.2010.1080p.BluRay.x265-RUS.srt')],
  ['счётчик выбранных файлов', panelText.includes('2 из 2')],
  ['размер выбранного', panelText.includes('выбрано')],
  ['подсказка про куски', panelText.includes('кусков')],
)

// --- Вкладка настроек и переключение языка ---
await click('Настройки', 'навигация настроек')
const settingsText = text()
checks.push(
  ['настройки: скорость', settingsText.includes('Ограничение приёма')],
  ['настройки: хранилище', settingsText.includes('Папка загрузок')],
  ['настройки: движок', settingsText.includes('DHT-бутстрап')],
  ['настройки: путь', settingsText.includes('C:/Users/Downloads/Torrential')],
  ['настройки: клиент', settingsText.includes('WebTorrent 3')],
  ['настройки: язык', settingsText.includes('Язык интерфейса')],
  ['настройки: ярлыки', settingsText.includes('поиск по названию')],
)

await click('EN', 'переключатель языка')
const englishText = text()
checks.push(
  ['EN: настройки', englishText.includes('Download limit')],
  ['EN: хранилище', englishText.includes('Download folder')],
  ['EN: движок', englishText.includes('DHT bootstrap')],
  ['EN: язык', englishText.includes('Interface language')],
  ['EN: ярлыки', englishText.includes('search by name')],
  ['EN: русского текста не осталось', !englishText.includes('Ограничение приёма')],
  ['EN: атрибут lang', dom.window.document.documentElement.lang === 'en'],
)

// --- Возврат в список на английском ---
await click('All torrents', 'навигация списка')
const listEnglish = text()
checks.push(
  ['EN: список', listEnglish.includes('All torrents')],
  ['EN: сортировка', listEnglish.includes('Speed')],
  ['EN: статус движка', listEnglish.includes('Engine online')],
  ['EN: подпись клиента', listEnglish.includes('minimalistic desktop torrent client')],
)

console.log('\n=== итоговый текст:', text().length, 'символов')
for (const [label, ok] of checks) console.log(`${ok ? '  ok ' : ' FAIL '} ${label}`)
console.log('=== console.error:', errors.length)
const real = errors.filter((e) => !e.includes('not wrapped in act'))
console.log('=== реальных ошибок:', real.length)
for (const e of real.slice(0, 5)) console.log('---\n', e.slice(0, 900))
process.exit(checks.every(([, ok]) => ok) && real.length === 0 ? 0 : 1)