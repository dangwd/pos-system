export const locales = ['lo', 'vi', 'en'] as const
export type AppLocale = (typeof locales)[number]
export const defaultLocale: AppLocale = 'lo'

// Tên ngôn ngữ hiển thị trên nút chuyển đổi
export const LOCALE_LABELS: Record<AppLocale, string> = {
  lo: 'ລາວ',
  vi: 'Việt',
  en: 'EN',
}

export const LOCALE_COOKIE = 'app-locale'
