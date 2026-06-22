'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { EditOutlined, SyncOutlined, SearchOutlined, SwapOutlined, CheckOutlined, CloseOutlined, FormOutlined, HistoryOutlined } from '@ant-design/icons'
import { Table, Select as AntSelect } from 'antd'
import type { TableColumnsType } from 'antd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useExchangeRates, useUpdateExchangeRate, useCurrencies, useBulkUpdateExchangeRates, useExchangeRateHistory } from '@/hooks/useConfig'
import { cn } from '@/lib/utils'
import type { ExchangeRate, Currency } from '@/types/config'
import { FlagIcon } from '@/components/shared/FlagIcon'

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

function RatePreviewPanel({ rates, currencies: currenciesData }: { rates: ExchangeRate[]; currencies: Currency[] }) {
  const t = useTranslations('admin.config.exchangeRates')
  const { mutate: updateRate, isPending: isSavingRate } = useUpdateExchangeRate()

  const activeCurrencies = currenciesData.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  const currencyCodes = [...new Set(
    activeCurrencies.length > 0
      ? activeCurrencies.map(c => c.code)
      : ['LAK', ...rates.map(r => r.currencyCode)],
  )]

  const currencyInfoMap = Object.fromEntries(activeCurrencies.map(c => [c.code, c]))

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

  const fromMeta = {
    flag: currencyInfoMap[fromCurrency]?.flag ?? CURRENCY_META[fromCurrency]?.flag ?? currencyInfoMap[fromCurrency]?.symbol ?? '💱',
    name: currencyInfoMap[fromCurrency]?.name ?? CURRENCY_META[fromCurrency]?.name ?? fromCurrency,
  }
  const toMeta = {
    flag: currencyInfoMap[toCurrency]?.flag ?? CURRENCY_META[toCurrency]?.flag ?? currencyInfoMap[toCurrency]?.symbol ?? '💱',
    name: currencyInfoMap[toCurrency]?.name ?? CURRENCY_META[toCurrency]?.name ?? toCurrency,
  }

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
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-5 shadow-card">
      <h2 className="text-base font-semibold">{t('previewTitle')}</h2>

      {/* From / To selectors */}
      <div className="grid grid-cols-[1fr_36px_1fr] gap-2 items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Từ</p>
          <AntSelect
            value={fromCurrency}
            onChange={handleFromChange}
            style={{ width: '100%' }}
            popupMatchSelectWidth={false}
            labelRender={(opt) => {
              const code = String(opt.value ?? '')
              const flag = currencyInfoMap[code]?.flag ?? CURRENCY_META[code]?.flag ?? currencyInfoMap[code]?.symbol ?? '💱'
              return <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FlagIcon flag={flag} /><strong>{code}</strong></span>
            }}
            options={currencyCodes.map(code => {
              const flag = currencyInfoMap[code]?.flag ?? CURRENCY_META[code]?.flag ?? currencyInfoMap[code]?.symbol ?? '💱'
              const name = currencyInfoMap[code]?.name ?? CURRENCY_META[code]?.name ?? code
              return { value: code, label: `${flag} ${code} — ${name}` }
            })}
          />
        </div>

        <div className="flex items-end justify-center pb-0.5">
          <button
            type="button"
            onClick={swap}
            title="Đổi chiều quy đổi"
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <SwapOutlined style={{ fontSize: 13 }} />
          </button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Sang</p>
          <AntSelect
            value={toCurrency}
            onChange={handleToChange}
            style={{ width: '100%' }}
            popupMatchSelectWidth={false}
            labelRender={(opt) => {
              const code = String(opt.value ?? '')
              const flag = currencyInfoMap[code]?.flag ?? CURRENCY_META[code]?.flag ?? currencyInfoMap[code]?.symbol ?? '💱'
              return <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FlagIcon flag={flag} /><strong>{code}</strong></span>
            }}
            options={currencyCodes.map(code => {
              const flag = currencyInfoMap[code]?.flag ?? CURRENCY_META[code]?.flag ?? currencyInfoMap[code]?.symbol ?? '💱'
              const name = currencyInfoMap[code]?.name ?? CURRENCY_META[code]?.name ?? code
              return { value: code, label: `${flag} ${code} — ${name}` }
            })}
          />
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
            <InputNumber
              precision={displayDecimals}
              min={0}
              value={rateInput ? Number(rateInput) : null}
              onChange={(v) => setRateInput(String(v ?? ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRate()
                if (e.key === 'Escape') resetEdit()
              }}
              size="small"
              style={{ flex: 1 }}
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
              {isSavingRate ? <Spinner className="h-3.5 w-3.5" /> : <CheckOutlined className="h-4 w-4" />}
            </button>
            <button
              onClick={resetEdit}
              disabled={isSavingRate}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <CloseOutlined className="h-4 w-4" />
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
              <EditOutlined className="h-3.5 w-3.5" />
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
          {t('inputAmount')} (<FlagIcon flag={fromMeta.flag} /> {fromCurrency})
        </p>
        <div className="relative">
          <InputNumber
            precision={2}
            min={0}
            value={amount ? Number(amount) : null}
            onChange={(v) => setAmount(String(v ?? ''))}
            style={{ width: '100%' }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            <FlagIcon flag={fromMeta.flag} />
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
          {toCurrency === 'LAK' ? '₭ (Kip Lào)' : <><FlagIcon flag={toMeta.flag} /> {toCurrency}</>}
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

function CurrencyCard({ rate, currencyName, currencyFlag, onEdit }: { rate: ExchangeRate; currencyName?: string; currencyFlag?: string; onEdit: () => void }) {
  const t = useTranslations('admin.config.exchangeRates')
  const meta = CURRENCY_META[rate.currencyCode] ?? { flag: '💱', name: rate.currencyCode }
  const displayName = currencyName ?? meta.name
  const displayFlag = currencyFlag ?? meta.flag

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:border-primary/40 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3">
        <FlagIcon flag={displayFlag} className="text-2xl" />
        <div>
          <div className="font-bold text-sm">{rate.currencyCode}</div>
          <div className="text-xs text-muted-foreground">{displayName}</div>
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
          <EditOutlined className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Bulk edit dialog ──────────────────────────────────────────────────────────

type BulkForm = Record<string, { rateToLak: string; adjustment: string }>

function BulkEditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: rates = [] } = useExchangeRates()
  const { data: currencies = [] } = useCurrencies()
  const { mutate: bulkUpdate, isPending } = useBulkUpdateExchangeRates()

  const activeCurrencies = useMemo(
    () => currencies.filter(c => c.isActive && c.code !== 'LAK').sort((a, b) => a.sortOrder - b.sortOrder),
    [currencies],
  )

  const rateMap = useMemo(
    () => Object.fromEntries(rates.map(r => [r.currencyCode, r])),
    [rates],
  )

  // form initialized at mount — key prop in parent forces remount when dialog opens
  // Source of truth: active currencies from /api/currencies (not just those with existing rates)
  const [form, setForm] = useState<BulkForm>(() => {
    const rateByCode = Object.fromEntries(rates.map(r => [r.currencyCode, r]))
    const list = currencies.filter(c => c.isActive && c.code !== 'LAK').sort((a, b) => a.sortOrder - b.sortOrder)
    return Object.fromEntries(list.map(c => {
      const existing = rateByCode[c.code]
      return [c.code, {
        rateToLak: existing ? String(existing.rateToLak) : '0',
        adjustment: existing ? String(existing.adjustment) : '0',
      }]
    }))
  })

  function setField(code: string, field: 'rateToLak' | 'adjustment', val: string) {
    setForm(f => ({ ...f, [code]: { ...f[code], [field]: val } }))
  }

  function handleSubmit() {
    const items = activeCurrencies.map(c => ({
      currencyCode: c.code,
      rateToLak: Number(form[c.code]?.rateToLak ?? rateMap[c.code]?.rateToLak ?? 0),
      adjustment: Number(form[c.code]?.adjustment ?? rateMap[c.code]?.adjustment ?? 0),
    }))
    bulkUpdate({ items }, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl"
        title="Thiết lập tỷ giá"
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={isPending || activeCurrencies.length === 0}>
              {isPending && <Spinner className="mr-2" />}
              Lưu tất cả
            </Button>
          </DialogFooter>
        }
      >
        <div className="space-y-2 py-1 max-h-[60vh] overflow-y-auto pr-1">
          {activeCurrencies.map(currency => {
            const flag = currency.flag ?? CURRENCY_META[currency.code]?.flag ?? '💱'
            const name = currency.name ?? CURRENCY_META[currency.code]?.name ?? currency.code
            const rateVal   = Number(form[currency.code]?.rateToLak) || 0
            const adjVal    = Number(form[currency.code]?.adjustment) || 0
            const effective = rateVal + adjVal
            return (
              <div
                key={currency.code}
                className="grid grid-cols-[2rem_auto_1fr_1fr_5.5rem] items-center gap-3 rounded-lg border px-3 py-2.5"
              >
                <FlagIcon flag={flag} className="text-xl leading-none" />
                <div className="min-w-18">
                  <div className="text-sm font-bold">{currency.code}</div>
                  <div className="text-[11px] text-muted-foreground max-w-20 truncate">{name}</div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Giá gốc (₭)</p>
                  <InputNumber
                    min={0}
                    precision={2}
                    value={form[currency.code]?.rateToLak ? Number(form[currency.code].rateToLak) : null}
                    onChange={v => setField(currency.code, 'rateToLak', String(v ?? ''))}
                    style={{ width: '100%' }}
                    size="small"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Điều chỉnh</p>
                  <InputNumber
                    precision={2}
                    value={form[currency.code]?.adjustment !== undefined ? Number(form[currency.code].adjustment) : null}
                    onChange={v => setField(currency.code, 'adjustment', String(v ?? 0))}
                    style={{ width: '100%' }}
                    size="small"
                  />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-muted-foreground">Hiệu lực</div>
                  <div className={cn('text-sm font-bold tabular-nums', effective > 0 ? 'text-primary' : 'text-muted-foreground')}>
                    {effective > 0 ? effective.toLocaleString('lo-LA') : '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── History section ───────────────────────────────────────────────────────────

const historyColumns: TableColumnsType<{ id: string; currencyCode: string; rateToLak: number; adjustment: number; effectiveRate: number; effectiveFrom: string }> = [
  {
    title: 'Thời gian',
    dataIndex: 'effectiveFrom',
    key: 'effectiveFrom',
    render: (v: string) => formatDateShort(v),
    width: 160,
  },
  {
    title: 'Loại tiền',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    render: (code: string) => (
      <span className="font-medium inline-flex items-center gap-1"><FlagIcon flag={CURRENCY_META[code]?.flag ?? '💱'} /> {code}</span>
    ),
    width: 100,
  },
  {
    title: 'Giá gốc',
    dataIndex: 'rateToLak',
    key: 'rateToLak',
    align: 'right',
    render: (v: number) => v.toLocaleString('lo-LA'),
  },
  {
    title: 'Điều chỉnh',
    dataIndex: 'adjustment',
    key: 'adjustment',
    align: 'right',
    render: (v: number) => `${v >= 0 ? '+' : ''}${v.toLocaleString('lo-LA')}`,
  },
  {
    title: 'Tỷ giá hiệu lực',
    dataIndex: 'effectiveRate',
    key: 'effectiveRate',
    align: 'right',
    render: (v: number) => <strong className="text-primary tabular-nums">{v.toLocaleString('lo-LA')} ₭</strong>,
  },
]

function HistorySection() {
  const [expanded, setExpanded] = useState(false)
  const { data: history = [], isLoading } = useExchangeRateHistory(expanded)

  if (!expanded) {
    return (
      <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between shadow-card">
        <div>
          <h2 className="text-base font-semibold">Lịch sử thay đổi</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Tất cả lần cập nhật tỷ giá</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
          <HistoryOutlined className="mr-1.5 h-3.5 w-3.5" />
          Xem lịch sử
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold">Lịch sử thay đổi</h2>
        {!isLoading && <span className="text-xs text-muted-foreground">{history.length} bản ghi</span>}
      </div>
      <div className="p-4">
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          size="small"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
        />
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
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data: rates = [], isLoading, refetch, isFetching } = useExchangeRates()
  const { data: currencies = [] } = useCurrencies()
  const { mutate: update, isPending } = useUpdateExchangeRate()

  const currencyNameMap = useMemo(() =>
    Object.fromEntries(currencies.map(c => [c.code, c.name]))
  , [currencies])

  const currencyFlagMap = useMemo(() =>
    Object.fromEntries(currencies.filter(c => c.flag).map(c => [c.code, c.flag!]))
  , [currencies])

  const filtered = useMemo(() => {
    const nonLak = rates.filter(r => r.currencyCode !== 'LAK')
    if (!search.trim()) return nonLak
    const q = search.trim().toUpperCase()
    const qLower = search.toLowerCase()
    return nonLak.filter(r =>
      r.currencyCode.includes(q) ||
      (currencyNameMap[r.currencyCode]?.toLowerCase().includes(qLower)) ||
      (CURRENCY_META[r.currencyCode]?.name.toLowerCase().includes(qLower))
    )
  }, [rates, search, currencyNameMap])

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => setBulkOpen(true)} disabled={rates.length === 0}>
          <FormOutlined className="mr-1.5 h-4 w-4" />
          Thiết lập tỷ giá
        </Button>
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={2} rows={4} />
      ) : (
        <div className="flex gap-6 flex-col xl:flex-row">
          {/* Left: preview calculator */}
          {rates.length > 0 && (
            <div className="w-full xl:w-105 shrink-0">
              <RatePreviewPanel rates={rates} currencies={currencies} />
            </div>
          )}

          {/* Right: management list */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border bg-card flex flex-col h-full shadow-card">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
                <h2 className="text-base font-semibold shrink-0">{t('managementTitle')}</h2>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <SearchOutlined className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
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
                    <SyncOutlined className={['h-3.5 w-3.5', isFetching ? 'animate-spin' : ''].join(' ')} />
                  </button>
                </div>
              </div>

              {/* Currency cards */}
              <div className="flex flex-col gap-2 p-4">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">{t('noData')}</p>
                ) : (
                  filtered.map(rate => (
                    <CurrencyCard key={rate.id} rate={rate} currencyName={currencyNameMap[rate.currencyCode]} currencyFlag={currencyFlagMap[rate.currencyCode]} onEdit={() => openEdit(rate)} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <HistorySection />

      {/* Bulk edit dialog — key forces remount on open so form re-initializes from cache */}
      <BulkEditDialog key={String(bulkOpen)} open={bulkOpen} onClose={() => setBulkOpen(false)} />

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent
          className="sm:max-w-md"
          title={<>{t('dialogTitle')} — {editing && <FlagIcon flag={CURRENCY_META[editing.currencyCode]?.flag ?? '💱'} />} {editing?.currencyCode}</>}
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
              <InputNumber
                min={0}
                precision={2}
                value={form.rateToLak ? Number(form.rateToLak) : null}
                onChange={(v) => setForm((f) => ({ ...f, rateToLak: String(v ?? '') }))}
                style={{ width: '100%' }}
              />
            </Field>
            <Field>
              <FieldLabel>{t('columns.adjustment')}</FieldLabel>
              <InputNumber
                precision={2}
                value={form.adjustment ? Number(form.adjustment) : null}
                onChange={(v) => setForm((f) => ({ ...f, adjustment: String(v ?? '') }))}
                style={{ width: '100%' }}
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
