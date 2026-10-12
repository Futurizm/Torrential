/**
 * Готовит самодостаточную папку движка для сборки .exe:
 *   dist-server (скомпилированный сервер) + dist (собранный UI)
 *   + только production-зависимости (без devDeps вроде Vite и TypeScript).
 *
 *   node scripts/stage-engine.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STAGE = path.join(ROOT, '.stage', 'engine')

const REQUIRED = [
  ['dist', path.join(ROOT, 'dist', 'index.html')],
  ['dist-server', path.join(ROOT, 'dist-server', 'server', 'index.js')],
]

/**
 * Находит npm так, чтобы не запускать .cmd через shell
 * (Node 18.20+ запрещает это и ругается предупреждением).
 */
function npmCommand(args) {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return [process.execPath, [candidate, ...args]]
  }
  return [process.platform === 'win32' ? 'npm.cmd' : 'npm', args]
}

for (const [name, target] of REQUIRED) {
  if (!fs.existsSync(target)) {
    console.error(`Нет ${name} — сначала выполните: npm run build`)
    process.exit(1)
  }
}

const { dependencies, name, version } = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
)

fs.rmSync(STAGE, { recursive: true, force: true })
fs.mkdirSync(STAGE, { recursive: true })

fs.cpSync(path.join(ROOT, 'dist'), path.join(STAGE, 'dist'), { recursive: true })
fs.cpSync(path.join(ROOT, 'dist-server'), path.join(STAGE, 'dist-server'), { recursive: true })

fs.writeFileSync(
  path.join(STAGE, 'package.json'),
  `${JSON.stringify(
    {
      name: 'torrential-engine',
      version,
      private: true,
      // Критично: без этого Node перечитывает index.js как CommonJS,
      // а потом reparses как ESM — запуск движка замедляется на секунды.
      type: 'module',
      dependencies,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

console.log('Ставлю только рантайм-зависимости движка…')
execFileSync(...npmCommand(['install', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error']), {
  cwd: STAGE,
  stdio: 'inherit',
})

// Считаем размер — полезно понимать, сколько весит приложение
const bytes = fs
  .readdirSync(STAGE, { recursive: true })
  .filter((entry) => typeof entry === 'string')
  .map((entry) => {
    const stats = fs.statSync(path.join(STAGE, entry))
    return stats.isFile() ? stats.size : 0
  })
  .reduce((sum, size) => sum + size, 0)

console.log(`Движок подготовлен: .stage/engine (${(bytes / 1024 / 1024).toFixed(1)} МБ)`)