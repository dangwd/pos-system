'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, RefreshCw, Search, ArrowLeftRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useExchangeRates, useUpdateExchangeRate } from '@/hooks/useConfig'
import { cn } from '@/lib/utils'
import type { ExchangeRate } from '@/types/config'

const CURRENCY_META: Record<string, { flag: string; name: string }> = {
  LAK: { flag: '₭', name: 'Kip Lào' },
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
  const { mutate: updateRate, isPending: isSavingRate } = useUpdateExchangeRate()
  const currencies = ['LAK', ...rates.map(r => r.currencyCode)]

  const [fromCurrency, setFromCurrency] = useState<string>(rates[0]?.currencyCode ?? 'THB')
  const [toCurrency, setToCurrency]     = useState<string>('LAK')
  const [amount, setAmount]             = useState('100')
  const [editingRate, setEditingRate]   = useState(false)
  const [rateInput, setRateInput]       = useState('')

  function getRateLak(currency: string): number {
    if (currency === 'LAK') return 1
    return rates.find(r => r.currencyCode === currency)?.effectiveRate ?? 1
  }

  const fromRateLak  = getRateLak(fromCurrency)
  const toRateLak    = getRateLak(toCurrency)
  const crossRate    = toRateLak > 0 ? fromRateLak / toRateLak : 0

  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const result    = numAmount * crossRate

  const isFromLak     = fromCurrency === 'LAK'
  const isToLak       = toCurrency   === 'LAK'
  const isBothForeign = !isFromLak && !isToLak

  // Luôn hiển thị theo chiều "1 [ngoại tệ] = X ₭" để tránh số thập phân nhỏ khi from=LAK
  const displayBase      = isFromLak ? toCurrency : fromCurrency
  const displayRateValue = isFromLak ? toRateLak  : crossRate
  const displayDecimals  = isBothForeign ? 4 : 0
  const displayTarget    = (isToLak || isFromLak) ? '₭' : toCurrency

  const fromMeta = CURRENCY_META[fromCurrency] ?? { flag: '💱', name: fromCurrency }
  const toMeta   = CURRENCY_META[toCurrency]   ?? { flag: '💱', name: toCurrency }

  const resultDisplay = toCurrency === 'LAK'
    ? Math.round(result).toLocaleString('lo-LA')
    : result.toLocaleString('en', { maximumFractionDigits: 4 })

  function resetEdit() { setEditingRate(false) }

  function handleFromChange(val: string) {
    setFromCurrency(val)
    resetEdit()
    if (val === toCurrency) setToCurrency(val === 'LAK' ? (rates[0]?.currencyCode ?? 'USD') : 'LAK')
  }

  function handleToChange(val: string) {
    setToCurrency(val)
    resetEdit()
    if (val === fromCurrency) setFromCurrency(val === 'LAK' ? (rates[0]?.currencyCode ?? 'USD') : 'LAK')
  }

  function swap() {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    resetEdit()
  }

  function openEditRate() {
    const val = displayRateValue
    setRateInput(val > 0 ? val.toLocaleString('en', { maximumFractionDigits: displayDecimals, useGrouping: false }) : '')
    setEditingRate(true)
  }

  function saveRate() {
    const val = parseFloat(rateInput)
    if (!val || val <= 0) { resetEdit(); return }

    let currencyCode: string
    let rateToLak: number

    if (isFromLak) {
      // displayBase = toCurrency, user edits "1 TO = X ₭"
      currencyCode = toCurrency
      rateToLak    = val
    } else if (isToLak) {
      // displayBase = fromCurrency, user edits "1 FROM = X ₭"
      currencyCode = fromCurrency
      rateToLak    = val
    } else {
      // Cả hai ngoại tệ: "1 FROM = X TO" → back-calculate FROM's LAK rate
      currencyCode = fromCurrency
      rateToLak    = Math.round(val * toRateLak)
    }

    updateRate(
      { currencyCode, rateToLak, adjustment: 0 },
      { onSuccess: resetEdit },
    )
  }

  const detailRate = isFromLak
    ? rates.find(r => r.currencyCode === toCurrency)
    : rates.find(r => r.currencyCode === fromCurrency)

  const lastUpdated = detailRate?.effectiveFrom

  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-5">
      <h2 className="text-base font-semibold">{t('previewTitle')}</h2>

      {/* From / To selectors */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Từ</p>
          <Select value={fromCurrency} onValueChange={handleFromChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => {
                const m = CURRENCY_META[c] ?? { flag: '💱', name: c }
                return (
                  <SelectItem key={c} value={c}>
                    <span className="mr-1">{m.flag}</span> {c} — {m.name}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={swap}
          title="Đổi chiều quy đổi"
          className="h-9 w-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Sang</p>
          <Select value={toCurrency} onValueChange={handleToChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => {
                const m = CURRENCY_META[c] ?? { flag: '💱', name: c }
                return (
                  <SelectItem key={c} value={c}>
                    <span className="mr-1">{m.flag}</span> {c} — {m.name}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rate display — editable inline */}
      <div className="rounded-lg bg-muted/40 border px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1.5">
          Tỷ giá áp dụng
        </p>
        {editingRate ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground shrink-0">
              1 {displayBase} =
            </span>
            <NumberInput
              decimals={displayDecimals}
              min={0}
              value={rateInput}
              onChange={setRateInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRate()
                if (e.key === 'Escape') resetEdit()
              }}
              className="h-8 flex-1 text-sm font-mono text-center border-primary"
              autoFocus
            />
            <span className="text-sm font-semibold text-muted-foreground shrink-0">
              {displayTarget}
            </span>
            <button
              onClick={saveRate}
              disabled={isSavingRate || !rateInput}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSavingRate ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              onClick={resetEdit}
              disabled={isSavingRate}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={openEditRate}
            className="w-full flex items-center justify-between gap-2 group"
            title="Nhấn để sửa tỷ giá"
          >
            <span className="text-xl font-bold text-primary group-hover:text-primary/80 transition-colors">
              1 {displayBase}{' '}
              <span className="text-base font-normal text-muted-foreground">= </span>
              {displayRateValue.toLocaleString('en', { maximumFractionDigits: displayDecimals })}
              <span className="text-base font-normal text-muted-foreground ml-1">{displayTarget}</span>
            </span>
            <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <Pencil className="h-3.5 w-3.5" />
              Sửa
            </span>
          </button>
        )}

        {/* Breakdown gốc / điều chỉnh */}
        {!isBothForeign && detailRate && !editingRate && (
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span>Gốc: {detailRate.rateToLak.toLocaleString('lo-LA')}</span>
            <span>Điều chỉnh: {detailRate.adjustment >= 0 ? '+' : ''}{detailRate.adjustment.toLocaleString('lo-LA')}</span>
          </div>
        )}
      </div>

      {/* Amount input */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">
          {t('inputAmount')} ({fromMeta.flag} {fromCurrency})
        </p>
        <div className="relative">
          <NumberInput
            decimals={2}
            min={0}
            value={amount}
            onChange={setAmount}
            className="pr-14"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            {fromMeta.flag}
          </span>
        </div>
      </div>

      {/* Result box */}
      <div className={cn(
        'rounded-lg border px-4 py-4 text-center',
        result > 0 ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30',
      )}>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2">
          Kết quả
        </p>
        <p className={cn(
          'text-3xl font-black tabular-nums tracking-tight leading-none',
          result > 0 ? 'text-foreground' : 'text-muted-foreground/40',
        )}>
          {result > 0 ? resultDisplay : '—'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {toCurrency === 'LAK' ? '₭ (Kip Lào)' : `${toMeta.flag} ${toCurrency}`}
        </p>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          {t('labelUpdatedAt')}: {formatDateShort(lastUpdated)}
        </p>
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
