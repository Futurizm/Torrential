/**
 * Диагностика вёрстки в реальном окне Electron: грузим собранный UI
 * и печатаем метрики, по которым видно переполнение по горизонтали.
 */
const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const enginePort = process.argv[2]
  const width = Number(process.argv[3] ?? 1320)
  const height = Number(process.argv[4] ?? 860)
  if (!enginePort) {
    console.error('Передайте порт движка: electron scripts/inspect-layout.cjs <port> [width] [height]')
    app.quit()
    return
  }

  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#08080b',
    webPreferences: { contextIsolation: true },
  })

  await win.loadURL(`http://127.0.0.1:${enginePort}`)
  await new Promise((r) => setTimeout(r, 1200))

  const report = await win.webContents.executeJavaScript(`
    (() => {
      const doc = document.documentElement
      const pick = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { sel, x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) }
      }
      const wide = [...document.querySelectorAll('*')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.right > doc.clientWidth + 1)
        .slice(0, 8)
        .map(({ el, r }) => ({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 60),
          right: Math.round(r.right),
        }))
      return {
        viewport: { w: doc.clientWidth, h: doc.clientHeight },
        scroll: { w: doc.scrollWidth, h: doc.scrollHeight },
        desktopFlag: doc.dataset.desktop ?? null,
        nodes: ['header', 'aside', 'main', 'body > div'].map(pick),
        overflowing: wide,
      }
    })()
  `)

  console.log(JSON.stringify(report, null, 2))
  app.quit()
})