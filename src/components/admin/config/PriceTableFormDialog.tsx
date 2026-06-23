'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { InputNumber } from '@/components/ui/antd-number-input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { SaveOutlined } from '@ant-design/icons'
import { useCreatePriceTable, useGoldPurities } from '@/hooks/useConfig'
import type { Branch } from '@/types/branch'
import type { PriceTable, PriceRow, GoldPurity } from '@/types/config'

// ─── Default rows ──────────────────────────────────────────────────────────────
// Fallback dùng khi hàm lượng từ config chưa tải xong / chưa cấu hình.
// Nguồn chính là /api/config/gold-purities (xem puritiesToRows) để bảng giá luôn
// khớp với màn "Hàm lượng vàng / bạc".

const DEFAULT_ROWS: PriceRow[] = [
  { karat: '9999', type: 'gold',   unit: 'chi',  gramPerUnit: 3.75, buy: 0, sell: 0 },
  { karat: '999',  type: 'gold',   unit: 'chi',  gramPerUnit: 3.75, buy: 0, sell: 0 },
  { karat: '750',  type: 'gold',   unit: 'chi',  gramPerUnit: 3.75, buy: 0, sell: 0 },
  { karat: '585',  type: 'gold',   unit: 'chi',  gramPerUnit: 3.75, buy: 0, sell: 0 },
  { karat: '375',  type: 'gold',   unit: 'chi',  gramPerUnit: 3.75, buy: 0, sell: 0 },
  { karat: '999',  type: 'silver', unit: 'gram', gramPerUnit: 1,    buy: 0, sell: 0 },
  { karat: '925',  type: 'silver', unit: 'gram', gramPerUnit: 1,    buy: 0, sell: 0 },
  { karat: '800',  type: 'silver', unit: 'gram', gramPerUnit: 1,    buy: 0, sell: 0 },
]

// Quy ước đơn vị: vàng = chỉ (3.75g), bạc = gram (1g) — snapshot lúc tạo bảng.
// Sắp xếp: vàng trước, bạc sau; trong mỗi nhóm theo độ tinh khiết giảm dần.
function puritiesToRows(purities: GoldPurity[]): PriceRow[] {
  return [...purities]
    .sort((a, b) => {
      const sa = (a.category ?? 'Gold') === 'Silver' ? 1 : 0
      const sb = (b.category ?? 'Gold') === 'Silver' ? 1 : 0
      if (sa !== sb) return sa - sb
      return b.hamLuong - a.hamLuong
    })
    .map((p) => {
      const isSilver = (p.category ?? 'Gold') === 'Silver'
      return {
        karat: p.ma,
        type: isSilver ? 'silver' : 'gold',
        unit: isSilver ? 'gram' : 'chi',
        gramPerUnit: isSilver ? 1 : 3.75,
        buy: 0,
        sell: 0,
      } as PriceRow
    })
}

// ─── Schema ────────────────────────────────────────────────────────────────────

function makeSchema(branchRequired: string) {
  return z.object({
    name:     z.string().min(1),
    scope:    z.enum(['all', 'branch']),
    branches: z.array(z.string()),
  }).superRefine((d, ctx) => {
    if (d.scope === 'branch' && d.branches.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: branchRequired, path: ['branches'] })
    }
  })
}

