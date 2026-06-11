/**
 * TransactionTable — Bảng giao dịch chính (khu vực trái màn hình POS)
 *
 * Layout dọc:
 *  ┌─ InfoBar ──────────────────────────────────────────────────────┐
 *  │  ● INV-001 · DRAFT · [KH: Chantha]        COUNTER: Quầy 1    │
 *  ├─ Table (scrollable) ───────────────────────────────────────────┤
 *  │  NGHIỆP VỤ │ MÃ & MÔ TẢ │ SỐ LƯỢNG │ ĐƠN GIÁ │ THÀNH TIỀN │ ✕ │
 *  ├─ SummaryBar ────────────────────────────────────────────────────┤
 *  │  TỔNG: xxx  │  GIẢM: -xxx  │  ← KHÁCH PHẢI TRẢ: xxx         │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * Đọc state trực tiếp từ useActiveTab() (R-ARCH-4, R-ARCH-5).
 */

'use client'

import { cn } from '@/lib/utils'
import { useActiveTab } from '@/hooks/useActiveTab'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react'
import type { CartItem } from '@/types/cart'
import { lineTotal as computeLineTotal } from '@/types/cart'
import { useTranslations } from 'next-intl'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

// ─── InfoBar ──────────────────────────────────────────────────────────────────

interface InfoBarProps {
  label: string
  status: 'draft' | 'holding' | 'paying'
  customerName: string | null
  note: string
}

function InfoBar({ label, status, customerName, note }: InfoBarProps) {
  const t = useTranslations('pos.transactionTable')

  const dotCls =
    status === 'holding' ? 'bg-muted-foreground/60' :
    status === 'paying'  ? 'bg-primary animate-pulse' :
    'bg-primary/40'

  const statusVariant = status === 'paying' ? 'default' : 'secondary'
  const statusText = t(`status.${status}`)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotCls)} />
        <span className="text-sm font-bold text-foreground uppercase tracking-wide truncate">
          {label}
        </span>
        <Badge variant={statusVariant} className="text-[10px] h-4 px-1.5 font-normal">
          {statusText}
        </Badge>
        {note && (
          <span className="text-xs text-muted-foreground truncate hidden md:block">· {note}</span>
        )}
        {customerName && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
            {customerName}
          </Badge>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground ml-4 hidden md:block font-mono uppercase tracking-widest">
        {t('counter')}
      </span>
    </div>
  )
}

// ─── QtyControl ───────────────────────────────────────────────────────────────

interface QtyControlProps {
  qty: number
  maxQty: number
  onDecrease: () => void
  onIncrease: () => void
}

