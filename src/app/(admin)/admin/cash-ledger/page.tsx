'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashLedgerRepository } from '@/lib/repositories/cash-ledger.repository'
import { useAuthStore } from '@/stores/auth.store'
import { Plus } from 'lucide-react'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Spinner } from '@/components/ui/spinner'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { CashDirection, CashMethod, CashCurrency } from '@/types/cash-ledger'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function CashLedgerPage() {
  const t = useTranslations('admin.cashLedger')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const branchId = user?.branchId ?? ''
  const [date, setDate] = useState(today())
  const [addOpen, setAddOpen] = useState(false)

  const [entryForm, setEntryForm] = useState({
    description: '',
    direction: 'In' as CashDirection,
    method: 'Cash' as CashMethod,
    currency: 'LAK' as CashCurrency,
    originalAmount: '',
    exchangeRate: '1',
  })

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['cash-ledger', branchId, date],
    queryFn: () => cashLedgerRepository.getDaily(branchId, date),
    staleTime: 30_000,
    enabled: !!branchId,
  })

  const { mutate: addEntry, isPending } = useMutation({
    mutationFn: () => cashLedgerRepository.addManualEntry({
      branchId,
      description: entryForm.description,
      direction: entryForm.direction,
      method: entryForm.method,
      currency: entryForm.currency,
      originalAmount: Number(entryForm.originalAmount),
      exchangeRate: Number(entryForm.exchangeRate),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-ledger'] })
      setAddOpen(false)
      setEntryForm({ description: '', direction: 'In', method: 'Cash', currency: 'LAK', originalAmount: '', exchangeRate: '1' })
    },
    onError: () => toast.error('Failed to add entry'),
  })

  const summaryCards = [
    { label: t('openingBalance'),  value: ledger?.openingBalanceLak ?? 0 },
    { label: t('totalIn'),         value: ledger?.totalInLak ?? 0 },
    { label: t('totalOut'),        value: ledger?.totalOutLak ?? 0 },
    { label: t('closingBalance'),  value: ledger?.closingBalanceLak ?? 0 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle', { date })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40 h-8 text-sm"
          />
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('addEntry')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{formatKip(value)}</p>
          </div>
        ))}
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.description')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.direction')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.method')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.currency')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.amount')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.amountLak')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.time')}</th>
              </tr>
            </thead>
            <tbody>
              {(ledger?.entries ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">—</td>
                </tr>
              ) : (
                ledger?.entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">{entry.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.direction === 'In' ? 'default' : 'destructive'}>
                        {t(`direction.${entry.direction}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{t(`method.${entry.method}`)}</td>
                    <td className="px-4 py-3 font-mono">{entry.currency}</td>
                    <td className="px-4 py-3 text-right font-mono">{entry.originalAmount.toLocaleString('lo-LA')}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatKip(entry.amountLak)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('addEntry')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('columns.description')}</Label>
              <Input
                value={entryForm.description}
                onChange={(e) => setEntryForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('columns.direction')}</Label>
                <select
                  className="w-full rounded-md border px-3 h-9 text-sm bg-background"
                  value={entryForm.direction}
                  onChange={(e) => setEntryForm(p => ({ ...p, direction: e.target.value as CashDirection }))}
                >
                  <option value="In">{t('direction.In')}</option>
                  <option value="Out">{t('direction.Out')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('columns.method')}</Label>
                <select
                  className="w-full rounded-md border px-3 h-9 text-sm bg-background"
                  value={entryForm.method}
                  onChange={(e) => setEntryForm(p => ({ ...p, method: e.target.value as CashMethod }))}
                >
                  <option value="Cash">{t('method.Cash')}</option>
                  <option value="BankTransfer">{t('method.BankTransfer')}</option>
                  <option value="QR">{t('method.QR')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('columns.amount')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={entryForm.originalAmount}
                  onChange={(e) => setEntryForm(p => ({ ...p, originalAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('columns.currency')}</Label>
                <select
                  className="w-full rounded-md border px-3 h-9 text-sm bg-background"
                  value={entryForm.currency}
                  onChange={(e) => setEntryForm(p => ({ ...p, currency: e.target.value as CashCurrency }))}
                >
                  <option value="LAK">LAK</option>
                  <option value="THB">THB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addEntry()} disabled={isPending || !entryForm.description || !entryForm.originalAmount}>
              {isPending ? <Spinner /> : t('addEntry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
