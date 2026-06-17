'use client'

/**
 * CloseShiftModal — Chốt ca bán hàng.
 *
 * Trạng thái:
 *  'form'    → nhập closingCashLak + closing amounts ngoại tệ
 *  'summary' → tổng kết ca sau khi đóng thành công
 *
 * currencyBalances (prop): được truyền từ ShiftStatusBadge, là danh sách ngoại tệ
 * đã khai báo lúc mở ca — pre-populate form để cashier chỉ cần nhập closing amount.
 * Nếu không có (page reload), cashier có thể thêm tay.
 */

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCloseShift } from '@/hooks/useSalesShift'
import { cn } from '@/lib/utils'
import type { CurrencyBalance, SalesShiftDetailDto, SalesShiftSummary } from '@/types/sales-shift'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownCircleOutlined,
  FallOutlined,
  PlusOutlined,
  RiseOutlined,
  UpCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const schema = z.object({
  closingCashLak: z.string().min(1, 'Vui lòng nhập tiền mặt cuối ca'),
  foreignCurrencyBalances: z.array(
    z.object({
      currency: z.string().min(1, 'Nhập mã tiền tệ'),
      openingAmount: z.number().optional(),
      closingAmount: z.string().min(1, 'Nhập số lượng cuối ca'),
    })
  ).optional(),
})

type FormValues = z.infer<typeof schema>

function fmtLak(n: number): string {
  return n.toLocaleString('lo-LA') + ' ₭'
}

// ─── Summary view ─────────────────────────────────────────────────────────────

interface SumRowProps {
  label: string
  value: number
  indent?: boolean
  type?: 'income' | 'expense' | 'neutral'
}

function SumRow({ label, value, indent, type = 'neutral' }: SumRowProps) {
  return (
    <div className={cn('flex justify-between items-center py-1', indent && 'pl-4')}>
      <span className={cn('text-xs', indent ? 'text-muted-foreground' : 'text-sm font-medium')}>
        {label}
      </span>
      <span
        className={cn(
          'text-xs tabular-nums font-semibold',
          type === 'income' && 'text-green-600',
          type === 'expense' && 'text-destructive',
          type === 'neutral' && 'text-foreground',
        )}
      >
        {type === 'expense' && value > 0 ? '−' : ''} {fmtLak(value)}
      </span>
    </div>
  )
}

