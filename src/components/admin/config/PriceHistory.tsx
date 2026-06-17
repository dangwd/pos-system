'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CloseOutlined, ArrowLeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useConfigPriceHistory } from '@/hooks/useConfig'
import type { PriceConfig } from '@/types/config'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

interface Props {
  onClose: () => void
}

/** Danh sách các bảng giá đã tạo → click để xem chi tiết. */
export function PriceHistory({ onClose }: Props) {
  const t = useTranslations('admin.config.prices')
  const { data: history = [], isLoading } = useConfigPriceHistory(50)
  const [selected, setSelected] = useState<PriceConfig | null>(null)

  if (isLoading) {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  // ── Chi tiết một bảng giá ──────────────────────────────────────────────
  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
            <ArrowLeftOutlined className="h-3.5 w-3.5 mr-1.5" />
            {t('historyBack')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('effectiveFrom')}: {new Date(selected.effectiveFrom).toLocaleString('lo-LA')}
          </span>
        </div>

        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.purityCode')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.category')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.unit')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.buy')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.sell')}</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((item) => (
                <tr key={`${item.goldPurityId}:${item.weightUnitId}`} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono font-bold">{item.purityCode}</td>
                  <td className="px-4 py-3">
                    {/* Màu kim loại: Vàng → amber, Bạc → zinc (không có token chủ đề cho kim loại) */}
                    <Badge
                      className={
                        item.category === 'Gold'
                          ? 'bg-amber-400 text-amber-950 border-amber-500/60'
                          : 'bg-zinc-300 text-zinc-800 border-zinc-400/70'
                      }
                    >
                      {item.category === 'Gold' ? t('categoryGold') : t('categorySilver')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.weightUnitCode}
                    <span className="ml-1 opacity-60">({item.gramPerUnit}g)</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold">
                    {formatKip(item.buyPrice)}<span className="text-xs text-muted-foreground ml-1">/{item.weightUnitCode}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold">
                    {formatKip(item.sellPrice)}<span className="text-xs text-muted-foreground ml-1">/{item.weightUnitCode}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Danh sách bảng giá ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('historyTitle')}</h2>
        <Button size="sm" variant="outline" onClick={onClose}>
          <CloseOutlined className="h-3.5 w-3.5 mr-1.5" />
          {t('historyClose')}
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          {t('historyEmpty')}
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {history.map((cfg, idx) => (
            <button
              key={cfg.id}
              type="button"
              onClick={() => setSelected(cfg)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {new Date(cfg.effectiveFrom).toLocaleString('lo-LA')}
                </span>
                {idx === 0 && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                    {t('historyCurrent')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t('historyCount', { count: cfg.items.length })}</span>
                <RightOutlined className="h-4 w-4 opacity-50" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
