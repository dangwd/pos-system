'use client'

import { useTranslations } from 'next-intl'
import { RiseOutlined, FallOutlined, SwapOutlined } from '@ant-design/icons'
import { REV } from './revenue-theme'
import { formatCurrency, type CurrencyCode } from '@/lib/currency'
import type { RevenueSummary } from '@/types/report'

function Card({
  accent, icon, iconColor, valueColor, label, value,
}: {
  accent: string; icon: React.ReactNode; iconColor: string; valueColor: string
  label: string; value: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-card"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: iconColor }}>{icon}</span>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-[28px] font-medium leading-tight tabular-nums" style={{ color: valueColor }}>
        {value}
      </p>
      <span
        className="pointer-events-none absolute -right-1 bottom-0 text-[44px] leading-none"
        style={{ color: iconColor, opacity: 0.05 }}
      >
        {icon}
      </span>
    </div>
  )
}

export function RevenueStatCards({ summary, currency }: { summary: RevenueSummary; currency: CurrencyCode }) {
  const t = useTranslations('admin.reports.revenue')
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <Card
        accent={REV.sell.accent} icon={<RiseOutlined />} iconColor={REV.sell.icon} valueColor={REV.sell.text}
        label={t('cardSell')} value={formatCurrency(summary.sellTotal, currency)}
      />
      <Card
        accent={REV.buy.accent} icon={<FallOutlined />} iconColor={REV.buy.icon} valueColor={REV.buy.text}
        label={t('cardBuy')} value={formatCurrency(summary.buyTotal, currency)}
      />
      <Card
        accent={REV.exch.accent} icon={<SwapOutlined />} iconColor={REV.exch.icon} valueColor={REV.exch.text}
        label={t('cardExchange')} value={formatCurrency(summary.exchangeTotal, currency)}
      />
    </div>
  )
}
