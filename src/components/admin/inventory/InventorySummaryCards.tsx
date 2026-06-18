'use client'

import { useTranslations } from 'next-intl'
import { MoneyCollectOutlined, GoldOutlined, WalletOutlined } from '@ant-design/icons'
import { StatCard } from '@/components/admin/shared/StatCard'
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
      <StatCard
        icon={<MoneyCollectOutlined />} iconColor="#d97706"
        label={t('goldStock')}
        value={`${num(totals.goldStockChi)} Chỉ`}
        sub={`~${num(goldGram, 1)}g`}
      />
      <StatCard
        icon={<GoldOutlined />} iconColor="#14b8a6"
        label={t('silverStock')}
        value={`${num(totals.silverStockGram)} g`}
        sub={`~${num(silverKg, 2)} Kg`}
      />
      <StatCard
        icon={<WalletOutlined />} iconColor="#6366f1" valueColor="#4338ca" highlight
        label={t('assetValue')}
        value={`${num(totals.totalAssetLak, 0)} ₭`}
        sub={`~${totalAssetUsd == null ? 'N/A' : num(totalAssetUsd, 0)} USD`}
      />
    </div>
  )
}
