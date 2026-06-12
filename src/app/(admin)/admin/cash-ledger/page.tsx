'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashLedgerRepository } from '@/lib/repositories/cash-ledger.repository'
import { useAuthStore } from '@/stores/auth.store'
import { Plus } from 'lucide-react'
import { Form } from 'antd'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Spinner } from '@/components/ui/spinner'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { isIncomeEntry } from '@/types/cash-ledger'
import type { CashEntryType, CashMethod, CashCurrency } from '@/types/cash-ledger'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Lives inside DialogContent (destroyOnHidden=true), so it remounts fresh on
// each open — form state auto-resets without any manual cleanup.
function AddEntryDialog({ branchId, open, onClose }: { branchId: string; open: boolean; onClose: () => void }) {
  const t = useTranslations('admin.cashLedger')
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    description: '',
    entryType: 'INCOME' as CashEntryType,
    method: 'Cash' as CashMethod,
    currency: 'LAK' as CashCurrency,
    originalAmount: '',
    exchangeRate: '1',
  })

  const { mutate: addEntry, isPending } = useMutation({
    mutationFn: () => cashLedgerRepository.addManualEntry({
      branchId,
      description: form.description,
      entryType: form.entryType,
      method: form.method,
      currency: form.currency,
      originalAmount: Number(form.originalAmount),
      exchangeRate: Number(form.exchangeRate),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-ledger'] })
      onClose()
    },
    onError: () => toast.error('Failed to add entry'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-xl"
        title={t('addEntry')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => addEntry()}
              disabled={isPending || !form.description || !form.originalAmount}
            >
              {isPending ? <Spinner /> : t('addEntry')}
            </Button>
          </DialogFooter>
        }
      >
        <Form layout="vertical" className="py-2">
          <Form.Item label={t('columns.description')}>
            <Input
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label={t('columns.direction')}>
              <Select
                value={form.entryType}
                onValueChange={(v) => setForm(p => ({ ...p, entryType: v as CashEntryType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">{t('entryType.INCOME')}</SelectItem>
                  <SelectItem value="EXPENSE">{t('entryType.EXPENSE')}</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
            <Form.Item label={t('columns.method')}>
              <Select
                value={form.method}
                onValueChange={(v) => setForm(p => ({ ...p, method: v as CashMethod }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">{t('method.Cash')}</SelectItem>
                  <SelectItem value="BankTransfer">{t('method.BankTransfer')}</SelectItem>
                  <SelectItem value="QR">{t('method.QR')}</SelectItem>
                  <SelectItem value="COMBINED">{t('method.COMBINED')}</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label={t('columns.amount')}>
              <Input
                type="number"
                min="0"
                value={form.originalAmount}
                onChange={(e) => setForm(p => ({ ...p, originalAmount: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={t('columns.currency')} style={{ marginBottom: 0 }}>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm(p => ({ ...p, currency: v as CashCurrency }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAK">LAK</SelectItem>
                  <SelectItem value="THB">THB</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function CashLedgerPage() {
  const t = useTranslations('admin.cashLedger')
  const { user } = useAuthStore()

  const branchId = user?.branchId ?? ''
  const [date, setDate] = useState(today())
  const [addOpen, setAddOpen] = useState(false)

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['cash-ledger', branchId, date],
    queryFn: () => cashLedgerRepository.getDaily(branchId, date),
    staleTime: 30_000,
    enabled: !!branchId,
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
                      <Badge variant={isIncomeEntry(entry.entryType) ? 'default' : 'destructive'}>
                        {t(`entryType.${entry.entryType}`)}
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

      <AddEntryDialog
        branchId={branchId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}
