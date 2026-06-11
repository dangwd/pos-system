'use client'

import { useState, useEffect } from 'react'
import { useActiveTab } from '@/hooks/useActiveTab'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ExchangeRate } from '@/types/config'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'

function effectiveRate(r: ExchangeRate) { return r.rateToLak + r.adjustment }

function getRateLak(currency: string, rates: ExchangeRate[]): number {
  if (currency === 'LAK') return 1
  const r = rates.find(r => r.currencyCode === currency)
  return r ? effectiveRate(r) : 1
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
    if (curr === toCurrency) setToCurrency(curr === 'LAK' ? (rates[0]?.currencyCode ?? 'USD') : 'LAK')
  }

  const handleToCurrencyChange = (curr: string) => {
    setToCurrency(curr)
    if (curr === fromCurrency) setFromCurrency(curr === 'LAK' ? (rates[0]?.currencyCode ?? 'USD') : 'LAK')
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

      {/* ── Nhập số tiền ── */}
      <div className="px-4 py-3 border-b shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
          Thu đổi ngoại tệ
        </p>

        <div className="grid grid-cols-[1fr_32px_1fr] gap-2 items-end">

          {/* FROM */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tiền khách đưa</p>
            <div className="flex gap-1">
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={fromInput}
                onChange={e => setFromInput(e.target.value)}
                className="text-right font-mono font-bold tabular-nums h-8 flex-1 text-sm"
                autoFocus
              />
              <Select value={fromCurrency} onValueChange={handleFromCurrencyChange}>
                <SelectTrigger size="sm" className="min-w-16 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.filter(c => c !== toCurrency).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap */}
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={swap}
              title="Đổi chiều"
              className="h-8 w-8"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

          {/* TO — readonly */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tiền trả khách</p>
            <div className="flex gap-1">
              <Input
                readOnly
                value={toDisplay}
                placeholder="0"
                className="text-right font-mono font-bold tabular-nums h-8 flex-1 text-sm bg-muted/30 cursor-default"
              />
              <Select value={toCurrency} onValueChange={handleToCurrencyChange}>
                <SelectTrigger size="sm" className="min-w-16 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.filter(c => c !== fromCurrency).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tỷ giá chéo */}
        {fromAmount > 0 && crossRate > 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            1 <span className="font-bold text-foreground">{fromCurrency}</span>
            {' '}={' '}
            <span className="font-bold text-foreground tabular-nums">
              {crossRate.toLocaleString('en', { maximumFractionDigits: 6 })}
            </span>{' '}
            <span className="font-bold text-foreground">{toCurrency}</span>
          </p>
        )}
      </div>

      {/* ── Kết quả quy đổi ── */}
      {fromAmount > 0 && (
        <div className="px-4 py-3 border-b shrink-0">
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
              {fromAmount.toLocaleString('en', { maximumFractionDigits: 2 })} {fromCurrency} →
            </p>
            <p className="text-3xl font-black tabular-nums tracking-tight leading-none text-foreground">
              {toDisplay}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{toCurrency}</p>
            {toCurrency !== 'LAK' && lakAmount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Tương đương: <span className="font-semibold text-foreground">{lakAmount.toLocaleString('lo-LA')} ₭</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Bảng tỷ giá ── */}
      {rates.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Bảng tỷ giá hiện hành
          </p>
          <div className="space-y-1">
            {rates.map(r => {
              const rate = effectiveRate(r)
              const isActive = fromCurrency === r.currencyCode || toCurrency === r.currencyCode
              return (
                <div key={r.currencyCode}
                  className={cn(
                    'flex justify-between items-center text-xs px-3 py-2 rounded-md border',
                    isActive ? 'bg-primary/10 border-primary/30 font-semibold' : 'bg-background',
                  )}
                >
                  <span className="font-mono font-bold text-primary">{r.currencyCode}</span>
                  <span className="tabular-nums text-muted-foreground">
                    1 {r.currencyCode} = {rate.toLocaleString('lo-LA')} ₭
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
