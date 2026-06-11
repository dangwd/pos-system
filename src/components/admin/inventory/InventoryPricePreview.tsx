'use client'

import { useTranslations } from 'next-intl'
import { Calculator } from 'lucide-react'
import type { ProductPriceEstimate } from '@/lib/inventory-valuation'

interface Props {
  estimate: ProductPriceEstimate
  thb: number | null
  usd: number | null
}

const lak = (n: number) => n.toLocaleString('lo-LA')
const fx = (n: number | null) => (n == null ? 'N/A' : n.toLocaleString('lo-LA', { maximumFractionDigits: 0 }))

export function InventoryPricePreview({ estimate, thb, usd }: Props) {
  const t = useTranslations('admin.inventory.declare.preview')

  return (
    <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" />
        {t('title')}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('metalValue')} value={`${lak(estimate.metalValue)} ₭`} />
        <Stat label={t('laborDetail')} value={`${lak(estimate.laborFee)} ₭`} />
        <Stat label={t('stoneSurcharge')} value={`${lak(estimate.stoneFee)} ₭`} />
        <Stat label={t('estSell')} value={`${lak(estimate.total)} ₭`} emphasis />
      </div>

      <div className="flex justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>{t('thbEquiv')}: {fx(thb)} THB</span>
        <span>{t('usdEquiv')}: {fx(usd)} USD</span>
      </div>
    </div>
  )
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${emphasis ? 'text-primary' : ''}`}>{value}</div>
    </div>
  )
}
