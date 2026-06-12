'use client'

import { useTranslations } from 'next-intl'
import { Coins, Gem, Wallet } from 'lucide-react'
import { GRAM_PER_CHI, type InventoryTotals } from '@/lib/inventory-valuation'

interface Props {
  totals: InventoryTotals
  totalAssetUsd: number | null
}

const num = (n: number, max = 2) => n.toLocaleString('lo-LA', { maximumFractionDigits: max })

export function InventorySummaryCards({ totals, totalAssetUsd }: Props) {
  const t = useTranslations('admin.inventory.summary')

  const goldGram = totals.goldStockChi * GRAM_PER_CHI
  const silverKg = totals.silverStockGram / 1000

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        icon={<Coins className="h-4 w-4" />}
        label={t('goldStock')}
        value={`${num(totals.goldStockChi)} Chỉ`}
        sub={`~${num(goldGram, 1)}g`}
      />
      <Card
        icon={<Gem className="h-4 w-4" />}
        label={t('silverStock')}
        value={`${num(totals.silverStockGram)} g`}
        sub={`~${num(silverKg, 2)} Kg`}
      />
      <Card
        icon={<Wallet className="h-4 w-4" />}
        label={t('assetValue')}
        value={`${num(totals.totalAssetLak, 0)} ₭`}
        sub={`~${totalAssetUsd == null ? 'N/A' : num(totalAssetUsd, 0)} USD`}
        emphasis
      />
    </div>
  )
}

function Card({
  icon, label, value, sub, emphasis,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  emphasis?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3.5 ${emphasis ? 'border-primary/30 bg-primary/5' : 'bg-muted/30'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold tabular-nums ${emphasis ? 'text-primary' : ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground tabular-nums">{sub}</div>
    </div>
  )
}
