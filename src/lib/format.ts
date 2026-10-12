const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : digits)} ${UNITS[exponent]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '—'
  return `${formatBytes(bytesPerSecond, bytesPerSecond > 1024 * 1024 * 100 ? 0 : 1)}/s`
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '∞'
  if (ratio >= 100) return ratio.toFixed(0)
  if (ratio >= 10) return ratio.toFixed(1)
  return ratio.toFixed(2)
}

/** Секунды → «12 мин», «1 ч 04 мин», «3 дн 2 ч». */
export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '∞'
  if (seconds === 0) return 'готово'
  if (seconds < 60) return `${Math.ceil(seconds)} с`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч ${String(minutes % 60).padStart(2, '0')} мин`

  const days = Math.floor(hours / 24)
  return `${days} д ${hours % 24} ч`
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0%'
  const percent = Math.min(100, Math.max(0, value * 100))
  const rounded = percent >= 99.95 && percent < 100 ? 99.9 : percent
  return `${rounded.toFixed(digits)}%`
}