/**
 * TransactionTable — Bảng giao dịch chính (khu vực trái màn hình POS)
 *
 * Layout thay đổi theo txnType:
 *  SellGold / SellSilver / ExchangeCurrency → bảng đơn chuẩn
 *  BuyGold                                  → bảng đơn, label "TIỆM CHI RA"
 *  ExchangeGold                             → 2 panel dọc (vàng cũ / hàng mới)
 */

'use client'

import { cn } from '@/lib/utils'
import { useActiveTab } from '@/hooks/useActiveTab'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ExchangeInvoiceLookup } from './ExchangeInvoiceLookup'
import { CurrencyExchangeForm } from './CurrencyExchangeForm'
import {
  ArrowDownToLine, ArrowUpFromLine, Minus, Plus, Trash2,
  ShoppingCart, Package, AlertTriangle,
} from 'lucide-react'
import { lineTotal } from '@/types/cart'
import type { CartItem } from '@/types/cart'
import { useTranslations } from 'next-intl'

function fmt(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

// ─── InfoBar ──────────────────────────────────────────────────────────────────

function InfoBar({ label, status, customerName, note }: {
  label: string; status: string; customerName: string | null; note: string
}) {
  const t = useTranslations('pos.transactionTable')
  const dotCls = status === 'holding' ? 'bg-muted-foreground/60'
    : status === 'paying' ? 'bg-primary animate-pulse' : 'bg-primary/40'
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotCls)} />
        <span className="text-sm font-bold uppercase tracking-wide truncate">{label}</span>
        <Badge variant={status === 'paying' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 font-normal">
          {t(`status.${status}`)}
        </Badge>
        {note && <span className="text-xs text-muted-foreground truncate hidden md:block">· {note}</span>}
        {customerName && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{customerName}</Badge>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground ml-4 hidden md:block font-mono uppercase tracking-widest">
        {t('counter')}
      </span>
    </div>
  )
}

// ─── QtyControl ───────────────────────────────────────────────────────────────

function QtyControl({ qty, onDecrease, onIncrease, onSetQty, disabled }: {
  qty: number
  onDecrease: () => void
  onIncrease: () => void
  onSetQty?: (qty: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center">
      <button onClick={onDecrease} disabled={disabled || qty <= 1}
        className="h-6 w-6 flex items-center justify-center rounded-l-sm border border-r-0 bg-muted hover:bg-accent disabled:opacity-40 transition-colors">
        <Minus className="h-2.5 w-2.5" />
      </button>
      <input
        key={qty}
        type="number"
        min={1}
        defaultValue={qty}
        disabled={disabled}
        onFocus={e => e.target.select()}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const n = parseInt(e.currentTarget.value, 10)
            if (!isNaN(n) && n >= 1) { onSetQty?.(n); e.currentTarget.blur() }
            else e.currentTarget.value = String(qty)
          }
          if (e.key === 'Escape') { e.currentTarget.value = String(qty); e.currentTarget.blur() }
        }}
        onBlur={e => {
          const n = parseInt(e.currentTarget.value, 10)
          if (isNaN(n) || n < 1) e.currentTarget.value = String(qty)
          else onSetQty?.(n)
        }}
        className="h-6 w-10 text-center border-y text-xs font-semibold tabular-nums bg-background outline-none focus:ring-1 focus:ring-inset focus:ring-primary disabled:opacity-40"
      />
      <button onClick={onIncrease} disabled={disabled}
        className="h-6 w-6 flex items-center justify-center rounded-r-sm border border-l-0 bg-muted hover:bg-accent disabled:opacity-40 transition-colors">
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, className }: {
  icon: React.ElementType; label: string; className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-1.5 border-b text-[10px] font-semibold uppercase tracking-widest shrink-0', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  )
}

// ─── SectionFooter ────────────────────────────────────────────────────────────

function SectionFooter({ label, amount, className }: {
  label: string; amount: number; className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-1.5 border-t text-xs font-semibold shrink-0', className)}>
      <span className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</span>
      <span className="tabular-nums">{fmt(amount)}</span>
    </div>
  )
}

