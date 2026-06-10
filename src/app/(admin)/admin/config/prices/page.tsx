'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useConfigPrices, useUpdatePrices, useGoldPurities } from '@/hooks/useConfig'
import type { PriceItemDto, GoldPurity, PriceItem } from '@/types/config'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

type FormRow = {
  goldPurityId: string
  purityCode: string
  category: 'Gold' | 'Silver'
  buyPerChi: string
  sellPerChi: string
  buyPerGram: string
  sellPerGram: string
}

function buildFormRows(purities: GoldPurity[], items: PriceItem[]): FormRow[] {
  const priceMap = new Map(items.map((i) => [i.goldPurityId, i]))
  return purities.map((p) => {
    const existing = priceMap.get(p.id)
    return {
      goldPurityId: p.id,
      purityCode: p.ma,
      category: p.category,
      buyPerChi: existing ? String(existing.buyPricePerChi) : '0',
      sellPerChi: existing ? String(existing.sellPricePerChi) : '0',
      buyPerGram: existing ? String(existing.buyPricePerGram) : '0',
      sellPerGram: existing ? String(existing.sellPricePerGram) : '0',
    }
  })
}

export default function PricesPage() {
  const t = useTranslations('admin.config.prices')
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<FormRow[]>([])

  const { data: prices, isLoading: pricesLoading } = useConfigPrices()
  const { data: purities = [], isLoading: puritiesLoading } = useGoldPurities()
  const { mutate: update, isPending } = useUpdatePrices()

  const isLoading = pricesLoading || puritiesLoading

  const currentRows = useMemo(
    () => buildFormRows(purities, prices?.items ?? []),
    [purities, prices],
  )

  function startEdit() {
    setRows(buildFormRows(purities, prices?.items ?? []))
    setEditing(true)
  }

  function setCell(idx: number, field: keyof FormRow, value: string) {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  function handleSubmit() {
    const items: PriceItemDto[] = rows.map((r) => ({
      goldPurityId: r.goldPurityId,
      buyPricePerChi: Number(r.buyPerChi) || 0,
      sellPricePerChi: Number(r.sellPerChi) || 0,
      buyPricePerGram: Number(r.buyPerGram) || 0,
      sellPricePerGram: Number(r.sellPerGram) || 0,
    }))
    update({ items }, { onSuccess: () => setEditing(false) })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit} disabled={isLoading || purities.length === 0}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {t('updateButton')}
          </Button>
        )}
      </div>

      {isLoading ? <TablePageSkeleton cols={4} rows={4} /> : (
        <>
          {prices && (
            <p className="text-xs text-muted-foreground">
              {t('effectiveFrom')}: {new Date(prices.effectiveFrom).toLocaleString('lo-LA')}
              {' · '}{t('updatedBy')}: {prices.updatedBy}
            </p>
          )}

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.purityCode')}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.category')}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.buy')}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.sell')}</th>
                </tr>
              </thead>
              <tbody>
                {(editing ? rows : currentRows).map((row, idx) => (
                  <tr key={row.goldPurityId} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-3 font-mono font-bold">{row.purityCode}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.category === 'Gold' ? 'default' : 'secondary'}>
                        {row.category === 'Gold' ? t('categoryGold') : t('categorySilver')}
                      </Badge>
                    </td>
                    {editing ? (
                      <>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={row.category === 'Gold' ? row.buyPerChi : row.buyPerGram}
                            onChange={(e) => setCell(idx, row.category === 'Gold' ? 'buyPerChi' : 'buyPerGram', e.target.value)}
                            className="h-7 text-right text-xs w-44 ml-auto"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={row.category === 'Gold' ? row.sellPerChi : row.sellPerGram}
                            onChange={(e) => setCell(idx, row.category === 'Gold' ? 'sellPerChi' : 'sellPerGram', e.target.value)}
                            className="h-7 text-right text-xs w-44 ml-auto"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold">
                            {row.category === 'Gold'
                              ? formatKip(Number(row.buyPerChi))
                              : formatKip(Number(row.buyPerGram))}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            /{row.category === 'Gold' ? t('unitChi') : t('unitGram')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold">
                            {row.category === 'Gold'
                              ? formatKip(Number(row.sellPerChi))
                              : formatKip(Number(row.sellPerGram))}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            /{row.category === 'Gold' ? t('unitChi') : t('unitGram')}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">
                      {t('noPurities')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {editing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={isPending}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Spinner className="mr-2" />}
                {t('saveButton')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
