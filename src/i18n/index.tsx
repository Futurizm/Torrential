import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createTranslator,
  detectLocale,
  readStoredLocale,
  storeLocale,
  type Locale,
  type TranslateValues,
  type TranslationKey,
} from './core'
import { syncDesktopLocale } from '@/lib/desktop'

export type { Locale, TranslateValues, TranslationKey }
export { LOCALES } from './core'

export interface I18n {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Перевод с подстановкой {placeholders}. */
  t: (key: Parameters<ReturnType<typeof createTranslator>['t']>[0], values?: TranslateValues) => string
  /** Склонение: plural('torrent', 3) → 'торрента'. */
  plural: (noun: 'torrent' | 'file', count: number) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    storeLocale(next)
    // Нативные диалоги Electron тоже должны быть на языке интерфейса.
    void syncDesktopLocale(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18n>(() => {
    const translator = createTranslator(locale)
    return {
      locale,
      setLocale,
      t: translator.t as I18n['t'],
      plural: translator.plural,
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n должен вызываться внутри I18nProvider')
  return context
}

/** Короткий алиас — в разметке читается как t('nav.all'). */
export function useT(): I18n['t'] {
  return useI18n().t
}

export { detectLocale }