'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCloseShift } from '@/hooks/useSalesShift'
// import { useLiveShiftDetail } from '@/hooks/useSalesShift' // TODO: bật lại
import { useCurrencies } from '@/hooks/useConfig'
import { cn } from '@/lib/utils'
import type { SalesShiftDetailDto } from '@/types/sales-shift'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BankOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  MinusOutlined,
  PlusOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FlagIcon } from '@/components/shared/FlagIcon'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLak(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }


function getTimePeriod() {
  const h = new Date().getHours()
  if (h < 12) return 'Sáng'
  if (h < 18) return 'Chiều'
  return 'Tối'
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  closingCashLak: z.string().min(1, 'Vui lòng nhập tiền mặt cuối ca'),
  closingBankLak: z.string(),
  closingAmounts: z.record(z.string(), z.string().optional()),
})
type FormValues = z.infer<typeof schema>

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ value, disabled, onChange }: {
  value: number; disabled?: boolean; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center">
      <button type="button" disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 flex items-center justify-center rounded-l-md border border-border bg-muted/60 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
      >
        <MinusOutlined style={{ fontSize: 10 }} />
      </button>
      <input type="number" min={0} value={value} disabled={disabled}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="h-8 w-14 border-y border-border bg-background text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 flex items-center justify-center rounded-r-md border border-border bg-muted/60 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
      >
        <PlusOutlined style={{ fontSize: 10 }} />
      </button>
    </div>
  )
}

// ─── DenomTable ───────────────────────────────────────────────────────────────