function ShiftSummaryView({
  data,
  onClose,
}: {
  data: SalesShiftDetailDto
  onClose: () => void
}) {
  const s: SalesShiftSummary = data.summary

  return (
    <div className="space-y-4">
      {/* Success header */}
      <div className="flex items-center gap-2.5 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
        <CheckCircleOutlined className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Ca đã đóng thành công</p>
          <p className="text-xs text-green-600">{data.shiftCode}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2">
          <UpCircleOutlined className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thu</span>
        </div>
        <div className="px-4 pb-1 divide-y divide-border/50">
          <SumRow label="Bán hàng" value={s.banHangTotal} type="income" />
          {s.banHangCash > 0 && <SumRow label="Tiền mặt" value={s.banHangCash} indent type="neutral" />}
          {s.banHangBank > 0 && <SumRow label="Chuyển khoản" value={s.banHangBank} indent type="neutral" />}
          {s.phieuThuTotal > 0 && <SumRow label="Phiếu thu" value={s.phieuThuTotal} type="income" />}
          {s.doiHangTotal !== 0 && (
            <SumRow label="Đổi hàng (chênh lệch)" value={Math.abs(s.doiHangTotal)} type="neutral" />
          )}
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

      {/* Net cash */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-5 py-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Tồn quỹ dự kiến</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Đầu ca + Thu tiền mặt − Chi tiền mặt
          </p>
        </div>
        <p className="text-lg font-bold text-primary">{fmtLak(s.netCashMovement)}</p>
      </div>

      {/* Tiền mặt LAK thực tế */}
      {data.closingCashLak !== null && (
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <WalletOutlined className="h-3.5 w-3.5" />
            Tiền mặt thực tế đếm được
          </span>
          <span className="font-semibold text-sm">{fmtLak(data.closingCashLak)}</span>
        </div>
      )}

      {/* Ngoại tệ cuối ca */}
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
                    <>
                      <span>→</span>
                      <span className="font-semibold text-foreground">Cuối: {b.closingAmount.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button className="w-full" onClick={onClose}>
        Xong
      </Button>
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
  currencyBalances?: CurrencyBalance[]
}

export function CloseShiftModal({
  open,
  onClose,
  shiftId,
  shiftCode,
  counterName,
  openedAt,
  openingCashLak,
  currencyBalances = [],
}: Props) {
  const [closedData, setClosedData] = useState<SalesShiftDetailDto | null>(null)

  const { mutate: closeShift, isPending } = useCloseShift((data) => {
    setClosedData(data)
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      closingCashLak: '',
      foreignCurrencyBalances: currencyBalances.map((b) => ({
        currency: b.currency,
        openingAmount: b.openingAmount,
        closingAmount: '',
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'foreignCurrencyBalances',
  })

  // Đồng bộ lại khi prop currencyBalances thay đổi (ví dụ lần đầu open modal)
  useEffect(() => {
    if (open && currencyBalances.length > 0) {
      reset({
        closingCashLak: '',
        foreignCurrencyBalances: currencyBalances.map((b) => ({
          currency: b.currency,
          openingAmount: b.openingAmount,
          closingAmount: '',
        })),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => {
    reset({ closingCashLak: '', foreignCurrencyBalances: [] })
    setClosedData(null)
    onClose()
  }

  const onSubmit = (values: FormValues) => {
    const cash = parseInt(values.closingCashLak.replace(/[^0-9]/g, ''), 10)
    if (isNaN(cash) || cash < 0) return
    closeShift({
      id: shiftId,
      dto: {
        closingCashLak: cash,
        foreignCurrencyBalances:
          values.foreignCurrencyBalances
            ?.filter((b) => b.currency && b.closingAmount)
            .map((b) => ({
              currency: b.currency.toUpperCase(),
              closingAmount: parseFloat(b.closingAmount) || 0,
            })) ?? undefined,
      },
    })
  }

  const openedAtFormatted = openedAt
    ? new Date(openedAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        title={
          <span className="flex items-center gap-2 font-semibold">
            <ClockCircleOutlined className="h-4 w-4 text-primary" />
            Chốt Ca Bán Hàng
          </span>
        }
        className="sm:max-w-xl"
        footer={null}
      >
        {closedData ? (
          <ShiftSummaryView data={closedData} onClose={handleClose} />
        ) : (
          <div className="space-y-5">
            {/* Thông tin ca hiện tại */}
            <div className="rounded-xl border bg-muted/30 divide-y divide-border/60">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Mã ca</span>
                <span className="text-xs font-mono font-semibold">{shiftCode}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Quầy</span>
                <span className="text-xs font-medium">{counterName}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Mở ca lúc</span>
                <span className="text-xs">{openedAtFormatted}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RiseOutlined className="h-3 w-3 text-green-600" />
                  Tiền mặt đầu ca
                </span>
                <span className="text-xs font-semibold">{fmtLak(openingCashLak)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Tiền mặt LAK cuối ca */}
              <Field>
                <FieldLabel>
                  <FallOutlined className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                  Tiền mặt thực tế cuối ca (₭)
                  <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="closingCashLak"
                  render={({ field }) => (
                    <InputNumber
                      value={field.value ? Number(field.value) : null}
                      onChange={(v) => field.onChange(String(v ?? ''))}
                      placeholder="0"
                      suffix={
                        <span className="text-xs font-semibold text-muted-foreground">₭</span>
                      }
                      status={errors.closingCashLak ? 'error' : undefined}
                      style={{ width: '100%' }}
                    />
                  )}
                />
                {errors.closingCashLak && (
                  <FieldError>{errors.closingCashLak.message}</FieldError>
                )}
              </Field>

              {/* Ngoại tệ cuối ca */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FieldLabel className="mb-0">
                    <BankOutlined className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                    Ngoại tệ cuối ca
                  </FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ currency: '', openingAmount: undefined, closingAmount: '' })
                    }
                    className="h-6 px-2 text-[11px] gap-1"
                  >
                    <PlusOutlined className="h-3 w-3" />
                    Thêm
                  </Button>
                </div>

                {fields.length > 0 && (
                  <div className="rounded-lg border divide-y divide-border/60 overflow-hidden">
                    {fields.map((field, idx) => {
                      const isPreFilled = field.openingAmount !== undefined
                      return (
                        <div key={field.id} className="px-3 py-2.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {/* Mã tiền tệ */}
                            <div className="w-20 shrink-0">
                              <Controller
                                control={control}
                                name={`foreignCurrencyBalances.${idx}.currency`}
                                render={({ field: f }) => (
                                  <Input
                                    {...f}
                                    placeholder="USD"
                                    readOnly={isPreFilled}
                                    className={cn(
                                      'h-8 text-xs font-mono uppercase',
                                      isPreFilled && 'bg-muted cursor-default'
                                    )}
                                    onChange={(e) =>
                                      !isPreFilled && f.onChange(e.target.value.toUpperCase())
                                    }
                                    status={
                                      errors.foreignCurrencyBalances?.[idx]?.currency
                                        ? 'error'
                                        : undefined
                                    }
                                  />
                                )}
                              />
                            </div>

                            {/* Đầu ca (readonly nếu có) */}
                            {isPreFilled && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                <span>Đầu:</span>
                                <span className="font-mono font-medium text-foreground">
                                  {field.openingAmount?.toLocaleString()}
                                </span>
                                <span>→</span>
                              </div>
                            )}

                            {/* Số lượng cuối ca */}
                            <div className="flex-1">
                              <Controller
                                control={control}
                                name={`foreignCurrencyBalances.${idx}.closingAmount`}
                                render={({ field: f }) => (
                                  <InputNumber
                                    value={f.value ? Number(f.value) : null}
                                    onChange={(v) => f.onChange(String(v ?? ''))}
                                    placeholder="0"
                                    status={
                                      errors.foreignCurrencyBalances?.[idx]?.closingAmount
                                        ? 'error'
                                        : undefined
                                    }
                                    style={{ width: '100%' }}
                                  />
                                )}
                              />
                            </div>

                            {/* Xóa (chỉ cho dòng thêm tay, không xóa dòng pre-filled) */}
                            {!isPreFilled && (
                              <button
                                type="button"
                                onClick={() => remove(idx)}
                                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                              >
                                <DeleteOutlined className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {errors.foreignCurrencyBalances?.[idx]?.closingAmount && (
                            <FieldError>
                              {errors.foreignCurrencyBalances[idx].closingAmount?.message}
                            </FieldError>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Hủy
                </Button>
                <Button variant="destructive" type="submit" loading={isPending}>
                  Chốt Ca
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