function QtyControl({ qty, maxQty, onDecrease, onIncrease }: QtyControlProps) {
  return (
    <div className="flex items-center">
      <button
        onClick={onDecrease}
        disabled={qty <= 1}
        className="h-6 w-6 flex items-center justify-center rounded-l-sm border border-r-0 bg-muted hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="h-2.5 w-2.5" />
      </button>
      <span className="h-6 w-8 flex items-center justify-center border-y text-xs font-semibold tabular-nums bg-background select-none">
        {qty}
      </span>
      <button
        onClick={onIncrease}
        disabled={qty >= maxQty}
        className="h-6 w-6 flex items-center justify-center rounded-r-sm border border-l-0 bg-muted hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  )
}

// ─── TransactionRow ───────────────────────────────────────────────────────────

interface TransactionRowProps {
  item: CartItem
  index: number
  onQtyChange: (id: string, qty: number) => void
  onDelete: (id: string) => void
}

function TransactionRow({ item, index, onQtyChange, onDelete }: TransactionRowProps) {
  const t = useTranslations('pos.transactionTable')
  const rowTotal = computeLineTotal(item)

  // Map category name → operation label key
  const opKey = item.categoryName.toLowerCase().includes('vàng') || item.categoryName.toLowerCase().includes('gold')
    ? 'gold'
    : item.categoryName.toLowerCase().includes('bạc') || item.categoryName.toLowerCase().includes('silver')
    ? 'silver'
    : item.categoryName.toLowerCase().includes('trang sức') || item.categoryName.toLowerCase().includes('jewelry')
    ? 'jewelry'
    : item.categoryName.toLowerCase().includes('đồng hồ') || item.categoryName.toLowerCase().includes('watch')
    ? 'watch'
    : 'default'

  return (
    <tr className={cn(
      'border-b transition-colors group',
      index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
      'hover:bg-accent/30',
    )}>

      {/* STT */}
      <td className="px-3 py-3 text-center w-8">
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{index + 1}</span>
      </td>

      {/* NGHIỆP VỤ */}
      <td className="px-2 py-3 whitespace-nowrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border/60 tracking-wide">
          {t(`opLabels.${opKey}`)}
        </span>
      </td>

      {/* MÃ & MÔ TẢ */}
      <td className="px-3 py-3 min-w-40 max-w-60">
        <p className="text-sm font-medium text-foreground leading-tight truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {item.purity} · #{item.productId.slice(0, 8).toUpperCase()}
        </p>
      </td>

      {/* SỐ LƯỢNG — +/- control */}
      <td className="px-3 py-3">
        <QtyControl
          qty={item.qty}
          maxQty={999}
          onDecrease={() => onQtyChange(item.productId, item.qty - 1)}
          onIncrease={() => onQtyChange(item.productId, item.qty + 1)}
        />
      </td>

      {/* ĐƠN VỊ */}
      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{t('unitLabel')}</td>

      {/* ĐƠN GIÁ */}
      <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {item.unitPriceLakPerGram.toLocaleString('lo-LA')} ₭/g
      </td>

      {/* THÀNH TIỀN */}
      <td className="px-3 py-3 text-sm tabular-nums font-semibold text-foreground whitespace-nowrap">
        {formatKip(rowTotal)}
      </td>

      {/* Delete */}
      <td className="px-2 py-3 w-8">
        <button
          onClick={() => onDelete(item.productId)}
          className="p-1 rounded-sm opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          title={t('deleteTooltip')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState() {
  const t = useTranslations('pos.transactionTable.empty')
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground select-none">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center">
          <ShoppingCart className="h-9 w-9 opacity-30" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
          <Package className="h-3.5 w-3.5 opacity-40" />
        </div>
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-foreground/60">{t('title')}</p>
        <p className="text-xs leading-relaxed opacity-60 max-w-xs whitespace-pre-line">
          {t('hint')}
        </p>
      </div>
    </div>
  )
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

interface SummaryBarProps {
  itemCount: number
  subtotal: number
  discount: number
  total: number
}

function SummaryBar({ itemCount, subtotal, discount, total }: SummaryBarProps) {
  const t = useTranslations('pos.transactionTable.summary')
  return (
    <div className="flex items-stretch border-t bg-card shrink-0">

      <div className="flex-1 px-4 py-2.5 border-r">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {t('subtotal', { count: itemCount })}
        </p>
        <p className="font-semibold text-sm mt-0.5 tabular-nums text-foreground">
          {formatKip(subtotal)}
        </p>
      </div>

      <div className="flex-1 px-4 py-2.5 border-r">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('discount')}</p>
        <p className={cn(
          'font-semibold text-sm mt-0.5 tabular-nums',
          discount > 0 ? 'text-destructive' : 'text-muted-foreground',
        )}>
          -{formatKip(discount)}
        </p>
      </div>

      <div className="flex-[1.4] px-4 py-2.5 bg-primary/5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          {t('due')}
        </p>
        <p className="font-extrabold text-lg mt-0.5 tabular-nums text-foreground tracking-tight">
          {formatKip(total)}
        </p>
      </div>
    </div>
  )
}

// ─── TransactionTable Root ────────────────────────────────────────────────────

export function TransactionTable() {
  const t = useTranslations('pos.transactionTable')
  const { tab, subtotal, total, setQty, deleteItem } = useActiveTab()
  const items = tab?.items ?? []
  const discount = subtotal - total

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      <InfoBar
        label={tab?.label ?? 'INV'}
        status={tab?.status ?? 'draft'}
        customerName={tab?.customerName ?? null}
        note={tab?.note ?? ''}
      />

      <div className="flex-1 overflow-auto min-h-0">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-muted/60 backdrop-blur-sm">
                <th className="px-3 py-2 w-8 text-center text-[10px] font-semibold text-muted-foreground">#</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.operation')}</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t('columns.item')}</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.qty')}</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.unit')}</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.unitPrice')}</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.total')}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <TransactionRow
                  key={item.productId}
                  item={item}
                  index={i}
                  onQtyChange={setQty}
                  onDelete={deleteItem}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SummaryBar
        itemCount={items.length}
        subtotal={subtotal}
        discount={discount}
        total={total}
      />
    </div>
  )
}
