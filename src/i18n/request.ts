import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from '@/lib/locale'

// Fallback chain: lo → vi → en (theo R-I18N-1)
export default getRequestConfig(async () => {
  const locale = await getUserLocale()
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
