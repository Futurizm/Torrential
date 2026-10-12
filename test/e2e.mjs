/**
 * Сквозной тест движка: поднимает локальный трекер и сидер, запускает сервер
 * Torrential на отдельном порту и проверяет полный сценарий:
 *
 *   magnet → скачивание до 100% → пауза/возобновление → выбор файлов →
 *   проверка → .torrent-файл → дубликат/битый файл → WebSocket →
 *   восстановление после перезапуска → удаление с данными
 *
 *   npm run test:e2e
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import WebTorrent from 'webtorrent'
import createTorrent from 'create-torrent'
import { Server as TrackerServer } from 'bittorrent-tracker'

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = 'http://127.0.0.1:8791'
const TRACKER_PORT = 9877
const TRACKER_URL = `http://127.0.0.1:${TRACKER_PORT}/announce`
const ROOT = path.join(os.tmpdir(), 'torrential-e2e')
const DOWNLOADS = path.join(ROOT, 'downloads')
const SEED_DIR = path.join(ROOT, 'seed')
const TSX_CLI = path.join(PROJECT, 'node_modules', 'tsx', 'dist', 'cli.mjs')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...args) => console.log('•', ...args)
const get = async (p) => (await fetch(`${API}/api${p}`)).json()
const patch = (p, action) =>
  fetch(`${API}/api${p}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  })

let children = []
function cleanup() {
  for (const child of children) {
    try {
      child.kill()
    } catch {
      /* уже мёртв */
    }
  }
  children = []
  fs.rmSync(ROOT, { recursive: true, force: true })
}
process.on('exit', cleanup)

