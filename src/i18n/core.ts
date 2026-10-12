/**
 * Ядро i18n без React: словари, подстановка плейсхолдеров и склонения.
 * Используется и контекстом, и стором (стор показывает тосты и ошибки API).
 */
import { en, ru, type TranslationKey } from './translations'

export type Locale = 'ru' | 'en'
export type TranslateValues = Record<string, string | number>

export const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { ru, en }
export const STORAGE_KEY = 'torrential.locale'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
]

/** Русский по умолчанию, но если система английская — сразу английский. */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ru'
  return (navigator.language ?? '').toLowerCase().startsWith('en') ? 'en' : 'ru'
}

export function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'ru' || stored === 'en') return stored
  } catch {
    /* приватный режим — определим по системе */
  }
  return detectLocale()
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* не смогли сохранить — переживём до следующего запуска */
  }
}

export function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  )
}

/** Правила русского склонения: 1 торрент, 2 торрента, 5 торрентов. */
export function russianNoun(count: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(Math.round(count)) % 100
  const last = absolute % 10
  if (absolute > 10 && absolute < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

export function createTranslator(locale: Locale) {
  const dictionary = DICTIONARIES[locale]

  const t = (key: TranslationKey, values?: TranslateValues): string =>
    interpolate(dictionary[key] ?? ru[key] ?? key, values)

  const plural = (noun: 'torrent' | 'file', count: number): string => {
    if (locale === 'en') return t(`plural.${noun}.one`)
    return russianNoun(
      count,
      ru[`plural.${noun}.one`],
      ru[`plural.${noun}.few`],
      ru[`plural.${noun}.many`],
    )
  }

  return { t, plural }
}

export type { TranslationKey }