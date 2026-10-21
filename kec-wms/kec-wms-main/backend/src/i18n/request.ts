import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, getLocaleMessages, isLocale, type Locale } from '@/i18n/config'

export { defaultLocale, locales, type Locale } from '@/i18n/config'

export function resolveLocale(value?: string | null): Locale {
  return value && isLocale(value) ? value : defaultLocale
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('locale')?.value)

  return {
    locale,
    messages: getLocaleMessages(locale),
  }
})
