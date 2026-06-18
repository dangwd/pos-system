'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Select } from 'antd'
import { Separator } from '@/components/ui/separator'

import { Skeleton } from '@/components/ui/skeleton'
import { useCloseShift, useShiftDetail } from '@/hooks/useSalesShift'
import { useCurrencies } from '@/hooks/useConfig'
import { cn } from '@/lib/utils'
import type { SalesShiftDetailDto, SalesShiftSummary } from '@/types/sales-shift'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DownCircleOutlined,
  FallOutlined,
  RiseOutlined,
  UpCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Input as AntInput } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  closingCashLak: z.string().min(1, 'Vui lòng nhập tiền mặt cuối ca'),
  closingBankLak: z.string().min(1, 'Vui lòng nhập số dư ngân hàng cuối ca'),
  closingAmounts: z.record(z.string(), z.string().optional()),
})
type FormValues = z.infer<typeof schema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLak(n: number): string { return n.toLocaleString('lo-LA') + ' ₭' }

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── DenomGrid ────────────────────────────────────────────────────────────────

function DenomGrid({
  denominations, qty, symbol, disabled, onChange,
}: {
  denominations: number[]
  qty: Record<number, number>
  symbol: string
  disabled?: boolean
  onChange: (denom: number, value: number) => void
}) {
  const pairs = denominations.reduce<[number, number | undefined][]>((acc, d, i) => {
    if (i % 2 === 0) acc.push([d, denominations[i + 1]])
    return acc
  }, [])
  return (
    <div>
      {pairs.map(([left, right]) => (
        <div key={left} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 5 }}>
          {([left, right] as (number | undefined)[]).map((d) => {
            if (d === undefined) return <div key="empty" />
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#374151', minWidth: 80, flexShrink: 0 }}>
                  {d.toLocaleString()} {symbol}
                </span>
                <AntInput
                  size="small" type="number" min={0} value={qty[d] ?? 0} disabled={disabled}
                  onChange={(e) => onChange(d, parseInt(e.target.value) || 0)}
                  style={{ width: 60, textAlign: 'right' }}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, signed, accent, bg, icon }: {
  label: string; value: number; signed?: boolean
  accent: string; bg: string; icon: React.ReactNode
}) {
  return (
    <div style={{ background: bg, border: '1px solid', borderColor: accent + '33', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 88 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>{label}</span>
        <span style={{ fontSize: 14, color: accent, opacity: 0.6 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {signed && value > 0 ? '−' : ''}{fmtLak(Math.abs(value))}
      </div>
    </div>
  )
}

// ─── KPI Panel ────────────────────────────────────────────────────────────────

function KpiPanel({ summary, isLoading }: { summary?: SalesShiftSummary; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-22 rounded-xl" />)}</div>
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  }
  if (!summary) return null
  const s = summary
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Hoạt động trong ca</p>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Bán hàng"  value={s.banHangTotal}  accent="#16a34a" bg="#f0fdf4" icon={<RiseOutlined />} />
        <KpiCard label="Mua hàng"  value={s.muaHangTotal}  accent="#dc2626" bg="#fff1f2" icon={<FallOutlined />} signed />
        <KpiCard label="Phiếu thu" value={s.phieuThuTotal} accent="#0891b2" bg="#f0fdfa" icon={<UpCircleOutlined />} />
        <KpiCard label="Phiếu chi" value={s.phieuChiTotal} accent="#ea580c" bg="#fff7ed" icon={<DownCircleOutlined />} signed />
      </div>
      <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>Tồn quỹ dự kiến</p>
          <p style={{ fontSize: 10, color: '#7c3aed', opacity: 0.55, marginTop: 2 }}>Đầu ca + Thu TM − Chi TM</p>
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#5b21b6', fontVariantNumeric: 'tabular-nums' }}>{fmtLak(s.netCashMovement)}</p>
      </div>
      {s.doiHangTotal !== 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>Đổi hàng (chênh lệch)</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#92400e', fontVariantNumeric: 'tabular-nums' }}>{fmtLak(s.doiHangTotal)}</p>
        </div>
      )}
    </div>
  )
}

// ─── Post-close summary ───────────────────────────────────────────────────────

function SumRow({ label, value, indent, type = 'neutral' }: { label: string; value: number; indent?: boolean; type?: 'income' | 'expense' | 'neutral' }) {
  return (
    <div className={cn('flex justify-between items-center py-1', indent && 'pl-4')}>
      <span className={cn('text-xs', indent ? 'text-muted-foreground' : 'text-sm font-medium')}>{label}</span>
      <span className={cn('text-xs tabular-nums font-semibold', type === 'income' && 'text-green-600', type === 'expense' && 'text-destructive')}>
        {type === 'expense' && value > 0 ? '−' : ''} {fmtLak(value)}
      </span>
    </div>
  )
}

function ShiftSummaryView({ data, onClose }: { data: SalesShiftDetailDto; onClose: () => void }) {
  const s = data.summary
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
        <CheckCircleOutlined className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Ca đã đóng thành công</p>
          <p className="text-xs text-green-600">{data.shiftCode}</p>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2">
          <UpCircleOutlined className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thu</span>
        </div>
        <div className="px-4 pb-1 divide-y divide-border/50">
          <SumRow label="Bán hàng" value={s.banHangTotal} type="income" />
          {s.banHangCash > 0 && <SumRow label="Tiền mặt" value={s.banHangCash} indent />}
          {s.banHangBank > 0 && <SumRow label="Chuyển khoản" value={s.banHangBank} indent />}
          {s.phieuThuTotal > 0 && <SumRow label="Phiếu thu" value={s.phieuThuTotal} type="income" />}
          {s.doiHangTotal !== 0 && <SumRow label="Đổi hàng (chênh lệch)" value={Math.abs(s.doiHangTotal)} />}
        </div>
        <Separator />
        <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2">
          <DownCircleOutlined className="h-4 w-4 text-destructive" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chi</span>
        </div>
        <div className="px-4 pb-1 divide-y divide-border/50">
          <SumRow label="Mua hàng" value={s.muaHangTotal} type="expense" />
          {s.phieuChiTotal > 0 && <SumRow label="Phiếu chi" value={s.phieuChiTotal} type="expense" />}
        </div>
      </div>
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-5 py-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Tồn quỹ dự kiến</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Đầu ca + Thu tiền mặt − Chi tiền mặt</p>
        </div>
        <p className="text-lg font-bold text-primary">{fmtLak(s.netCashMovement)}</p>
      </div>
      {data.closingCashLak !== null && (
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <WalletOutlined className="h-3.5 w-3.5" />
            Tiền mặt thực tế đếm được
          </span>
          <span className="font-semibold text-sm">{fmtLak(data.closingCashLak)}</span>
        </div>
      )}
      {data.currencyBalances.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/40 px-4 py-2 flex items-center gap-2">
            <BankOutlined className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngoại tệ</span>
          </div>
          <div className="divide-y divide-border/60">
            {data.currencyBalances.map((b) => (
              <div key={b.currency} className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-mono font-semibold">{b.currency}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                  <span>Đầu: {b.openingAmount.toLocaleString()}</span>
                  {b.closingAmount !== null && (
                    <><span>→</span><span className="font-semibold text-foreground">Cuối: {b.closingAmount.toLocaleString()}</span></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Button className="w-full" onClick={onClose}>Xong</Button>
    </div>
  )
}

// ─── CloseShiftModal ──────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  shiftId: string
  shiftCode: string
  counterName: string
  openedAt: string
  openingCashLak: number
}

export function CloseShiftModal({ open, onClose, shiftId, shiftCode, counterName, openedAt, openingCashLak }: Props) {
  const [closedData, setClosedData] = useState<SalesShiftDetailDto | null>(null)
  const [extraFx, setExtraFx] = useState<string[]>([])

  // Denomination state
  const [lakQty, setLakQty] = useState<Record<number, number>>({})
  const [fxQty, setFxQty] = useState<Record<string, Record<number, number>>>({})

  const { data: shiftDetail, isLoading: detailLoading } = useShiftDetail(shiftId)
  const { data: allCurrencies = [] } = useCurrencies()
  const currencyMeta = new Map(allCurrencies.map((c) => [c.code, c]))

  const lakCurrency = allCurrencies.find((c) => c.code === 'LAK')
  const lakDenoms = useMemo(() => (lakCurrency?.denominations ?? []).map((d) => d.value), [lakCurrency])
  const lakHasDenoms = lakDenoms.length > 0

  const shiftFxBalances = shiftDetail?.currencyBalances?.filter((b) => b.currency !== 'LAK') ?? []
  const openingMap = new Map(shiftFxBalances.map((b) => [b.currency, b.openingAmount]))
  const foreignCurrencies = shiftFxBalances.map((b) => ({
    code: b.currency,
    name: currencyMeta.get(b.currency)?.name ?? b.currency,
    symbol: currencyMeta.get(b.currency)?.symbol ?? b.currency,
    flag: currencyMeta.get(b.currency)?.flag,
    denominations: currencyMeta.get(b.currency)?.denominations ?? [],
  }))

  const addableCurrencies = allCurrencies.filter(
    (c) => c.isActive && c.code !== 'LAK' && !openingMap.has(c.code) && !extraFx.includes(c.code),
  )

  const allTableFx = [
    ...foreignCurrencies,
    ...extraFx.map((code) => ({
      code,
      name: currencyMeta.get(code)?.name ?? code,
      symbol: currencyMeta.get(code)?.symbol ?? code,
      flag: currencyMeta.get(code)?.flag,
      denominations: currencyMeta.get(code)?.denominations ?? [],
    })),
  ]

  const fxWithDenoms = allTableFx.filter((c) => c.denominations.length > 0)

  // Auto-computed totals
  const lakComputed = useMemo(
    () => Object.entries(lakQty).reduce((sum, [v, q]) => sum + Number(v) * q, 0),
    [lakQty],
  )
  const fxComputed = useMemo(
    () =>
      Object.fromEntries(
        allTableFx.map((c) => [
          c.code,
          Object.entries(fxQty[c.code] ?? {}).reduce((sum, [v, q]) => sum + Number(v) * q, 0),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fxQty, allTableFx.map((c) => c.code).join(',')],
  )

  const { mutate: closeShift, isPending } = useCloseShift((data) => setClosedData(data))

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { closingCashLak: '', closingBankLak: '0', closingAmounts: {} },
  })

  // Sync LAK denomination total → form field
  useEffect(() => {
    if (!lakHasDenoms) return
    setValue('closingCashLak', String(lakComputed), { shouldValidate: false })
  }, [lakComputed, lakHasDenoms, setValue])

  // Sync FX denomination totals → form fields
  useEffect(() => {
    for (const c of fxWithDenoms) {
      const total = fxComputed[c.code] ?? 0
      if (total > 0) setValue(`closingAmounts.${c.code}`, String(total), { shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fxComputed, setValue])

  const handleClose = () => {
    reset({ closingCashLak: '', closingBankLak: '0', closingAmounts: {} })
    setClosedData(null)
    setExtraFx([])
    setLakQty({})
    setFxQty({})
    onClose()
  }

  const onSubmit = (values: FormValues) => {
    const cash = lakHasDenoms
      ? lakComputed
      : parseInt(values.closingCashLak.replace(/[^0-9]/g, ''), 10)
    if (isNaN(cash) || cash < 0) return

    const bank = parseInt(values.closingBankLak.replace(/[^0-9]/g, ''), 10) || 0

    const lakDenominations = lakHasDenoms
      ? Object.entries(lakQty).filter(([, q]) => q > 0).map(([v, q]) => ({ value: Number(v), quantity: q }))
      : undefined

    const foreignCurrencyBalances = allTableFx
      .filter((c) => { const v = values.closingAmounts[c.code]; return v && parseFloat(v) > 0 })
      .map((c) => {
        const denomList = Object.entries(fxQty[c.code] ?? {})
          .filter(([, q]) => q > 0)
          .map(([v, q]) => ({ value: Number(v), quantity: q }))
        return {
          currency: c.code,
          closingAmount: parseFloat(values.closingAmounts[c.code]!),
          denominations: denomList.length > 0 ? denomList : undefined,
        }
      })

    closeShift({
      id: shiftId,
      dto: {
        closingCashLak: cash,
        closingBankLak: bank,
        lakDenominations,
        foreignCurrencyBalances: foreignCurrencyBalances.length > 0 ? foreignCurrencyBalances : undefined,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-6xl"
        title={
          <span className="flex items-center gap-2 font-semibold">
            <ClockCircleOutlined className="h-4 w-4 text-primary" />
            Chốt Ca Bán Hàng
          </span>
        }
        footer={null}
      >
        {closedData ? (
          <ShiftSummaryView data={closedData} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Row 1: KPI (trái) + Thông tin ca / LAK (phải) ── */}
            <div className="grid grid-cols-[1fr_380px] gap-6">

              {/* Cột trái: KPI */}
              <KpiPanel summary={shiftDetail?.summary} isLoading={detailLoading} />

              {/* ── Cột phải: Thông tin ca + Form chốt ── */}
              <div className="space-y-4">
                {/* Thông tin ca */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Thông tin ca</p>
                  <div className="rounded-xl border bg-muted/30 divide-y divide-border/60">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">Mã ca</span>
                      <span className="text-xs font-mono font-bold">{shiftCode}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">Quầy</span>
                      <span className="text-xs font-medium">{counterName}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">Mở ca lúc</span>
                      <span className="text-xs">{openedAt ? fmtDatetime(openedAt) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RiseOutlined className="h-3 w-3 text-green-600" />
                        Tiền mặt đầu ca
                      </span>
                      <span className="text-xs font-semibold">{fmtLak(openingCashLak)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BankOutlined className="h-3 w-3 text-blue-500" />
                        Ngân hàng đầu ca
                      </span>
                      <span className="text-xs font-semibold">
                        {shiftDetail ? fmtLak(shiftDetail.openingBankLak) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tiền mặt cuối ca */}
                <Field>
                  <FieldLabel>
                    <FallOutlined className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                    Tiền mặt thực tế cuối ca (₭)
                    <span className="text-destructive ml-0.5">*</span>
                  </FieldLabel>

                  {lakHasDenoms ? (
                    /* Denomination grid → tổng auto-calc */
                    <div className="rounded-xl border overflow-hidden">
                      <div className="bg-muted/50 border-b px-3 py-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Chi tiết mệnh giá ₭</span>
                      </div>
                      <div className="p-3 max-h-52 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                        <DenomGrid
                          denominations={lakDenoms}
                          qty={lakQty}
                          symbol="₭"
                          onChange={(d, q) => setLakQty((prev) => ({ ...prev, [d]: q }))}
                        />
                      </div>
                      <div className="bg-primary/5 border-t px-3 py-2 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Tổng tiền cuối ca</span>
                        <span className="text-sm font-bold text-primary tabular-nums">{lakComputed.toLocaleString('lo-LA')} ₭</span>
                      </div>
                    </div>
                  ) : (
                    <Controller
                      control={control}
                      name="closingCashLak"
                      render={({ field }) => (
                        <InputNumber
                          value={field.value ? Number(field.value) : null}
                          onChange={(v) => field.onChange(String(v ?? ''))}
                          placeholder="0"
                          min={0}
                          suffix={<span className="text-xs font-semibold text-muted-foreground">₭</span>}
                          status={errors.closingCashLak ? 'error' : undefined}
                          style={{ width: '100%' }}
                        />
                      )}
                    />
                  )}
                  {errors.closingCashLak && <FieldError>{errors.closingCashLak.message}</FieldError>}
                </Field>

                {/* Số dư ngân hàng cuối ca */}
                <Field>
                  <FieldLabel>
                    <BankOutlined className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                    Số dư ngân hàng cuối ca (₭)
                    <span className="text-destructive ml-0.5">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="closingBankLak"
                    render={({ field }) => (
                      <InputNumber
                        value={field.value ? Number(field.value) : null}
                        onChange={(v) => field.onChange(String(v ?? '0'))}
                        placeholder="0"
                        min={0}
                        suffix={<span className="text-xs font-semibold text-muted-foreground">₭</span>}
                        status={errors.closingBankLak ? 'error' : undefined}
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                  {errors.closingBankLak && <FieldError>{errors.closingBankLak.message}</FieldError>}
                </Field>
              </div>
            </div>

            {/* ── Row 2: Ngoại tệ cuối ca — full width ── */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <BankOutlined className="mr-1" />
                  Ngoại tệ cuối ca
                  <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
                    Để trống nếu không có
                  </span>
                </p>
                {addableCurrencies.length > 0 && (
                  <Select
                    placeholder="+ Thêm ngoại tệ"
                    size="small"
                    style={{ width: 170 }}
                    options={addableCurrencies.map((c) => ({
                      label: `${c.flag ?? '💱'} ${c.code} — ${c.name}`,
                      value: c.code,
                    }))}
                    value={null}
                    onChange={(code: string) => setExtraFx((prev) => [...prev, code])}
                    showSearch
                  />
                )}
              </div>
              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-[32px_64px_1fr_80px_160px_24px] bg-muted/50 border-b">
                  <div className="px-2 py-2" />
                  <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Mã</div>
                  <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Tên tiền tệ</div>
                  <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-right">Đầu ca</div>
                  <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-right">Cuối ca</div>
                  <div />
                </div>
                {detailLoading ? (
                  <div className="divide-y divide-border/60">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="grid grid-cols-[32px_64px_1fr_80px_160px_24px] items-center py-3 px-2 gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-12 ml-auto" />
                        <Skeleton className="h-8 w-full" />
                        <div />
                      </div>
                    ))}
                  </div>
                ) : allTableFx.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Chưa có ngoại tệ nào</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {allTableFx.map((c) => {
                      const isExtra = extraFx.includes(c.code)
                      return (
                        <div key={c.code} className="grid grid-cols-[32px_64px_1fr_80px_160px_24px] items-center py-1.5 hover:bg-muted/30 transition-colors">
                          <div className="px-2 text-center text-base leading-none select-none">{c.flag ?? '💱'}</div>
                          <div className="px-2 font-mono font-bold text-sm">{c.code}</div>
                          <div className="px-2 text-sm text-muted-foreground truncate">{c.name}</div>
                          <div className="px-2 text-xs tabular-nums text-muted-foreground text-right">
                            {openingMap.has(c.code) ? openingMap.get(c.code)?.toLocaleString() : '—'}
                          </div>
                          <div className="px-2">
                            <Controller
                              control={control}
                              name={`closingAmounts.${c.code}`}
                              render={({ field }) => (
                                <InputNumber
                                  value={field.value ? Number(field.value) : null}
                                  onChange={(v) => field.onChange(v != null ? String(v) : '')}
                                  placeholder="0"
                                  min={0}
                                  suffix={<span className="text-xs font-semibold text-muted-foreground select-none">{c.symbol}</span>}
                                  style={{ width: '100%' }}
                                />
                              )}
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            {isExtra && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => setExtraFx((prev) => prev.filter((x) => x !== c.code))}
                              >
                                <CloseOutlined style={{ fontSize: 10 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Row 3: Mệnh giá ngoại tệ — full width ── */}
            {fxWithDenoms.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {fxWithDenoms.map((c) => (
                  <div key={c.code} className="rounded-xl border overflow-hidden">
                    <div className="bg-muted/50 border-b px-3 py-2 flex items-center gap-2">
                      <span className="text-base leading-none">{c.flag ?? '💱'}</span>
                      <span className="font-mono font-bold text-xs text-primary">{c.code}</span>
                      <span className="text-xs text-muted-foreground">{c.name}</span>
                    </div>
                    <div className="p-3">
                      <DenomGrid
                        denominations={c.denominations.map((d) => d.value)}
                        qty={fxQty[c.code] ?? {}}
                        symbol={c.symbol}
                        onChange={(d, q) =>
                          setFxQty((prev) => ({
                            ...prev,
                            [c.code]: { ...(prev[c.code] ?? {}), [d]: q },
                          }))
                        }
                      />
                    </div>
                    {(fxComputed[c.code] ?? 0) > 0 && (
                      <div className="bg-primary/5 border-t px-3 py-1.5 flex justify-between">
                        <span className="text-xs text-muted-foreground">Tổng</span>
                        <span className="text-xs font-bold text-primary tabular-nums">
                          {fxComputed[c.code].toLocaleString()} {c.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border">
              <DialogFooter>
                <Button variant="outline" type="button" onClick={handleClose} disabled={isPending}>Hủy</Button>
                <Button variant="destructive" type="submit" loading={isPending}>Chốt Ca</Button>
              </DialogFooter>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
