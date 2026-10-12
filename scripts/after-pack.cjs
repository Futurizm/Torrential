/**
 * Хук afterPack electron-builder: кладёт движок в resources/engine.
 *
 * Почему не extraResources: electron-builder по умолчанию вырезает
 * node_modules, а движку нужны реальные зависимости (express/ws/webtorrent).
 * Хук выполняется после распаковки приложения и ДО сборки установщика,
 * поэтому и NSIS, и portable получают полный комплект.
 */
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function afterPack(context) {
  const stage = path.join(__dirname, '..', '.stage', 'engine')
  const target = path.join(context.appOutDir, 'resources', 'engine')

  if (!fs.existsSync(path.join(stage, 'node_modules', 'webtorrent'))) {
    throw new Error(
      `Движок не подготовлен: ${stage}\nСначала выполните: node scripts/stage-engine.mjs`,
    )
  }

  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })

  for (const entry of ['dist', 'dist-server', 'node_modules', 'package.json']) {
    const from = path.join(stage, entry)
    if (!fs.existsSync(from)) continue
    fs.cpSync(from, path.join(target, entry), {
      recursive: true,
      dereference: true,
      // Кеши и исходные карты в установщик не нужны.
      filter: (source) => !source.includes(`${path.sep}.cache${path.sep}`) && !source.endsWith('.map'),
    })
  }

  // Контроль: без webtorrent движок стартует, но ничего не скачает.
  const webtorrent = path.join(target, 'node_modules', 'webtorrent', 'package.json')
  if (!fs.existsSync(webtorrent)) {
    throw new Error('node_modules/webtorrent не попал в сборку')
  }

  const size = (dir) =>
    fs
      .readdirSync(dir, { recursive: true })
      .filter((entry) => typeof entry === 'string')
      .reduce((sum, entry) => {
        const stats = fs.statSync(path.join(dir, entry))
        return stats.isFile() ? sum + stats.size : sum
      }, 0)

  console.log(
    `  • afterPack: движок в resources/engine (${(size(target) / 1024 / 1024).toFixed(1)} МБ)`,
  )
}