// ─── SellTable — SellGold / SellSilver / ExchangeCurrency ─────────────────────

function SellTable({ items, onQtyChange, onDelete }: {
  items: CartItem[]
  onQtyChange: (id: string, qty: number) => void
  onDelete: (id: string) => void
}) {
  const t = useTranslations('pos.transactionTable')
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="border-b bg-muted/60 backdrop-blur-sm">
          <th className="px-3 py-2 w-7 text-center text-[10px] font-semibold text-muted-foreground">#</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t('columns.item')}</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.qty')}</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.unitPrice')}</th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('columns.total')}</th>
          <th className="w-7" />
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.productId} className={cn('border-b group transition-colors hover:bg-accent/30', i % 2 === 1 && 'bg-muted/10')}>
            <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground/60">{i + 1}</td>
            <td className="px-3 py-2.5 min-w-36 max-w-52">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.purity}</p>
            </td>
            <td className="px-3 py-2.5">
              <QtyControl qty={item.qty} disabled={item.isReadOnly}
                onDecrease={() => onQtyChange(item.productId, item.qty - 1)}
                onIncrease={() => onQtyChange(item.productId, item.qty + 1)}
                onSetQty={(q) => onQtyChange(item.productId, q)} />
            </td>
            <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.unitPriceLakPerGram.toLocaleString('lo-LA')} ₭/g
            </td>
            <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums whitespace-nowrap">
              {fmt(lineTotal(item))}
            </td>
            <td className="px-2 py-2.5 w-7">
              {!item.isReadOnly && (
                <button onClick={() => onDelete(item.productId)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── BuyGoldTable ─────────────────────────────────────────────────────────────

function BuyGoldTable({ items, onQtyChange, onDelete }: {
  items: CartItem[]
  onQtyChange: (id: string, qty: number) => void
  onDelete: (id: string) => void
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="border-b bg-blue-50/60 dark:bg-blue-950/30 backdrop-blur-sm">
          <th className="px-3 py-2 w-7 text-center text-[10px] font-semibold text-muted-foreground">#</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sản phẩm mua vào</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Số lượng</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Giá mua/g</th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide whitespace-nowrap">Tiệm chi</th>
          <th className="w-7" />
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.productId} className={cn('border-b group transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20', i % 2 === 1 && 'bg-muted/10')}>
            <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground/60">{i + 1}</td>
            <td className="px-3 py-2.5 min-w-36 max-w-52">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.purity}</p>
            </td>
            <td className="px-3 py-2.5">
              <QtyControl qty={item.qty}
                onDecrease={() => onQtyChange(item.productId, item.qty - 1)}
                onIncrease={() => onQtyChange(item.productId, item.qty + 1)}
                onSetQty={(q) => onQtyChange(item.productId, q)} />
            </td>
            <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.unitPriceLakPerGram.toLocaleString('lo-LA')} ₭/g
            </td>
            <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {fmt(lineTotal(item))}
            </td>
            <td className="px-2 py-2.5 w-7">
              <button onClick={() => onDelete(item.productId)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── ExchangeInRow — vàng cũ với PHÍ KHÒ / LAO SUT ──────────────────────────

function ExchangeInRow({ item, index, onUpdate, onDelete }: {
  item: CartItem; index: number
  onUpdate: (id: string, patch: Partial<CartItem>) => void
  onDelete: (id: string) => void
}) {
  const rowTotal = lineTotal(item)
  return (
    <tr className={cn('border-b group transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20', index % 2 === 1 && 'bg-muted/10')}>
      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground/60">{index + 1}</td>
      <td className="px-3 py-2 min-w-32 max-w-40">
        <p className="text-xs font-medium truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {(item.weightGramOverride ?? item.qty * item.weightGram).toFixed(2)}g
        </p>
      </td>
      <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {item.unitPriceLakPerGram.toLocaleString('lo-LA')}
      </td>

      {/* PHÍ KHÒ: checkbox + input */}
      <td className="px-2 py-2 w-32">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUpdate(item.productId, { isDamaged: !item.isDamaged, perItemDamage: item.isDamaged ? 0 : item.perItemDamage })}
            title={item.isDamaged ? 'Bỏ PHÍ KHÒ' : 'Bật PHÍ KHÒ'}
            className={cn('shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
              item.isDamaged ? 'bg-orange-500 border-orange-500 text-white' : 'border-muted-foreground/30 hover:border-orange-400'
            )}
          >
            {item.isDamaged && <AlertTriangle className="h-2.5 w-2.5" />}
          </button>
          {item.isDamaged && (
            <Input
              type="number" min={0} placeholder="0"
              value={item.perItemDamage || ''}
              onChange={e => onUpdate(item.productId, { perItemDamage: Number(e.target.value) || 0 })}
              className="h-5 w-20 text-[10px] px-1.5 tabular-nums"
            />
          )}
          {!item.isDamaged && <span className="text-[10px] text-muted-foreground/40">—</span>}
        </div>
      </td>

      {/* LAO SUT: số chỉ */}
      <td className="px-2 py-2 w-24">
        <Input
          type="number" min={0} step={0.01} placeholder="0"
          value={item.perItemWearChi || ''}
          onChange={e => onUpdate(item.productId, { perItemWearChi: Number(e.target.value) || 0 })}
          className="h-5 w-20 text-[10px] px-1.5 tabular-nums"
        />
      </td>

      <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
        {fmt(rowTotal)}
      </td>
      <td className="px-2 py-2 w-7">
        {!item.isReadOnly && (
          <button onClick={() => onDelete(item.productId)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── ExchangeGoldTable ────────────────────────────────────────────────────────

function ExchangeGoldTable({ items, totalA, totalB, netTotal, onQtyChange, onDelete, onUpdate }: {
  items: CartItem[]
  totalA: number; totalB: number; netTotal: number
  onQtyChange: (id: string, qty: number) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<CartItem>) => void
}) {
  const exchangeItems = items.filter(i => i.itemRole === 'ExchangeIn')
  const normalItems = items.filter(i => i.itemRole === 'Normal')

  return (
    <div className="flex flex-col min-h-0">
      {/* PANEL A: Vàng cũ đổi vào */}
      <ExchangeInvoiceLookup />

      <SectionHeader
        icon={ArrowDownToLine}
        label="Vàng cũ đổi vào"
        className="text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
      />

      {exchangeItems.length === 0 ? (
        <div className="flex items-center justify-center py-5 text-muted-foreground">
          <p className="text-xs opacity-60">Liên kết HĐ bán vàng cũ hoặc thêm thủ công</p>
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-amber-50/40 dark:bg-amber-950/20">
              <th className="px-3 py-1.5 w-7 text-[9px] font-semibold text-muted-foreground text-center">#</th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left">Sản phẩm</th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left whitespace-nowrap">Giá/g</th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-left whitespace-nowrap">Phí khò (₭)</th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-left whitespace-nowrap">Lao sút (Chỉ)</th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 uppercase text-right whitespace-nowrap">Trị giá</th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {exchangeItems.map((item, i) => (
              <ExchangeInRow key={item.productId} item={item} index={i} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      )}

      <SectionFooter
        label="Tổng cấn trừ vàng cũ (B)"
        amount={totalB}
        className="text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10"
      />

      {/* PANEL B: Hàng mới bán ra */}
      <SectionHeader
        icon={ArrowUpFromLine}
        label="Hàng bán ra mới"
        className="text-primary bg-primary/5 border-t-2 border-t-border"
      />

      {normalItems.length === 0 ? (
        <div className="flex items-center justify-center py-5 text-muted-foreground">
          <p className="text-xs opacity-60">Tìm sản phẩm mới từ thanh tìm kiếm (F3)</p>
        </div>
      ) : (
        <SellTable items={normalItems} onQtyChange={onQtyChange} onDelete={onDelete} />
      )}

      <SectionFooter label="Tổng hàng bán ra (A)" amount={totalA} />

      {/* Chênh lệch cuối */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2.5 border-t-2 shrink-0',
        netTotal > 0 ? 'text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20'
          : netTotal < 0 ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
          : 'text-muted-foreground bg-muted/20',
      )}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest opacity-70">
            {netTotal > 0 ? '★ Khách trả thêm' : netTotal < 0 ? '💵 Tiệm trả lại khách' : 'Hoà vốn'}
          </p>
        </div>
        <span className="font-extrabold text-xl tabular-nums tracking-tight">
          {fmt(Math.abs(netTotal))}
        </span>
      </div>
    </div>
  )
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

function SummaryBar({ txnType, subtotal, total, discount, itemCount }: {
  txnType: string; subtotal: number; total: number; discount: number; itemCount: number
}) {
  const isBuy = txnType === 'BuyGold'
  return (
    <div className="flex items-stretch border-t bg-card shrink-0">
      <div className="flex-1 px-3 py-2.5 border-r">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{itemCount} mục hàng</p>
        <p className="font-semibold text-xs mt-0.5 tabular-nums">{fmt(subtotal)}</p>
      </div>

      {discount > 0 && (
        <div className="flex-1 px-3 py-2.5 border-r">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Giảm giá</p>
          <p className="font-semibold text-xs mt-0.5 tabular-nums text-destructive">-{fmt(discount)}</p>
        </div>
      )}

      <div className={cn('flex-[1.5] px-4 py-2.5', isBuy ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'bg-primary/5')}>
        <p className={cn('text-[9px] uppercase tracking-wide font-semibold',
          isBuy ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
        )}>
          {isBuy ? '💵 Tiệm phải chi' : '★ Khách phải trả'}
        </p>
        <p className={cn('font-extrabold text-lg mt-0.5 tabular-nums tracking-tight',
          isBuy ? 'text-blue-600 dark:text-blue-400' : 'text-foreground',
        )}>
          {fmt(total)}
        </p>
      </div>
    </div>
  )
}

// ─── TransactionTable Root ────────────────────────────────────────────────────

export function TransactionTable() {
  const { tab, subtotal, totalA, totalB, netTotal, total, setQty, deleteItem, updateCartItem } = useActiveTab()
  const items = tab?.items ?? []
  const txnType = tab?.txnType ?? 'SellGold'
  const discount = tab?.discountAmount ?? 0
  const isExchange = txnType === 'ExchangeGold'
  const isFx = txnType === 'ExchangeCurrency'
  const isBuy = txnType === 'BuyGold'

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <InfoBar
        label={tab?.label ?? 'INV'}
        status={tab?.status ?? 'draft'}
        customerName={tab?.customerName ?? null}
        note={tab?.note ?? ''}
      />

      <div className="flex-1 overflow-auto min-h-0">
        {isFx ? (
          <CurrencyExchangeForm />
        ) : isExchange ? (
          <ExchangeGoldTable
            items={items}
            totalA={totalA} totalB={totalB} netTotal={netTotal}
            onQtyChange={setQty} onDelete={deleteItem} onUpdate={updateCartItem}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground select-none">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center">
                <ShoppingCart className="h-9 w-9 opacity-30" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-3.5 w-3.5 opacity-40" />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground/60">Giỏ hàng trống</p>
            <p className="text-xs opacity-60">Tìm sản phẩm ở thanh trên (F3)</p>
          </div>
        ) : isBuy ? (
          <BuyGoldTable items={items} onQtyChange={setQty} onDelete={deleteItem} />
        ) : (
          <SellTable items={items} onQtyChange={setQty} onDelete={deleteItem} />
        )}
      </div>

      {!isExchange && !isFx && (
        <SummaryBar
          txnType={txnType}
          subtotal={subtotal}
          total={total}
          discount={discount}
          itemCount={items.length}
        />
      )}
    </div>
  )
}
