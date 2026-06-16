'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useExchangeRates, useUpdateExchangeRate } from '@/hooks/useConfig'
import type { ExchangeRate } from '@/types/config'

const CURRENCY_META: Record<string, { flag: string; name: string }> = {
  THB: { flag: '🇹🇭', name: 'Baht Thái' },
  USD: { flag: '🇺🇸', name: 'Đô la Mỹ' },
  CNY: { flag: '🇨🇳', name: 'Nhân dân tệ' },
  KRW: { flag: '🇰🇷', name: 'Won Hàn Quốc' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  JPY: { flag: '🇯🇵', name: 'Yên Nhật' },
  VND: { flag: '🇻🇳', name: 'Việt Nam Đồng' },
  GBP: { flag: '🇬🇧', name: 'Bảng Anh' },
}

function formatLak(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

// ─── Preview panel ─────────────────────────────────────────────────────────────

function RatePreviewPanel({ rates }: { rates: ExchangeRate[] }) {
  const t = useTranslations('admin.config.exchangeRates')
  const [selectedCode, setSelectedCode] = useState<string>(rates[0]?.currencyCode ?? '')
  const [amount, setAmount] = useState('100')

  const selected = rates.find(r => r.currencyCode === selectedCode) ?? rates[0]
  const effectiveRate = selected?.effectiveRate ?? 0
  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const resultLak = Math.round(numAmount * effectiveRate)

  const meta = selected ? (CURRENCY_META[selected.currencyCode] ?? { flag: '💱', name: selected.currencyCode }) : null

  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-5">
      <h2 className="text-base font-semibold">{t('previewTitle')}</h2>

      {/* Currency selector tabs */}
      <div className="flex flex-wrap gap-2">
        {rates.map(r => {
          const m = CURRENCY_META[r.currencyCode] ?? { flag: '💱', name: r.currencyCode }
          return (
            <button
              key={r.currencyCode}
              type="button"
              onClick={() => setSelectedCode(r.currencyCode)}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                selectedCode === r.currencyCode
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              <span>{m.flag}</span>
              <span>{r.currencyCode}</span>
            </button>
          )
        })}
      </div>

      {selected && meta && (
        <>
          {/* Rate display */}
          <div className="rounded-lg bg-muted/40 border px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">
              {t('fieldRatePreview')} (1 {selected.currencyCode} = ? ₭)
            </p>
            <div className="flex items-end justify-between gap-2">
              <span className="text-2xl font-bold text-primary">
                {effectiveRate.toLocaleString('lo-LA')}
                <span className="text-base font-normal text-muted-foreground ml-1">₭</span>
              </span>
              <div className="text-xs text-muted-foreground text-right">
                <div>Gốc: {selected.rateToLak.toLocaleString('lo-LA')}</div>
                <div>Điều chỉnh: {selected.adjustment >= 0 ? '+' : ''}{selected.adjustment.toLocaleString('lo-LA')}</div>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <div className="flex gap-3 items-end">
            {/* Amount input */}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1.5">{t('inputAmount')} ({selected.currencyCode})</p>
              <div className="relative">
                <NumberInput
                  decimals={2}
                  min={0}
                  value={amount}
                  onChange={setAmount}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  {meta.flag}
                </span>
              </div>
            </div>

            <span className="pb-2 text-muted-foreground font-medium">=</span>

            {/* Result */}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1.5">₭ (LAK)</p>
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3">
                <span className="font-bold text-foreground text-sm">
                  {resultLak > 0 ? resultLak.toLocaleString('lo-LA') : '—'}
                </span>
                <span className="ml-1 text-muted-foreground text-xs">₭</span>
              </div>
            </div>
          </div>

          {/* Last updated */}
          <p className="text-xs text-muted-foreground">
            {t('labelUpdatedAt')}: {formatDateShort(selected.effectiveFrom)}
          </p>
        </>
      )}
    </div>
  )
}

// ─── Currency card ──────────────────────────────────────────────────────────────

function CurrencyCard({ rate, onEdit }: { rate: ExchangeRate; onEdit: () => void }) {
  const t = useTranslations('admin.config.exchangeRates')
  const meta = CURRENCY_META[rate.currencyCode] ?? { flag: '💱', name: rate.currencyCode }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:border-primary/40 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.flag}</span>
        <div>
          <div className="font-bold text-sm">{rate.currencyCode}</div>
          <div className="text-xs text-muted-foreground">{meta.name}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs text-muted-foreground">1 {rate.currencyCode} = </span>
          <span className="font-bold text-primary">{rate.effectiveRate.toLocaleString('lo-LA')}</span>
          <span className="text-xs text-muted-foreground ml-0.5">₭</span>
        </div>
        <button
          type="button"
          title={t('edit')}
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ExchangeRatesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.exchangeRates')
  const [editing, setEditing] = useState<ExchangeRate | null>(null)
  const [form, setForm] = useState({ rateToLak: '', adjustment: '' })
  const [search, setSearch] = useState('')

  const { data: rates = [], isLoading, refetch, isFetching } = useExchangeRates()
  const { mutate: update, isPending } = useUpdateExchangeRate()

  const filtered = useMemo(() => {
    if (!search.trim()) return rates
    const q = search.trim().toUpperCase()
    return rates.filter(r =>
      r.currencyCode.includes(q) ||
      (CURRENCY_META[r.currencyCode]?.name.toLowerCase().includes(search.toLowerCase()))
    )
  }, [rates, search])

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

  const effectivePreview = (Number(form.rateToLak) || 0) + (Number(form.adjustment) || 0)

  if (!hasPermission('CONFIG_PRICE')) return <ForbiddenPage />

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={2} rows={4} />
      ) : (
        <div className="flex gap-6 flex-col xl:flex-row">
          {/* Left: preview calculator */}
          {rates.length > 0 && (
            <div className="w-full xl:w-105 shrink-0">
              <RatePreviewPanel rates={rates} />
            </div>
          )}

          {/* Right: management list */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border bg-card flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
                <h2 className="text-base font-semibold shrink-0">{t('managementTitle')}</h2>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={t('searchPlaceholder')}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    title="Làm mới"
                    onClick={() => refetch()}
                    className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted transition-colors shrink-0"
                  >
                    <RefreshCw className={['h-3.5 w-3.5', isFetching ? 'animate-spin' : ''].join(' ')} />
                  </button>
                </div>
              </div>

              {/* Currency cards */}
              <div className="flex flex-col gap-2 p-4">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">{t('noData')}</p>
                ) : (
                  filtered.map(rate => (
                    <CurrencyCard key={rate.id} rate={rate} onEdit={() => openEdit(rate)} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent
          className="sm:max-w-md"
          title={`${t('dialogTitle')} — ${editing ? (CURRENCY_META[editing.currencyCode]?.flag ?? '💱') : ''} ${editing?.currencyCode}`}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={isPending}>{t('cancel')}</Button>
              <Button onClick={handleSubmit} disabled={isPending || !form.rateToLak}>
                {isPending && <Spinner className="mr-2" />}
                {t('updateButton')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>{t('columns.rate')} (1 {editing?.currencyCode} = ? ₭)</FieldLabel>
              <NumberInput
                min={0}
                decimals={2}
                value={form.rateToLak}
                onChange={(v) => setForm((f) => ({ ...f, rateToLak: v }))}
              />
            </Field>
            <Field>
              <FieldLabel>{t('columns.adjustment')}</FieldLabel>
              <NumberInput
                decimals={2}
                value={form.adjustment}
                onChange={(v) => setForm((f) => ({ ...f, adjustment: v }))}
              />
            </Field>
            {/* Effective rate preview */}
            {(Number(form.rateToLak) > 0) && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">{t('fieldEffectiveRate')}</p>
                <p className="text-lg font-bold text-primary">
                  1 {editing?.currencyCode} = {formatLak(effectivePreview)}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
