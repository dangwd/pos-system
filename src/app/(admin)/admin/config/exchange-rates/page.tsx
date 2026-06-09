'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configRepository } from '@/lib/repositories/config.repository'
import { Loader2, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ExchangeRate } from '@/types/config'

export default function ExchangeRatesPage() {
  const t = useTranslations('admin.config.exchangeRates')
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState<ExchangeRate | null>(null)
  const [form, setForm] = useState({ rateToLak: '', adjustment: '' })

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['config', 'exchange-rates'],
    queryFn: () => configRepository.getExchangeRates(),
    staleTime: 60_000,
  })

  const { mutate: update, isPending } = useMutation({
    mutationFn: () => configRepository.updateExchangeRate({
      currencyCode: editing!.currencyCode,
      rateToLak:   Number(form.rateToLak),
      adjustment:  Number(form.adjustment),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'exchange-rates'] })
      setEditing(null)
      toast.success('Rate updated')
    },
    onError: () => toast.error('Failed to update rate'),
  })

  function openEdit(rate: ExchangeRate) {
    setEditing(rate)
    setForm({ rateToLak: String(rate.rateToLak), adjustment: String(rate.adjustment) })
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border max-w-2xl">
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
                  <td className="px-4 py-3 text-muted-foreground">
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('updateButton')} — {editing?.currencyCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('columns.rate')}</Label>
              <Input
                type="number"
                min="0"
                value={form.rateToLak}
                onChange={(e) => setForm(p => ({ ...p, rateToLak: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('columns.adjustment')}</Label>
              <Input
                type="number"
                value={form.adjustment}
                onChange={(e) => setForm(p => ({ ...p, adjustment: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => update()} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('updateButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
