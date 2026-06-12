'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInventoryList } from '@/hooks/useInventory'
import type { InventoryItem } from '@/types/inventory'

interface Props {
  open: boolean
  branchId: string | null
  /** Quầy thực hiện — lọc tồn kho theo quầy (null ⇒ cấp chi nhánh). */
  counterId: string | null
  /** IDs đã có trong phiếu — ẩn khỏi danh sách chọn. */
  excludeIds: string[]
  onConfirm: (items: InventoryItem[]) => void
  onClose: () => void
}

/**
 * Modal chọn NHIỀU sản phẩm cùng lúc (checkbox + Xác nhận) → trả mảng mục kho
 * cho phiếu nhập/xuất. Lồng trên dialog phiếu (antd Modal tự xếp z-index).
 */
export function InventoryProductPickerDialog({ open, branchId, counterId, excludeIds, onConfirm, onClose }: Props) {
  const t = useTranslations('admin.inventory.productPicker')

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: items = [], isLoading } = useInventoryList(
    { branchId: branchId ?? undefined, counterId: counterId ?? undefined },
    !!branchId && open,
  )

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter(i => !excluded.has(i.id))
      .filter(i => !q || i.productName.toLowerCase().includes(q) || i.productCode.toLowerCase().includes(q))
  }, [items, excluded, search])

  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id))
  const someChecked = rows.some(r => selected.has(r.id))

  const toggle = (id: string) =>
    setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () =>
    setSelected(s => {
      const n = new Set(s)
      if (allChecked) rows.forEach(r => n.delete(r.id))
      else rows.forEach(r => n.add(r.id))
      return n
    })

  const reset = () => { setSearch(''); setSelected(new Set()) }
  const handleClose = () => { reset(); onClose() }
  const handleConfirm = () => {
    onConfirm(items.filter(i => selected.has(i.id)))
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-3xl"
        title={t('title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>{t('skip')}</Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0}>
              {t('confirm')}{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </DialogFooter>
        }
      >
        <div className="space-y-3 py-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} className="pl-8" />
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allChecked} indeterminate={!allChecked && someChecked} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>{t('colCode')}</TableHead>
                  <TableHead>{t('colName')}</TableHead>
                  <TableHead className="w-20 text-right">{t('colStock')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}><div className="flex justify-center py-8"><Spinner /></div></TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}><Empty className="border-0 py-8"><EmptyTitle>{t('empty')}</EmptyTitle></Empty></TableCell>
                  </TableRow>
                ) : rows.map(r => (
                  <TableRow
                    key={r.id}
                    data-state={selected.has(r.id) ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => toggle(r.id)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.productCode}</TableCell>
                    <TableCell>{r.productName}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
