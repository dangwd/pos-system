'use client'

import { useTranslations } from 'next-intl'
import { RiseOutlined, FallOutlined, SwapOutlined } from '@ant-design/icons'
import { REV } from './revenue-theme'
import { StatCard } from '@/components/admin/shared/StatCard'
import { formatCurrency, type CurrencyCode } from '@/lib/currency'
import type { RevenueSummary } from '@/types/report'

export function RevenueStatCards({ summary, currency }: { summary: RevenueSummary; currency: CurrencyCode }) {
  const t = useTranslations('admin.reports.revenue')
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <StatCard
        icon={<RiseOutlined />} iconColor={REV.sell.icon} valueColor={REV.sell.text}
        label={t('cardSell')} value={formatCurrency(summary.sellTotal, currency)}
      />
      <StatCard
        icon={<FallOutlined />} iconColor={REV.buy.icon} valueColor={REV.buy.text}
        label={t('cardBuy')} value={formatCurrency(summary.buyTotal, currency)}
      />
      <StatCard
        icon={<SwapOutlined />} iconColor={REV.exch.icon} valueColor={REV.exch.text}
        label={t('cardExchange')} value={formatCurrency(summary.exchangeTotal, currency)}
      />
    </div>
  )
}
