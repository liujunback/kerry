import enMessages from '../../messages/en.json'
import zhMessages from '../../messages/zh.json'

const localeConfig = {
  zh: {
    label: '中文',
    shortLabel: '中文',
    messages: zhMessages,
  },
  en: {
    label: 'English',
    shortLabel: 'EN',
    messages: enMessages,
  },
} as const

export type Locale = keyof typeof localeConfig

export const locales = Object.keys(localeConfig) as Locale[]
export const defaultLocale: Locale = 'zh'

export const localeOptions = locales.map((code) => ({
  code,
  label: localeConfig[code].label,
  shortLabel: localeConfig[code].shortLabel,
}))

export function isLocale(value: string): value is Locale {
  return Object.hasOwn(localeConfig, value)
}

export function getLocaleMessages(locale: Locale) {
  return localeConfig[locale].messages
}