function startServer(tag) {
  const child = spawn(process.execPath, [TSX_CLI, path.join('server', 'index.ts')], {
      env: {
        ...process.env,
        PORT: '8791',
        DOWNLOAD_DIR: DOWNLOADS,
        DHT: 'false',
        UTP: 'false',
        PERSIST: 'true',
        TRACKERS: TRACKER_URL,
        LOG_LEVEL: 'info',
        // Ограничиваем приём, чтобы успеть поймать момент «в процессе»
        // и проверить паузу/резюм на живых данных.
        TORRENTIAL_DOWNLOAD_LIMIT: '2000000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: PROJECT,
    },
  )
  children.push(child)
  child.stdout.on('data', (d) => process.stdout.write(`  [${tag}] ${d}`))
  child.stderr.on('data', (d) => process.stderr.write(`  [${tag}!] ${d}`))
  return child
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${API}/api/health`)).ok) return
    } catch {
      /* ещё не поднялся */
    }
    await sleep(500)
  }
  throw new Error('Сервер не поднялся')
}

function makeFiles(name, list) {
  for (const file of list) {
    fs.writeFileSync(path.join(SEED_DIR, file.name), Buffer.alloc(file.size, 7))
  }
  return new Promise((resolve, reject) => {
    createTorrent(
      list.map((f) => path.join(SEED_DIR, f.name)),
      { name, path: SEED_DIR, announce: [TRACKER_URL] },
      (err, buf) => (err ? reject(err) : resolve(Buffer.from(buf))),
    )
  })
}

async function main() {
  cleanup()
  fs.mkdirSync(DOWNLOADS, { recursive: true })
  fs.mkdirSync(SEED_DIR, { recursive: true })

  // 1. Локальный трекер
  const tracker = new TrackerServer({ http: true, udp: false, ws: false, stats: false })
  await new Promise((r) => tracker.listen(TRACKER_PORT, '127.0.0.1', r))
  log('трекер поднят:', TRACKER_URL)

  // 2. Сидер
  const seeder = new WebTorrent({
    dht: false,
    lsd: false,
    utp: false,
    natUpnp: false,
    natPmp: false,
    tracker: { announce: [TRACKER_URL] },
  })
  seeder.on('error', (e) => console.log('  [seed!]', e.message))
  await new Promise((r) => (seeder.ready ? r() : seeder.once('ready', r)))

  const pack = [
    { name: 'alpha-video.mkv', size: 24 * 1024 * 1024 },
    { name: 'beta-subtitles.srt', size: 40 * 1024 },
    { name: 'gamma-cover.jpg', size: 300 * 1024 },
  ]
  const packBuffer = await makeFiles('Torrential Test Pack', pack)
  const seedA = await new Promise((resolve) =>
    seeder.seed(
      pack.map((f) => path.join(SEED_DIR, f.name)),
      { name: 'Torrential Test Pack', path: SEED_DIR },
      resolve,
    ),
  )

  const single = [{ name: 'bonus-track.flac', size: 256 * 1024 }]
  const singleBuffer = await makeFiles('Bonus Release', single)
  const seedB = await new Promise((resolve) =>
    seeder.seed(path.join(SEED_DIR, single[0].name), { name: 'Bonus Release', path: SEED_DIR }, resolve),
  )

  const magnetA = `magnet:?xt=urn:btih:${seedA.infoHash}&dn=${encodeURIComponent(
    seedA.name,
  )}&tr=${encodeURIComponent(TRACKER_URL)}`
  log(`сиды готовы: ${seedA.length} + ${seedB.length} байт`)

  // 3. Сервер Torrential
  let server = startServer('srv')
  await waitForServer()
  log('сервер Torrential поднялся')

  // 4. Magnet
  const addMagnet = await fetch(`${API}/api/torrents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ magnet: magnetA }),
  })
  if (!addMagnet.ok) throw new Error(`add magnet: ${addMagnet.status} ${await addMagnet.text()}`)
  const a = (await addMagnet.json()).torrent
  log(`добавлен magnet → ${a.name} (${a.state})`)

  // 5. Ждём старта загрузки
  let snapshot = a
  for (let i = 0; i < 120; i++) {
    await sleep(500)
    snapshot = (await get(`/torrents/${a.id}`)).torrent
    if (snapshot.downloaded > 0) break
  }
  log(`загрузка пошла: ${snapshot.downloaded} байт, state=${snapshot.state}`)
  if (snapshot.downloaded === 0) throw new Error('загрузка не началась')

  // 5a. Пауза на живых данных — тот же PATCH, что шлёт кнопка в UI
  const pausedResponse = await fetch(`${API}/api/torrents/${a.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'pause' }),
  })
  if (!pausedResponse.ok) {
    throw new Error(`PATCH pause вернул ${pausedResponse.status}: ${await pausedResponse.text()}`)
  }
  await sleep(400)
  const paused = (await get(`/torrents/${a.id}`)).torrent
  log(`PATCH pause → state=${paused.state}`)
  if (paused.state !== 'paused') throw new Error(`ожидалась пауза, получили ${paused.state}`)

  // Уже запрошенные куски могут долететь после паузы — важно, чтобы поток
  // останавливался, а не то, что он обрывается мгновенно.
  const samples = []
  for (const delay of [500, 1500, 3000, 5000]) {
    await sleep(delay === 500 ? 500 : delay - samples.at(-1).at)
    const current = (await get(`/torrents/${a.id}`)).torrent
    samples.push({ at: delay, downloaded: current.downloaded })
  }
  log(`после паузы: ${samples.map((s) => `${s.at}мс=${s.downloaded}`).join(' → ')}`)
  const tail = samples.at(-1).downloaded - paused.downloaded
  const later = samples.at(-1).downloaded - samples.at(-2).downloaded
  if (later > 0) {
    throw new Error(
      `поток не останавливается: между ${samples.at(-2).at} и ${samples.at(-1).at} мс пришло ещё ${later} байт`,
    )
  }
  log(`хвост уже запрошенных кусков: ${(tail / 1024).toFixed(0)} КБ, поток остановлен`)

  // 5b. Резюм — загрузка обязана продолжиться
  await fetch(`${API}/api/torrents/${a.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'resume' }),
  })
  await sleep(400)
  const resumed = (await get(`/torrents/${a.id}`)).torrent
  log(`PATCH resume → state=${resumed.state}`)
  if (resumed.state === 'paused') throw new Error('резюм не сработал')

  const beforeResume = resumed.downloaded
  let afterResume = resumed
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    afterResume = (await get(`/torrents/${a.id}`)).torrent
    if (afterResume.downloaded > beforeResume) break
  }
  if (afterResume.downloaded <= beforeResume) {
    throw new Error(`после резюма загрузка не продолжилась (${beforeResume} → ${afterResume.downloaded})`)
  }
  log(`после резюма пошло: ${beforeResume} → ${afterResume.downloaded} байт`)

  // 5c. Докачиваем до 100%
  for (let i = 0; i < 300; i++) {
    await sleep(500)
    afterResume = (await get(`/torrents/${a.id}`)).torrent
    if (afterResume.progress >= 1) break
  }
  snapshot = afterResume
  if (snapshot.progress < 1) throw new Error(`не скачалось: ${JSON.stringify(snapshot)}`)
  log(`скачано на 100%: ${snapshot.downloaded}/${snapshot.length} байт, пиров ${snapshot.numPeers}`)

  const target = path.join(DOWNLOADS, 'Torrential Test Pack')
  for (const file of pack) {
    if (!fs.existsSync(path.join(target, file.name))) throw new Error(`нет файла ${file.name}`)
  }
  log('файлы на диске:', fs.readdirSync(target).join(', '))

  // 6. Выбор файлов
  const selected = await fetch(`${API}/api/torrents/${a.id}/files`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ indices: [1, 2] }),
  })
  const selectedBody = await selected.json()
  const expectedSize = 40 * 1024 + 300 * 1024
  if (selectedBody.torrent.selectedSize !== expectedSize) {
    throw new Error(`selectedSize=${selectedBody.torrent.selectedSize}, ждали ${expectedSize}`)
  }
  log(`выбор файлов: ${selectedBody.torrent.files.filter((f) => f.selected).length} из 3`)

  // 8. Проверка (recheck)
  await patch(`/torrents/${a.id}`, 'check')
  await sleep(1500)
  const rechecked = (await get(`/torrents/${a.id}`)).torrent
  if (rechecked.filesTotal !== 3) throw new Error('после проверки потерялись файлы')
  log(`проверка: state=${rechecked.state}, файлов ${rechecked.filesTotal}`)

  // 9. Добавление через .torrent-файл
  const addFile = await fetch(`${API}/api/torrents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      file: { name: 'Bonus Release.torrent', data: singleBuffer.toString('base64') },
    }),
  })
  if (!addFile.ok) throw new Error(`add file: ${addFile.status} ${await addFile.text()}`)
  const b = (await addFile.json()).torrent
  log(`добавлен .torrent-файл → ${b.name} (${b.length} байт)`)

  // 10. Дубликат
  const dup = await fetch(`${API}/api/torrents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      file: { name: 'duplicate.torrent', data: singleBuffer.toString('base64') },
    }),
  })
  if (dup.status !== 409) throw new Error(`дубликат: ожидался 409, получен ${dup.status}`)
  log('дубликат отклонён (409)')

  // 11. Битый .torrent
  const broken = await fetch(`${API}/api/torrents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      file: { name: 'broken.torrent', data: Buffer.from('это не bencode').toString('base64') },
    }),
  })
  if (broken.status !== 400) throw new Error(`битый файл: ожидался 400, получен ${broken.status}`)
  log(`битый .torrent отклонён (400): ${(await broken.json()).error}`)

  const afterErrors = (await get('/torrents')).torrents
  if (afterErrors.length !== 2) throw new Error(`в списке ${afterErrors.length} торрентов, ждали 2`)

  // 12. WebSocket
  const { WebSocket } = await import('ws')
  const frames = []
  const ws = new WebSocket('ws://127.0.0.1:8791/ws')
  // Слушатель ставим ДО ожидания open, иначе первый sync может пролететь мимо.
  ws.on('message', (data) => frames.push(JSON.parse(data.toString())))
  ws.on('error', (e) => console.log('  [ws!]', e.message))
  await new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })
  ws.send(JSON.stringify({ type: 'subscribe', id: a.id }))
  await sleep(2500)
  ws.close()
  const types = new Set(frames.map((f) => f.type))
  const withFiles = frames.filter((f) => f.torrent?.files?.length > 0).length
  log(
    `WebSocket: ${frames.length} кадров за 2.5 c, типов [${[...types].join(', ')}], с файлами ${withFiles}`,
  )
  if (!types.has('sync') || !types.has('torrent')) {
    console.log(JSON.stringify(frames.slice(0, 3), null, 2))
    throw new Error('нет живых обновлений по WS')
  }
  if (withFiles === 0) throw new Error('подписка на файлы не сработала')

  // 13. Перезапуск движка — восстановление сессии
  const saved = fs.readdirSync(path.join(DOWNLOADS, '.torrential')).filter((f) => f.endsWith('.magnet'))
  if (saved.length !== 2) throw new Error(`сохранено ${saved.length} .torrent, ждали 2`)
  log('сессия сохранена в stateDir:', saved.length)

  server.kill()
  await sleep(1200)
  server = startServer('srv2')
  await waitForServer()
  await sleep(2000)

  const restoredList = (await get('/torrents')).torrents
  if (restoredList.length !== 2) throw new Error(`после перезапуска ${restoredList.length} торрентов, ждали 2`)

  // Ищем именно наш пак, а не «первый в списке» — порядок после рестарта не гарантирован.
  const restoredPack = restoredList.find((item) => item.name === 'Torrential Test Pack')
  if (!restoredPack) throw new Error(`пакет не восстановился: ${restoredList.map((i) => i.name).join(', ')}`)
  const restored = (await get(`/torrents/${restoredPack.id}?files=1`)).torrent
  log(`восстановлено: ${restored.name}, файлов ${restored.files.length}, прогресс ${restored.progress.toFixed(2)}`)
  if (restored.files.length !== 3) throw new Error('файлы не восстановились')

  // 14. Удаление с данными
  for (const item of restoredList) {
    await fetch(`${API}/api/torrents/${item.id}?deleteFiles=1`, { method: 'DELETE' })
  }
  await sleep(800)
  const left = (await get('/torrents')).torrents
  if (left.length !== 0) throw new Error('торренты не удалились')
  const leftovers = fs.readdirSync(path.join(DOWNLOADS, '.torrential')).filter((f) => f.endsWith('.magnet'))
  if (leftovers.length !== 0) throw new Error('.torrent остались в stateDir')
  log('удаление с данными работает, stateDir чист')

  seeder.destroy()
  tracker.close()
  cleanup()
  console.log('\n✅ E2E-проверка пройдена полностью')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ E2E провалилась:', err)
  process.exit(1)
})