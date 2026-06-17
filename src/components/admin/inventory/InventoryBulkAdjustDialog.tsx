'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { InputNumber, Select } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InventoryProductPickerDialog } from '@/components/admin/inventory/InventoryProductPickerDialog'
import { useCreateAdjustment } from '@/hooks/useInventory'
import { useCounters } from '@/hooks/useBranches'
import type { AdjustDirection, InventoryItem } from '@/types/inventory'

interface Line {
  id: string
  productCode: string
  productName: string
  stock: number
  quantity: string
  actualValue: string   // chỉ dùng cho IN (giá trị lô)
}

interface Props {
  open: boolean
  /** IN = phiếu nhập kho · OUT = phiếu xuất kho. */
  direction: AdjustDirection
  branchId: string | null
  onClose: () => void
}

/**
 * Popup tạo phiếu NHẬP/XUẤT kho nhiều dòng → POST /api/inventory/bulk-adjust.
 * Chọn nhiều sản phẩm cùng lúc qua picker; sửa số lượng / giá trị lô / ghi chú trực tiếp
 * trên từng dòng (ghi chú là per-item). Nếu chi nhánh có nhiều quầy → chọn quầy thực hiện
 * (lọc tồn kho theo quầy). Partial success: dòng lỗi (thiếu tồn / không tìm thấy) giữ lại để sửa.
 */
export function InventoryBulkAdjustDialog({ open, direction, branchId, onClose }: Props) {
  const isIn = direction === 'IN'
  const t = useTranslations(isIn ? 'admin.inventory.stockIn' : 'admin.inventory.stockOut')

  const { data: counters = [] } = useCounters(branchId)
  const multiCounter = counters.length > 1

  const [counterId, setCounterId] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [reason, setReason] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const { mutate: createAdjustment, isPending } = useCreateAdjustment()

  // Quầy thực hiện: nhiều quầy → người dùng chọn; 1 quầy → tự dùng; 0 → cấp chi nhánh.
  const effectiveCounterId = multiCounter ? counterId : (counters[0]?.id ?? null)
  const needCounter = multiCounter && !counterId

  const addItems = (items: InventoryItem[]) => {
    setLines(ls => {
      const existing = new Set(ls.map(l => l.id))
      const fresh = items
        .filter(i => !existing.has(i.id))
        .map<Line>(i => ({ id: i.id, productCode: i.productCode, productName: i.productName, stock: i.quantity, quantity: '', actualValue: '' }))
      return [...ls, ...fresh]
    })
    setPickerOpen(false)
  }
  const patchLine = (id: string, patch: Partial<Line>) =>
    setLines(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)))
  const removeLine = (id: string) => setLines(ls => ls.filter(l => l.id !== id))

  // Đổi quầy → xóa các dòng đã chọn (thuộc quầy trước đó).
  const changeCounter = (v: string | null) => { setCounterId(v ?? null); setLines([]) }

  const qtyOf = (l: Line) => parseInt(l.quantity, 10)
  const exceeds = (l: Line) => !isIn && !isNaN(qtyOf(l)) && qtyOf(l) > l.stock
  const lineValid = (l: Line) => { const q = qtyOf(l); return !isNaN(q) && q > 0 && !exceeds(l) }
  const totalQty = lines.reduce((sum, l) => sum + (parseInt(l.quantity, 10) || 0), 0)
  const canSave = lines.length > 0 && lines.every(lineValid) && !needCounter

  const reset = () => { setCounterId(null); setLines([]); setReason('') }
  const handleClose = () => { reset(); onClose() }

  function handleSave() {
    if (!canSave) return
    // Phiếu atomic: 1 dòng lỗi → cả phiếu bị từ chối (onError toast ở hook).
    createAdjustment(
      {
        direction,
        reason: reason.trim() || t('defaultReason'),
        lines: lines.map(l => {
          const value = parseInt(l.actualValue, 10)
          return {
            itemId: l.id,
            quantity: qtyOf(l),
            ...(isIn && !isNaN(value) && value > 0 ? { actualValue: value } : {}),
          }
        }),
      },
      { onSuccess: () => handleClose() },
    )
  }

  const colCount = isIn ? 6 : 5

  return (
    <>
      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent
          className="sm:max-w-5xl"
          title={t('dialogTitle')}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isPending}>{t('close')}</Button>
              <Button onClick={handleSave} disabled={isPending || !canSave}>
                {isPending && <Spinner className="mr-2" />}
                {t('save')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-1">
            {/* Quầy thực hiện — chỉ hiện khi chi nhánh có nhiều quầy */}
            {multiCounter && (
              <div className="space-y-1 sm:max-w-xs">
                <label className="text-xs font-medium">{t('counter')}</label>
                <Select
                  value={counterId ?? undefined}
                  onChange={changeCounter}
                  placeholder={t('counterPlaceholder')}
                  options={counters.map(c => ({ value: c.id, label: c.counterName }))}
                  className="w-full"
                  popupMatchSelectWidth={false}
                />
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{t('totalQty', { count: totalQty })}</Badge>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={needCounter} onClick={() => setPickerOpen(true)}>
                <PlusOutlined className="h-4 w-4" />
                {t('selectProducts')}
              </Button>
            </div>

            {/* Lý do chung cho cả phiếu */}
            <div className="space-y-1">
              <label className="text-xs font-medium">{t('form.reason')}</label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                className="h-9"
              />
            </div>

            {/* Bảng dòng hàng */}
            <div className="max-h-[44vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead className="w-10">{t('form.no')}</TableHead>
                    <TableHead className="w-32">{t('form.code')}</TableHead>
                    <TableHead>{t('form.name')}</TableHead>
                    <TableHead className="w-24">{t('form.qty')}</TableHead>
                    {isIn && <TableHead className="w-36">{t('form.lotValue')}</TableHead>}
                    <TableHead className="w-14 text-center">{t('form.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount}>
                        <Empty className="border-0 py-8"><EmptyTitle>{t('emptyLines')}</EmptyTitle></Empty>
                      </TableCell>
                    </TableRow>
                  ) : lines.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{l.productCode}</TableCell>
                      <TableCell>
                        <div className="font-medium">{l.productName}</div>
                        <div className="text-[11px] text-muted-foreground">{t('rowStock', { qty: l.stock })}</div>
                      </TableCell>
                      <TableCell>
                        <InputNumber
                          min={1}
                          value={l.quantity ? Number(l.quantity) : null}
                          onChange={(v) => patchLine(l.id, { quantity: String(v ?? '') })}
                          placeholder="0"
                          size="small"
                          style={{ width: 80 }}
                          status={exceeds(l) ? 'error' : undefined}
                        />
                        {exceeds(l) && <p className="mt-0.5 text-[10px] text-destructive">{t('exceedsStock', { qty: l.stock })}</p>}
                      </TableCell>
                      {isIn && (
                        <TableCell>
                          <InputNumber
                            min={0}
                            value={l.actualValue ? Number(l.actualValue) : null}
                            onChange={(v) => patchLine(l.id, { actualValue: String(v ?? '') })}
                            placeholder="0"
                            size="small"
                            style={{ width: 128 }}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <button type="button" onClick={() => removeLine(l.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                          <DeleteOutlined className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InventoryProductPickerDialog
        open={pickerOpen}
        branchId={branchId}
        counterId={effectiveCounterId}
        excludeIds={lines.map(l => l.id)}
        onConfirm={addItems}
        onClose={() => setPickerOpen(false)}
      />
    </>
  )
}
