/**
 * Генератор иконки приложения без графических зависимостей:
 * рисуем rounded-square с градиентом и «узлами» Torrential,
 * кодируем PNG (zlib + CRC32) и заворачиваем в контейнер ICO.
 *
 *   node scripts/make-icon.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'build')
const ICO_SIZES = [16, 32, 48, 64, 128, 256]

/* ------------------------------ PNG / ICO ------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed), 0)
  return Buffer.concat([length, typed, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // бит на канал
  header[9] = 6 // RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // фильтр scanline
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  const entries = []
  let offset = 6 + images.length * 16

  for (const { size, data } of images) {
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size
    entry[1] = size >= 256 ? 0 : size
    entry[2] = 0 // палитра не используется
    entry[3] = 0
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bpp
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += data.length
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)])
}

/* ------------------------------ Геометрия ------------------------------- */

const clamp01 = (value) => Math.min(1, Math.max(0, value))
const mix = (a, b, t) => a + (b - a) * t

/** Знаковое расстояние до скруглённого прямоугольника: <0 внутри, >0 снаружи. */
function roundedRectDistance(x, y, halfW, halfH, radius) {
  const qx = Math.abs(x) - (halfW - radius)
  const qy = Math.abs(y) - (halfH - radius)
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
  )
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy) / lengthSquared)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/* --------------------------------- Сборка -------------------------------- */

export function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const NODES = [
    [30, 70],
    [50, 30],
    [70, 70],
  ]
  const NODE_RADIUS = 10
  const EDGE_RADIUS = 2.4
  const AA = 1 // ширина сглаживания в тех же единицах

  const coverage = (distance, radius) => clamp01(0.5 - (distance - radius) / AA)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size) * 100
      const y = ((py + 0.5) / size) * 100

      // Скруглённый квадрат: расстояние до границы со знаком (центр в 50,50)
      const shape = roundedRectDistance(x - 50, y - 50, 46, 46, 22)
      const alpha = clamp01(0.5 - shape / AA)

      if (alpha <= 0) continue

      // Градиент по диагонали: indigo-500 → emerald-400
      const t = clamp01((x + y) / 200)
      let r = mix(79, 16, t)
      let g = mix(70, 185, t)
      let b = mix(229, 129, t)

      // Верхний блик — «стеклянная» глубина
      const gloss = clamp01(1 - (y + 40) / 70) * 0.18
      r = mix(r, 255, gloss)
      g = mix(g, 255, gloss)
      b = mix(b, 255, gloss)

      // Граф: рёбра + узлы
      let glyph = 0
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const [ax, ay] = NODES[i]
          const [bx, by] = NODES[j]
          glyph = Math.max(glyph, coverage(segmentDistance(x, y, ax, ay, bx, by), EDGE_RADIUS))
        }
      }
      for (const [nx, ny] of NODES) {
        glyph = Math.max(glyph, coverage(Math.hypot(x - nx, y - ny), NODE_RADIUS))
      }

      r = mix(r, 255, glyph)
      g = mix(g, 255, glyph)
      b = mix(b, 255, glyph)

      const offset = (py * size + px) * 4
      rgba[offset] = Math.round(r)
      rgba[offset + 1] = Math.round(g)
      rgba[offset + 2] = Math.round(b)
      rgba[offset + 3] = Math.round(alpha * 255)
    }
  }

  return rgba
}

export function buildIcons() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const icons = ICO_SIZES.map((size) => ({ size, data: encodePng(size, renderIcon(size)) }))
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), encodeIco(icons))
  fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), encodePng(512, renderIcon(512)))

  console.log(`Иконки собраны: build/icon.ico (${ICO_SIZES.join(', ')} px), build/icon.png (512 px)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildIcons()
}