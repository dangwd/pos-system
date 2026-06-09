'use server'

import { cookies } from 'next/headers'
import { locales, defaultLocale, LOCALE_COOKIE, type AppLocale } from '@/i18n/config'

export async function getUserLocale(): Promise<AppLocale> {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value
  return (locales as readonly string[]).includes(raw ?? '')
    ? (raw as AppLocale)
    : defaultLocale
}

export async function setUserLocale(locale: AppLocale): Promise<void> {
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
}