type FormValues = {
  name:     string
  scope:    'all' | 'branch'
  branches: string[]
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:       boolean
  copySource: PriceTable | null
  branches:   Branch[]
  onClose:    () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PriceTableFormDialog({ open, copySource, branches, onClose }: Props) {
  const t  = useTranslations('admin.config.prices')
  const tf = useTranslations('admin.config.prices.form')

  const { register, control, watch, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(tf('branchRequired'))),
    defaultValues: { name: '', scope: 'all', branches: [] },
  })
  const scope = watch('scope')

  const { data: purities = [] } = useGoldPurities()

  const [priceRows, setPriceRows] = useState<PriceRow[]>(() => DEFAULT_ROWS.map((r) => ({ ...r })))

  useEffect(() => {
    if (!open) return
    reset({
      name:     copySource ? copySource.name + t('copyNameSuffix') : '',
      scope:    copySource?.scope    ?? 'all',
      branches: copySource?.branches ?? [],
    })
    if (copySource?.prices.length) {
      setPriceRows(copySource.prices.map((r) => ({ ...r })))
    } else {
      const rows = puritiesToRows(purities)
      setPriceRows(rows.length ? rows : DEFAULT_ROWS.map((r) => ({ ...r })))
    }
  }, [open, copySource, purities]) // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: create, isPending } = useCreatePriceTable()

  function setPrice(idx: number, field: 'buy' | 'sell', val: number | null) {
    setPriceRows((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: val ?? 0 } : r))
  }

  function onSubmit(values: FormValues) {
    create(
      {
        name:     values.name,
        scope:    values.scope,
        branches: values.scope === 'branch' ? values.branches : [],
        prices:   priceRows,
      },
      { onSuccess: onClose },
    )
  }

  // Branch select options
  const branchOptions = branches.map((b) => ({ label: b.name, value: b.id }))
  const allBranchIds  = branches.map((b) => b.id)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copySource ? tf('copyTitle') : tf('createTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name + Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pt-name">{tf('name')}</Label>
              <Input id="pt-name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{tf('scope')}</Label>
              <Controller
                name="scope"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    style={{ width: '100%' }}
                    options={[
                      { label: t('scopeAll'),    value: 'all'    },
                      { label: t('scopeBranch'), value: 'branch' },
                    ]}
                  />
                )}
              />
            </div>
          </div>

          {/* Branch multi-select */}
          {scope === 'branch' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{tf('branches')}</Label>
                <Controller
                  name="branches"
                  control={control}
                  render={({ field }) => (
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-2 hover:underline"
                      onClick={() => field.onChange(field.value.length === allBranchIds.length ? [] : allBranchIds)}
                    >
                      {field.value.length === allBranchIds.length ? t('deselectAll') : t('selectAll')}
                    </button>
                  )}
                />
              </div>
              <Controller
                name="branches"
                control={control}
                render={({ field }) => (
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    placeholder={tf('branchesPlaceholder')}
                    options={branchOptions}
                    value={field.value}
                    onChange={field.onChange}
                    filterOption={(input, opt) =>
                      ((opt?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                )}
              />
              {errors.branches && <p className="text-xs text-destructive">{errors.branches.message}</p>}
            </div>
          )}

          {/* Price rows */}
          <div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 mb-3">
              {tf('priceInfoBanner')}
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[25%]" />
                  <col className="w-[25%]" />
                </colgroup>
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">{tf('headerKarat')}</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">{tf('headerType')}</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">{tf('headerUnit')}</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">{tf('headerBuy')}</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">{tf('headerSell')}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-3 py-1.5">
                        <span
                          className="font-mono font-bold px-1.5 py-0.5 rounded text-xs"
                          style={
                            row.type === 'gold'
                              ? { background: '#FAEEDA', color: '#633806' }
                              : { background: '#D3D1C7', color: '#2C2C2A' }
                          }
                        >
                          {row.karat}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row.type === 'gold' ? tf('categoryGold') : tf('categorySilver')}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row.unit === 'chi' ? tf('unitChi') : tf('unitGram')}
                      </td>
                      <td className="px-2 py-1">
                        <InputNumber
                          min={0}
                          size="small"
                          value={row.buy || null}
                          onChange={(v) => setPrice(idx, 'buy', v)}
                          style={{ width: '100%' }}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <InputNumber
                          min={0}
                          size="small"
                          value={row.sell || null}
                          onChange={(v) => setPrice(idx, 'sell', v)}
                          style={{ width: '100%' }}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner className="mr-2" /> : <SaveOutlined className="mr-1.5" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
