/**
 * ASCII-превью иконки: декодируем наш же PNG (8-bit RGBA, без фильтра-interlace)
 * и печатаем символами — быстрый способ увидеть результат без Electron.
 *
 *   node scripts/preview-icon.mjs build/icon.png
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

function decodePng(buffer) {
  let offset = 8 // пропускаем сигнатуру
  let width = 0
  let height = 0
  const idat = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6) throw new Error('Ожидался 8-bit RGBA PNG')
    }
    if (type === 'IDAT') idat.push(data)
    offset += 12 + length
  }

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const out = Buffer.alloc(stride * height)
  let prev = Buffer.alloc(stride)

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? line[x - 4] : 0
      const up = prev[x]
      const upLeft = x >= 4 ? prev[x - 4] : 0
      let value = line[x]
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      }
      out[y * stride + x] = value & 0xff
    }
    prev = line
  }

  return { width, height, data: out }
}

const target = path.resolve(process.argv[2] ?? 'build/icon.png')
const { width, height, data } = decodePng(fs.readFileSync(target))
const step = Math.max(1, Math.round(height / 48))
const shades = ' .:-=+*#%@'

console.log(`${target}: ${width}×${height}`)
for (let y = 0; y < height; y += step) {
  let line = ''
  for (let x = 0; x < width; x += Math.max(1, step / 2)) {
    const i = (y * width + x) * 4
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a < 40) {
      line += ' '
      continue
    }
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    line += shades[Math.min(shades.length - 1, Math.round(lum * (shades.length - 1)))]
  }
  console.log(line)
}