function DenomTable({ denominations, qty, symbol, currencyName, disabled, onChange }: {
  denominations: number[]
  qty: Record<number, number>
  symbol: string
  currencyName: string
  disabled?: boolean
  onChange: (denom: number, qty: number) => void
}) {
  const sorted = useMemo(() => [...denominations].sort((a, b) => b - a), [denominations])
  const totalCount = useMemo(() => Object.values(qty).reduce((s, q) => s + q, 0), [qty])
  const totalAmount = useMemo(
    () => Object.entries(qty).reduce((s, [v, q]) => s + Number(v) * q, 0), [qty],
  )
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_180px_140px] bg-muted/50 border-b">
        <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mệnh giá</div>
        <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Số lượng (tờ / đồng)</div>
        <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Thành tiền</div>
      </div>
      <div className="flex-1 divide-y divide-border/50">
        {sorted.map((d) => {
          const count = qty[d] ?? 0
          return (
            <div key={d} className={cn('grid grid-cols-[1fr_180px_140px] items-center hover:bg-muted/20 transition-colors', count > 0 && 'bg-primary/3')}>
              <div className="px-5 py-3 flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">{d.toLocaleString()}</span>
                <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full border border-border bg-muted text-[9px] font-bold text-muted-foreground leading-none shrink-0">
                  {symbol}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-center">
                <Stepper value={count} disabled={disabled} onChange={(v) => onChange(d, v)} />
              </div>
              <div className="px-5 py-3 text-right">
                {count > 0
                  ? <span className="text-sm font-semibold tabular-nums text-primary">{symbol} {(d * count).toLocaleString()}</span>
                  : <span className="text-sm tabular-nums text-muted-foreground/30">{symbol} 0</span>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-[1fr_180px_140px] items-center bg-muted/30 border-t">
        <div className="px-5 py-3">
          <span className="text-sm font-semibold">Tổng tiền mặt — {currencyName}</span>
        </div>
        <div className="px-4 py-3 text-center">
          {totalCount > 0 && <span className="text-xs text-muted-foreground">{totalCount.toLocaleString()} tờ</span>}
        </div>
        <div className="px-5 py-3 text-right">
          <span className="text-base font-bold tabular-nums text-primary">{symbol} {totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// TODO: LakReconcilePanel + FxReconcilePanel đã bị ẩn — xem git history để restore

// ─── Post-close Summary ───────────────────────────────────────────────────────

function ShiftSummaryView({ data, onClose }: { data: SalesShiftDetailDto; onClose: () => void }) {
  const s = data.summary
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
        <CheckCircleOutlined className="text-green-600 shrink-0" style={{ fontSize: 18 }} />
        <div>
          <p className="text-sm font-semibold text-green-800">Ca đã đóng thành công</p>
          <p className="text-xs text-green-600 font-mono mt-0.5">{data.shiftCode}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Doanh thu', value: fmtLak(s.banHangTotal), color: 'text-green-600' },
          { label: 'Chi phí', value: fmtLak(s.phieuChiTotal + s.muaHangTotal), color: 'text-red-600' },
          { label: 'Tiền mặt đóng ca', value: fmtLak(data.closingCashLak ?? 0), color: 'text-foreground' },
          { label: 'Ngân hàng đóng ca', value: fmtLak(data.closingBankLak ?? 0), color: 'text-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-muted/40 border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn('text-sm font-bold mt-1 tabular-nums', color)}>{value}</p>
          </div>
        ))}
      </div>
      {data.currencyBalances.filter((b) => b.currency !== 'LAK').length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ngoại tệ</div>
          <div className="divide-y">
            {data.currencyBalances.filter((b) => b.currency !== 'LAK').map((b) => (
              <div key={b.currency} className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-mono font-semibold">{b.currency}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {b.openingAmount.toLocaleString()} → <span className="font-semibold text-foreground">{b.closingAmount?.toLocaleString() ?? '—'}</span>
                </span>
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

export function CloseShiftModal({ open, onClose, shiftId, shiftCode, counterName, openingCashLak }: Props) {
  const [closedData, setClosedData] = useState<SalesShiftDetailDto | null>(null)
  const [activeTab, setActiveTab] = useState('LAK')
  const [activeLakMode, setActiveLakMode] = useState<'cash' | 'bank'>('cash')
  const [lakQty, setLakQty] = useState<Record<number, number>>({})
  const [fxQty, setFxQty] = useState<Record<string, Record<number, number>>>({})
  const [now] = useState(() => new Date())

  // TODO: tạm ẩn nghiệp vụ ca hoạt động — bỏ comment khi bật lại
  // const { data: shiftDetail, refetch } = useLiveShiftDetail(open ? shiftId : null)
  // useEffect(() => { if (open) refetch() }, [open, refetch])

  const { data: allCurrencies = [] } = useCurrencies()
  // currencyMeta needed when FX tabs are re-enabled
  // const currencyMeta = useMemo(() => new Map(allCurrencies.map((c) => [c.code, c])), [allCurrencies])

  const lakCurrency = allCurrencies.find((c) => c.code === 'LAK')
  const lakDenoms = useMemo(() => (lakCurrency?.denominations ?? []).map((d) => d.value), [lakCurrency])
  const lakHasDenoms = lakDenoms.length > 0

  // TODO: FX balances sẽ lấy từ shiftDetail khi bật lại
  // const shiftFxBalances = (shiftDetail?.currencyBalances ?? []).filter((b) => b.currency !== 'LAK')
  const allTabs = useMemo(() => [
    {
      code: 'LAK',
      name: lakCurrency?.name ?? 'Kíp Lào',
      flag: lakCurrency?.flag ?? '🇱🇦',
      symbol: lakCurrency?.symbol ?? '₭',
      denominations: lakDenoms,
      openingAmount: openingCashLak,
    },
    // TODO: bỏ comment để thêm FX tabs từ shiftDetail
    // ...shiftFxBalances.map((b) => { ... })
  ], [lakCurrency, lakDenoms, openingCashLak])

  const lakComputed = useMemo(
    () => Object.entries(lakQty).reduce((sum, [v, q]) => sum + Number(v) * q, 0), [lakQty],
  )
  const fxComputed = useMemo(
    () => Object.fromEntries(
      allTabs.filter((t) => t.code !== 'LAK').map((t) => [
        t.code,
        Object.entries(fxQty[t.code] ?? {}).reduce((sum, [v, q]) => sum + Number(v) * q, 0),
      ]),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fxQty, allTabs.map((t) => t.code).join(',')],
  )

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { closingCashLak: '', closingBankLak: '0', closingAmounts: {} },
  })

  const closingCashLakStr = useWatch({ control, name: 'closingCashLak' })
  const closingBankLakStr = useWatch({ control, name: 'closingBankLak' })
  // closingAmounts watched when FX reconcile panel is re-enabled
  // const closingAmounts = useWatch({ control, name: 'closingAmounts' })
  const closingBankLak = parseInt(closingBankLakStr || '0', 10) || 0
  const closingCashLakNum = parseInt(closingCashLakStr || '0', 10) || 0
  const effectiveLakCounted = lakHasDenoms ? lakComputed : closingCashLakNum

  useEffect(() => {
    if (lakHasDenoms) setValue('closingCashLak', String(lakComputed), { shouldValidate: false })
  }, [lakComputed, lakHasDenoms, setValue])

  // TODO: bỏ comment khi bật lại shiftDetail
  // useEffect(() => {
  //   if (shiftDetail?.openingBankLak)
  //     setValue('closingBankLak', String(shiftDetail.openingBankLak), { shouldValidate: false })
  // }, [shiftDetail?.openingBankLak, setValue])

  // TODO: bỏ comment khi FX tabs được bật lại
  // useEffect(() => {
  //   for (const tab of allTabs.filter((t) => t.code !== 'LAK' && t.denominations.length > 0)) {
  //     const total = fxComputed[tab.code] ?? 0
  //     if (total > 0) setValue(`closingAmounts.${tab.code}`, String(total), { shouldValidate: false })
  //   }
  // }, [fxComputed, setValue])

  const { mutate: closeShift, isPending } = useCloseShift((data) => setClosedData(data))

  const handleClose = () => {
    reset({ closingCashLak: '', closingBankLak: '0', closingAmounts: {} })
    setClosedData(null)
    setActiveTab('LAK')
    setActiveLakMode('cash')
    setLakQty({})
    setFxQty({})
    onClose()
  }

  const onSubmit = (values: FormValues) => {
    const cash = lakHasDenoms ? lakComputed : parseInt(values.closingCashLak.replace(/[^0-9]/g, ''), 10)
    if (isNaN(cash) || cash < 0) return

    const lakDenominations = lakHasDenoms
      ? Object.entries(lakQty).filter(([, q]) => q > 0).map(([v, q]) => ({ value: Number(v), quantity: q }))
      : undefined

    const foreignCurrencyBalances = allTabs
      .filter((t) => t.code !== 'LAK')
      .map((t) => {
        const closing = t.denominations.length > 0
          ? (fxComputed[t.code] ?? 0)
          : parseFloat(values.closingAmounts[t.code] ?? '0') || 0
        const denomEntries = Object.entries(fxQty[t.code] ?? {}).filter(([, q]) => q > 0)
        return {
          currency: t.code,
          closingAmount: closing,
          denominations: denomEntries.length > 0 ? denomEntries.map(([v, q]) => ({ value: Number(v), quantity: q })) : undefined,
        }
      })
      .filter((b) => b.closingAmount > 0)

    closeShift({
      id: shiftId,
      dto: {
        closingCashLak: cash,
        closingBankLak,
        lakDenominations,
        foreignCurrencyBalances: foreignCurrencyBalances.length > 0 ? foreignCurrencyBalances : undefined,
      },
    })
  }

  // TODO: bỏ comment khi bật lại nghiệp vụ ca
  // const summary = shiftDetail?.summary
  // const cashDiff = summary ? effectiveLakCounted - summary.netCashMovement : 0
  // const bankDiff = summary ? closingBankLak - summary.banHangBank : 0
  // const hasDiscrepancy = cashDiff !== 0 || bankDiff !== 0
  // const activeFxClosing = activeTab !== 'LAK'
  //   ? (activeCurrencyData?.denominations.length ?? 0) > 0
  //     ? (fxComputed[activeTab] ?? 0)
  //     : parseFloat(closingAmounts?.[activeTab] ?? '0') || 0
  //   : 0

  const activeCurrencyData = allTabs.find((t) => t.code === activeTab)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-7xl p-0"
        title={null}
        footer={null}
        showCloseButton={false}
      >
        {closedData ? (
          <div className="p-6">
            <ShiftSummaryView data={closedData} onClose={handleClose} />
          </div>
        ) : (
          <div
            className="flex flex-col gap-2.5 bg-muted/40 p-3 overflow-hidden"
            style={{ height: 'calc(100vh - 140px)', minHeight: 620 }}
          >
            {/* ── Info bar — 4 islands ── */}
            <div className="grid grid-cols-4 gap-2.5 shrink-0">
              {[
                {
                  label: 'Thu ngân',
                  content: (
                    // TODO: hiển thị userFullName + employeeCode từ shiftDetail khi bật lại
                    <span className="text-sm text-muted-foreground leading-none">—</span>
                  ),
                },
                {
                  label: 'Quầy / Cửa hàng',
                  content: (
                    <p className="text-sm font-semibold leading-none truncate">{counterName}</p>
                  ),
                },
                {
                  label: 'Mã ca',
                  content: <p className="text-sm font-mono font-bold leading-none">{shiftCode}</p>,
                },
                {
                  label: 'Giờ đóng ca',
                  content: (
                    <p className="text-sm font-semibold leading-none">
                      {formatTime(now)} <span className="font-normal text-muted-foreground">· {getTimePeriod()}</span>
                    </p>
                  ),
                },
              ].map(({ label, content }) => (
                <div key={label} className="rounded-xl bg-card border px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
                  {content}
                </div>
              ))}
            </div>

            {/* ── Currency tabs ── */}
            <div className="grid shrink-0 gap-2.5" style={{ gridTemplateColumns: `repeat(${allTabs.length}, 1fr)` }}>
              {allTabs.map((tab) => {
                const tabTotal = tab.code === 'LAK' ? effectiveLakCounted : (fxComputed[tab.code] ?? 0)
                const isActive = activeTab === tab.code
                return (
                  <button key={tab.code} type="button"
                    onClick={() => setActiveTab(tab.code)}
                    className={cn('rounded-xl border px-4 py-3 text-left transition-all',
                      isActive ? 'bg-card border-primary shadow-sm ring-1 ring-primary/20' : 'bg-card hover:bg-muted/60 border-border')}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <FlagIcon flag={tab.flag} className="text-sm leading-none select-none" />
                      <span className={cn('font-mono font-bold text-sm', isActive ? 'text-primary' : 'text-foreground')}>{tab.code}</span>
                      {/* TODO: hiển thị badge Khớp/Lệch khi bật lại nghiệp vụ */}
                    </div>
                    <div className={cn('text-base font-bold tabular-nums leading-none',
                      isActive ? 'text-primary' : tabTotal > 0 ? 'text-foreground' : 'text-muted-foreground/40')}>
                      {tab.symbol} {tabTotal.toLocaleString()}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 gap-2.5">
              <div className="flex flex-1 min-h-0 gap-2.5">

                {/* Left: denomination table */}
                <div className="flex-1 min-w-0 rounded-xl bg-card border overflow-y-auto">
                  {activeCurrencyData && (
                    <>
                      <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-card z-10">
                        <h2 className="text-sm font-semibold">Bảng mệnh giá · {activeCurrencyData.code}</h2>
                        <div className="flex items-center gap-2.5">
                          {activeTab === 'LAK' && activeCurrencyData.denominations.length > 0 && (
                            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 gap-0.5">
                              {(['cash', 'bank'] as const).map((mode) => (
                                <button key={mode} type="button"
                                  onClick={() => setActiveLakMode(mode)}
                                  className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all',
                                    activeLakMode === mode ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
                                  {mode === 'cash' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FlagIcon flag={activeCurrencyData.flag} className="select-none" />
                            <span>{activeCurrencyData.name}</span>
                          </div>
                        </div>
                      </div>

                      {activeTab === 'LAK' && activeLakMode === 'bank' ? (
                        <div className="p-5 space-y-4">
                          <div className="rounded-xl bg-muted/40 border p-4 flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium">Hệ thống ghi nhận</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Doanh thu POS · chuyển khoản</p>
                            </div>
                            <span className="text-sm font-bold tabular-nums text-muted-foreground">—</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                              <BankOutlined style={{ fontSize: 11 }} className="text-muted-foreground" />
                              Số dư ngân hàng cuối ca (₭)
                              <span className="text-destructive">*</span>
                            </p>
                            <Controller control={control} name="closingBankLak"
                              render={({ field }) => (
                                <InputNumber
                                  value={field.value ? Number(field.value) : null}
                                  onChange={(v) => field.onChange(String(v ?? '0'))}
                                  placeholder="0" min={0}
                                  suffix={<span className="text-xs font-semibold text-muted-foreground">₭</span>}
                                  style={{ width: '100%' }}
                                />
                              )}
                            />
                          </div>
                        </div>
                      ) : activeCurrencyData.denominations.length > 0 ? (
                        <DenomTable
                          denominations={activeCurrencyData.denominations}
                          qty={activeTab === 'LAK' ? lakQty : (fxQty[activeTab] ?? {})}
                          symbol={activeCurrencyData.symbol}
                          currencyName={activeCurrencyData.name}
                          onChange={(d, q) => {
                            if (activeTab === 'LAK') {
                              setLakQty((prev) => ({ ...prev, [d]: q }))
                            } else {
                              setFxQty((prev) => ({ ...prev, [activeTab]: { ...(prev[activeTab] ?? {}), [d]: q } }))
                            }
                          }}
                        />
                      ) : (
                        <div className="p-5 space-y-3">
                          <p className="text-xs text-muted-foreground">Nhập số dư cuối ca cho {activeCurrencyData.name}</p>
                          {activeTab === 'LAK' ? (
                            <>
                              <Controller control={control} name="closingCashLak"
                                render={({ field }) => (
                                  <InputNumber
                                    value={field.value ? Number(field.value) : null}
                                    onChange={(v) => field.onChange(String(v ?? ''))}
                                    placeholder="0" min={0}
                                    prefix={<WalletOutlined style={{ fontSize: 12, color: 'var(--muted-foreground)' }} />}
                                    suffix={<span className="text-xs font-bold text-muted-foreground">₭</span>}
                                    status={errors.closingCashLak ? 'error' : undefined}
                                    style={{ width: '100%' }}
                                  />
                                )}
                              />
                              {errors.closingCashLak && <FieldError>{errors.closingCashLak.message}</FieldError>}
                            </>
                          ) : (
                            <Controller control={control} name={`closingAmounts.${activeTab}`}
                              render={({ field }) => (
                                <InputNumber
                                  value={field.value ? Number(field.value) : null}
                                  onChange={(v) => field.onChange(v != null ? String(v) : '')}
                                  placeholder="0" min={0}
                                  suffix={<span className="text-xs font-semibold text-muted-foreground">{activeCurrencyData.symbol}</span>}
                                  style={{ width: '100%' }}
                                />
                              )}
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* TODO: panel đối chiếu — bật lại khi có shiftDetail */}
                {/* <div className="w-85 shrink-0 rounded-xl bg-card border overflow-y-auto flex flex-col">
                  ...LakReconcilePanel / FxReconcilePanel...
                </div> */}
              </div>

              {/* Bottom bar */}
              <div className="rounded-xl bg-card border shrink-0 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/60">Trạng thái:</span>
                  {/* TODO: hiển thị trạng thái Khớp/Lệch khi bật lại nghiệp vụ */}
                  <span className="text-xs text-muted-foreground">Kiểm tra trước khi chốt ca</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={handleClose} disabled={isPending} className="text-xs h-8">
                    Hủy
                  </Button>
                  <Button variant="outline" size="sm" type="button" disabled className="text-xs h-8">
                    Lưu nháp
                  </Button>
                  <Button size="sm" type="submit" loading={isPending} variant="destructive" className="text-xs h-8 gap-1.5">
                    <CheckOutlined style={{ fontSize: 10 }} />
                    Chốt & đóng ca
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
