'use client'

import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useConfigPriceHistory } from '@/hooks/useConfig'
import type { PriceConfig, PriceItem } from '@/types/config'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function keyOf(i: { goldPurityId: string; weightUnitId: string }) {
  return `${i.goldPurityId}:${i.weightUnitId}`
}

interface Props {
  onClose: () => void
}

/** Tách màn 2 cột: bảng giá trước đó (trái) vs bảng giá vừa tạo (phải, có đánh dấu thay đổi). */
export function PriceComparison({ onClose }: Props) {
  const t = useTranslations('admin.config.prices')
  const { data: history = [], isLoading } = useConfigPriceHistory(2)

  const current = history[0]
  const previous = history[1]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={onClose}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          {t('comparisonClose')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !previous || !current ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          {t('comparisonNoPrevious')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PricePanel title={t('comparisonPrevious')} config={previous} />
          <PricePanel
            title={t('comparisonCurrent')}
            config={current}
            prevMap={new Map(previous.items.map((i) => [keyOf(i), i]))}
          />
        </div>
      )}
    </div>
  )
}

function PricePanel({
  title,
  config,
  prevMap,
}: {
  title: string
  config: PriceConfig
  prevMap?: Map<string, PriceItem>
}) {
  const t = useTranslations('admin.config.prices')

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-2">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">
          {t('effectiveFrom')}: {new Date(config.effectiveFrom).toLocaleString('lo-LA')}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/20">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('columns.purityCode')}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('columns.unit')}</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('columns.buy')}</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('columns.sell')}</th>
          </tr>
        </thead>
        <tbody>
          {config.items.map((item) => {
            const prev = prevMap?.get(keyOf(item))
            const isNew = !!prevMap && !prev
            const buyChanged = !!prev && prev.buyPrice !== item.buyPrice
            const sellChanged = !!prev && prev.sellPrice !== item.sellPrice
            const rowChanged = isNew || buyChanged || sellChanged
            return (
              <tr key={keyOf(item)} className={`border-b last:border-0 ${rowChanged ? 'bg-primary/5' : ''}`}>
                <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                  {item.purityCode}
                  {isNew && (
                    <Badge className="ml-2 bg-primary/15 text-primary border-primary/30 text-[10px]">
                      {t('comparisonNew')}
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{item.weightUnitCode}</td>
                <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${buyChanged ? 'text-primary font-semibold' : ''}`}>
                  {formatKip(item.buyPrice)}
                  {buyChanged && prev && (
                    <span className="block text-[10px] text-muted-foreground line-through">{formatKip(prev.buyPrice)}</span>
                  )}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${sellChanged ? 'text-primary font-semibold' : ''}`}>
                  {formatKip(item.sellPrice)}
                  {sellChanged && prev && (
                    <span className="block text-[10px] text-muted-foreground line-through">{formatKip(prev.sellPrice)}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
