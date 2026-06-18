// Token màu cố định cho báo cáo doanh thu (theo spec UI/UX — recharts/inline cần hex).

export const REV = {
  sell: { accent: '#97C459', text: '#3B6D11', bar: '#97C459', icon: '#3B6D11', bg: 'rgba(151,196,89,.1)' },
  buy:  { accent: '#e84135', text: '#e84135', bar: '#e84135', icon: '#e84135', bg: 'rgba(232,65,53,.1)' },
  exch: { accent: '#EF9F27', text: '#BA7517', bar: '#EF9F27', icon: '#BA7517', bg: 'rgba(239,159,39,.08)' },
} as const

export const PILL = { bg: '#FAEEDA', text: '#633806' }
export const TODAY_ROW_BG = 'rgba(250,238,218,.25)'
export const MUTED_ZERO = '#b4b2a9'
export const MINIBAR_TRACK = '#e0dfd8'
export const FILTER_DIVIDER = '#e0dfd8'
export const CURRENCY_FOCUS = { border: '#B8860B', shadow: 'rgba(184,134,11,.15)' }

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
