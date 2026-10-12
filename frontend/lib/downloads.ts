/**
 * Ссылки на сборки Windows.
 *
 * Установщики весят ~106 МБ каждый, поэтому они не лежат в public/:
 * базу можно указать через NEXT_PUBLIC_DOWNLOAD_BASE (GitHub Releases,
 * свой CDN, папка на сайте). По умолчанию — страница релизов проекта.
 */
const BASE = (
  process.env.NEXT_PUBLIC_DOWNLOAD_BASE ??
  'https://github.com/your-org/torrential/releases/download/v1.0.0'
).replace(/\/$/, '')

export const VERSION = process.env.NEXT_PUBLIC_VERSION ?? '1.0.0'

export const downloads = {
  installer: `${BASE}/Torrential-${VERSION}-setup.exe`,
  portable: `${BASE}/Torrential-${VERSION}-portable.exe`,
  base: BASE,
} as const