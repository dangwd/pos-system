'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useConfigPrices, useUpdatePrices } from '@/hooks/useConfig'
import { useUser } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/auth.store'
import type { PriceItemDto, PriceItem } from '@/types/config'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

type FormRow = {
  goldPurityId: string
  purityCode: string
  category: 'Gold' | 'Silver'
  weightUnitId: string
  weightUnitCode: string
  gramPerUnit: number
  buyPrice: string
  sellPrice: string
}

function buildFormRows(items: PriceItem[]): FormRow[] {
  return items.map((i) => ({
    goldPurityId: i.goldPurityId,
    purityCode: i.purityCode,
    category: i.category,
    weightUnitId: i.weightUnitId,
    weightUnitCode: i.weightUnitCode,
    gramPerUnit: i.gramPerUnit,
    buyPrice: String(i.buyPrice),
    sellPrice: String(i.sellPrice),
  }))
}

export default function PricesPage() {
  const t = useTranslations('admin.config.prices')
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<FormRow[]>([])

  const { data: prices, isLoading } = useConfigPrices()
  const { mutate: update, isPending } = useUpdatePrices()

  // "Cập nhật bởi" backend trả về GUID → resolve sang tên. Chính mình thì lấy từ
  // session (khỏi gọi API); người khác thì GET /api/users/{id} (fallback ID nếu
  // không có quyền UserManage hoặc không tìm thấy).
  const currentUser = useAuthStore((s) => s.user)
  const updaterId = prices?.updatedBy ?? ''
  const isSelfUpdater = !!updaterId && currentUser?.userId === updaterId
  const { data: updaterUser } = useUser(isSelfUpdater ? '' : updaterId)
  const updatedByName = isSelfUpdater
    ? (currentUser?.fullName ?? updaterId)
    : (updaterUser?.fullName ?? updaterId)

  const currentRows = useMemo(
    () => buildFormRows(prices?.items ?? []),
    [prices],
  )

  function startEdit() {
    setRows(buildFormRows(prices?.items ?? []))
    setEditing(true)
  }

  function setCell(idx: number, field: 'buyPrice' | 'sellPrice', value: string) {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  function handleSubmit() {
    const items: PriceItemDto[] = rows.map((r) => ({
      goldPurityId: r.goldPurityId,
      weightUnitId: r.weightUnitId,
      buyPrice: Number(r.buyPrice) || 0,
      sellPrice: Number(r.sellPrice) || 0,
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
          <Button size="sm" variant="outline" onClick={startEdit} disabled={isLoading || !prices?.items.length}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {t('updateButton')}
          </Button>
        )}
      </div>

      {isLoading ? <TablePageSkeleton cols={5} rows={4} /> : (
        <>
          {prices && (
            <p className="text-xs text-muted-foreground">
              {t('effectiveFrom')}: {new Date(prices.effectiveFrom).toLocaleString('lo-LA')}
              {' · '}{t('updatedBy')}: {updatedByName}
            </p>
          )}

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[23%]" />
                <col className="w-[24%]" />
                <col className="w-[24%]" />
              </colgroup>
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
                {(editing ? rows : currentRows).map((row, idx) => (
                  <tr key={`${row.goldPurityId}:${row.weightUnitId}`} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-3 font-mono font-bold">{row.purityCode}</td>
                    <td className="px-4 py-3">
                      {/* Màu theo kim loại: Vàng (Au) → vàng kim, Bạc (Ag) → ánh bạc.
                          Hardcode amber/zinc vì không có token chủ đề cho kim loại. */}
                      <Badge
                        className={
                          row.category === 'Gold'
                            ? 'bg-amber-400 text-amber-950 border-amber-500/60'
                            : 'bg-zinc-300 text-zinc-800 border-zinc-400/70'
                        }
                      >
                        {row.category === 'Gold' ? t('categoryGold') : t('categorySilver')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.weightUnitCode}
                      <span className="ml-1 opacity-60">({row.gramPerUnit}g)</span>
                    </td>
                    {editing ? (
                      <>
                        <td className="px-4 py-2">
                          <NumberInput
                            min={0}
                            value={row.buyPrice}
                            onChange={(v) => setCell(idx, 'buyPrice', v)}
                            className="h-7 text-right text-xs w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <NumberInput
                            min={0}
                            value={row.sellPrice}
                            onChange={(v) => setCell(idx, 'sellPrice', v)}
                            className="h-7 text-right text-xs w-full"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                          <span className="font-semibold">{formatKip(Number(row.buyPrice))}</span>
                          <span className="text-xs text-muted-foreground ml-1">/{row.weightUnitCode}</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                          <span className="font-semibold">{formatKip(Number(row.sellPrice))}</span>
                          <span className="text-xs text-muted-foreground ml-1">/{row.weightUnitCode}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">
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
