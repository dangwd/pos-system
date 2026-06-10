'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useExchangeRates, useUpdateExchangeRate } from '@/hooks/useConfig'
import type { ExchangeRate } from '@/types/config'

export default function ExchangeRatesPage() {
  const t = useTranslations('admin.config.exchangeRates')
  const [editing, setEditing] = useState<ExchangeRate | null>(null)
  const [form, setForm] = useState({ rateToLak: '', adjustment: '' })

  const { data: rates = [], isLoading } = useExchangeRates()
  const { mutate: update, isPending } = useUpdateExchangeRate()

  function openEdit(rate: ExchangeRate) {
    setEditing(rate)
    setForm({ rateToLak: String(rate.rateToLak), adjustment: String(rate.adjustment) })
  }

  function handleSubmit() {
    if (!editing) return
    update(
      { currencyCode: editing.currencyCode, rateToLak: Number(form.rateToLak), adjustment: Number(form.adjustment) },
      { onSuccess: () => setEditing(null) },
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {isLoading ? <TablePageSkeleton cols={4} rows={3} /> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.currency')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.rate')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.adjustment')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.updatedAt')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-bold">{rate.currencyCode}</td>
                  <td className="px-4 py-3 text-right">{rate.rateToLak.toLocaleString('lo-LA')}</td>
                  <td className="px-4 py-3 text-right">{rate.adjustment.toLocaleString('lo-LA')}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(rate.effectiveFrom).toLocaleDateString('lo-LA')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(rate)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('updateButton')} — {editing?.currencyCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>{t('columns.rate')}</FieldLabel>
              <Input type="number" min="0" value={form.rateToLak} onChange={(e) => setForm((f) => ({ ...f, rateToLak: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>{t('columns.adjustment')}</FieldLabel>
              <Input type="number" value={form.adjustment} onChange={(e) => setForm((f) => ({ ...f, adjustment: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.rateToLak}>
              {isPending && <Spinner className="mr-2" />}
              {t('updateButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
