'use client'

import { useState, useEffect } from 'react'
import { useActiveTab } from '@/hooks/useActiveTab'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Select } from 'antd'
import type { ExchangeRate } from '@/types/config'
import { ArrowDown, ArrowLeftRight, RefreshCw } from 'lucide-react'

function getRateLak(currency: string, rates: ExchangeRate[]): number {
  if (currency === 'LAK') return 1
  return rates.find(r => r.currencyCode === currency)?.effectiveRate ?? 1
}

export function CurrencyExchangeForm() {
  const { tab, setFxData } = useActiveTab()
  const { data: rates = [], isLoading } = useExchangeRates()

  const [fromCurrency, setFromCurrency] = useState(tab?.fxFromCurrency ?? 'USD')
  const [toCurrency, setToCurrency] = useState(tab?.fxToCurrency ?? 'LAK')
  const [fromInput, setFromInput] = useState(
    tab?.fxFromAmount ? String(tab.fxFromAmount) : ''
  )

  const currencies = ['LAK', ...rates.map(r => r.currencyCode)]
  const fromRateLak = getRateLak(fromCurrency, rates)
  const toRateLak = getRateLak(toCurrency, rates)
  const crossRate = toRateLak > 0 ? fromRateLak / toRateLak : 0

  const fromAmount = parseFloat(fromInput) || 0
  const toAmount = fromAmount * crossRate
  const lakAmount = Math.round(fromAmount * fromRateLak)

  useEffect(() => {
    setFxData(fromCurrency, toCurrency, fromAmount, toAmount, lakAmount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, fromAmount])

  const handleFromCurrencyChange = (curr: string) => {
    setFromCurrency(curr)
    if (curr === toCurrency) {
      setToCurrency(curr === 'LAK' ? (rates[0]?.currencyCode ?? 'USD') : 'LAK')
    }
  }

  const handleToCurrencyChange = (curr: string) => {
    setToCurrency(curr)
    if (curr === fromCurrency) {
      setFromCurrency(curr === 'LAK' ? (rates[0]?.currencyCode ?? 'USD') : 'LAK')
    }
  }

  const swap = () => {
    const prev = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(prev)
    setFromInput('')
  }

  const toDisplay = toAmount > 0
    ? toCurrency === 'LAK'
      ? Math.round(toAmount).toLocaleString('lo-LA')
      : toAmount.toLocaleString('en', { maximumFractionDigits: 6 })
    : ''

  const currencyOptions = (exclude: string) =>
    currencies
      .filter(c => c !== exclude)
      .map(c => ({ value: c, label: c }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Đang tải tỷ giá...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header label ── */}
      <div className="px-4 pt-4 pb-3 border-b shrink-0 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Thu đổi ngoại tệ
        </p>

        {/* ── Amount row ── */}
        <div className="flex items-end gap-2">

          {/* FROM */}
          <div className="flex-1 space-y-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Tiền khách đưa
            </p>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={fromInput}
                onChange={e => setFromInput(e.target.value)}
                className="h-9 text-right font-mono font-bold tabular-nums text-sm flex-1 min-w-0"
                autoFocus
              />
              <Select
                value={fromCurrency}
                onChange={handleFromCurrencyChange}
                options={currencyOptions(toCurrency)}
                style={{ width: 80 }}
                size="middle"
                className="shrink-0"
                popupMatchSelectWidth={false}
              />
            </div>
          </div>

          {/* Swap button */}
          <button
            type="button"
            onClick={swap}
            title="Đổi chiều"
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors mb-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>

          {/* TO */}
          <div className="flex-1 space-y-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Tiền trả khách
            </p>
            <div className="flex gap-1.5">
              <Input
                readOnly
                value={toDisplay}
                placeholder="0"
                className="h-9 text-right font-mono font-bold tabular-nums text-sm flex-1 min-w-0 bg-muted/40 cursor-default"
              />
              <Select
                value={toCurrency}
                onChange={handleToCurrencyChange}
                options={currencyOptions(fromCurrency)}
                style={{ width: 80 }}
                size="middle"
                className="shrink-0"
                popupMatchSelectWidth={false}
              />
            </div>
          </div>
        </div>

        {/* ── Cross-rate label ── */}
        {crossRate > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            1{' '}
            <span className="font-semibold text-foreground">{fromCurrency}</span>
            {' = '}
            <span className="font-semibold text-foreground tabular-nums">
              {crossRate.toLocaleString('en', { maximumFractionDigits: 6 })}
            </span>
            {' '}
            <span className="font-semibold text-foreground">{toCurrency}</span>
          </p>
        )}
      </div>

      {/* ── Result card ── */}
      {fromAmount > 0 && (
        <div className="px-4 py-4 border-b shrink-0">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
            {/* From row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Khách đưa</span>
              <span className="font-bold tabular-nums">
                {fromAmount.toLocaleString('en', { maximumFractionDigits: 2 })}{' '}
                <span className="text-primary">{fromCurrency}</span>
              </span>
            </div>

            {/* Arrow */}
            <div className="flex justify-center my-2">
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>

            {/* To row — big */}
            <div className="text-center">
              <p className="text-3xl font-black tabular-nums tracking-tight leading-none text-foreground">
                {toDisplay}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {toCurrency === 'LAK' ? '₭ Kip Lào' : toCurrency}
              </p>
            </div>

            {/* LAK equivalent (only when cross-rate, i.e. to != LAK) */}
            {toCurrency !== 'LAK' && lakAmount > 0 && (
              <p className="text-[10px] text-muted-foreground text-center mt-2.5 border-t border-primary/10 pt-2">
                Tương đương:{' '}
                <span className="font-semibold text-foreground">
                  {lakAmount.toLocaleString('lo-LA')} ₭
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Rate table ── */}
      {rates.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Bảng tỷ giá hiện hành
          </p>
          <div className="space-y-1">
            {rates.map(r => {
              const isActive = fromCurrency === r.currencyCode || toCurrency === r.currencyCode
              return (
                <div
                  key={r.currencyCode}
                  className={cn(
                    'flex justify-between items-center text-xs px-3 py-2 rounded-md border',
                    isActive
                      ? 'bg-primary/10 border-primary/30 font-semibold'
                      : 'bg-background border-border',
                  )}
                >
                  <span className="font-mono font-bold text-primary">{r.currencyCode}</span>
                  <span className="tabular-nums text-muted-foreground">
                    1 {r.currencyCode} = {r.effectiveRate.toLocaleString('lo-LA')} ₭
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
