/**
 * InvoiceTabBar — Tab bar kiểu browser cho đa hóa đơn
 *
 * Hiển thị tất cả tab đang mở ở trên cùng màn hình POS.
 * Thu ngân có thể:
 *  - Click tab để switch
 *  - Click [+] để mở hóa đơn mới
 *  - Click [×] để đóng (có confirm nếu tab có items)
 *  - Dùng context menu để Hold / Duplicate
 *
 * Keyboard shortcuts (đăng ký ở layout, không phải ở đây):
 *   Ctrl+T · Ctrl+W · Ctrl+Tab · Ctrl+Shift+Tab · Ctrl+H · Ctrl+D
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PlusOutlined, CloseOutlined, PauseCircleOutlined, CopyOutlined } from '@ant-design/icons'
import type { InvoiceTab } from '@/types/invoice-tab'
import { lineTotal } from '@/types/cart'

// ─── Confirm close dialog ─────────────────────────────────────────────────────

interface CloseConfirmProps {
  tab: InvoiceTab | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Hiển thị xác nhận trước khi đóng tab còn items.
 * Rule 6: phải confirm nếu tab có sản phẩm trong giỏ.
 */
function CloseConfirmDialog({ tab, onConfirm, onCancel }: CloseConfirmProps) {
  const totalQty = tab?.items.reduce((s, i) => s + i.qty, 0) ?? 0

  return (
    <Dialog open={!!tab} onOpenChange={open => !open && onCancel()}>
      <DialogContent
        className="sm:max-w-sm"
        title="Đóng hóa đơn?"
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>Giữ lại</Button>
            <Button variant="destructive" onClick={onConfirm}>Đóng hóa đơn</Button>
          </DialogFooter>
        }
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{tab?.label}</span> đang có{' '}
          <span className="font-medium text-destructive">{totalQty} sản phẩm</span>.
          Đóng tab sẽ hủy toàn bộ giỏ hàng này.
        </p>
      </DialogContent>
    </Dialog>
  )
}

// ─── Single tab chip ──────────────────────────────────────────────────────────

interface TabChipProps {
  tab: InvoiceTab
  isActive: boolean
  onSwitch: () => void
  onClose: () => void
  onHold: () => void
  onDuplicate: () => void
  showClose: boolean
}

function TabChip({ tab, isActive, onSwitch, onClose, onHold, onDuplicate, showClose }: TabChipProps) {
  const totalQty = tab.items.reduce((s, i) => s + i.qty, 0)
  const subtotal  = tab.items.reduce((s, i) => s + lineTotal(i), 0)
  const total     = Math.max(0, subtotal - tab.discountAmount)
  const isHolding = tab.status === 'holding'
  const isPaying  = tab.status === 'paying'

  return (
    <div
      onClick={onSwitch}
      role="tab"
      aria-selected={isActive}
      className={cn(
        'group relative flex flex-col justify-center px-3.5 pt-2 pb-1.5 cursor-pointer select-none transition-all',
        'border-x border-t min-w-44 max-w-60',
        isActive
          ? 'bg-background border-border rounded-t-lg border-t-2 border-t-primary shadow-[0_-3px_10px_-2px_rgba(0,0,0,0.07)]'
          : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-md mt-0.5',
      )}
    >
      {/* ── Dòng 1: chấm + label + actions ── */}
      <div className="flex items-center gap-1.5">
        {/* Chấm trạng thái */}
        {isHolding
          ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          : isPaying
          ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
          : <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isActive ? 'bg-primary/50' : 'bg-muted-foreground/30')} />
        }

        <span className={cn(
          'text-xs flex-1 truncate',
          isActive ? 'text-foreground font-bold' : 'text-muted-foreground font-medium',
        )}>
          {tab.label}
        </span>

        {/* Actions — hover */}
        <div className={cn(
          'flex items-center gap-0.5 transition-opacity',
          isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-0',
        )}>
          <button
            onClick={e => { e.stopPropagation(); onHold() }}
            className="p-0.5 rounded hover:bg-amber-100 hover:text-amber-600 text-muted-foreground"
            title="Tạm giữ (Ctrl+H)"
          >
            <PauseCircleOutlined className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate() }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
            title="Nhân bản (Ctrl+D)"
          >
            <CopyOutlined className="h-3 w-3" />
          </button>
        </div>

        {showClose && (
          <button
            onClick={e => { e.stopPropagation(); onClose() }}
            className={cn(
              'p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
              isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-60',
            )}
            title="Đóng (Ctrl+W)"
          >
            <CloseOutlined className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── Dòng 2: khách hàng + tổng tiền / badge ── */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={cn(
          'text-[10px] truncate flex-1',
          isActive ? 'text-muted-foreground' : 'text-muted-foreground/50',
        )}>
          {tab.customerName ?? 'Khách lẻ'}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {isHolding && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">
              Tạm giữ
            </span>
          )}
          {isPaying && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 leading-none">
              Thanh toán
            </span>
          )}
          {totalQty > 0 && (
            <span className={cn(
              'text-[10px] font-bold tabular-nums',
              isActive ? 'text-primary' : 'text-muted-foreground/60',
            )}>
              {total.toLocaleString('lo-LA')} ₭
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Bar Root ─────────────────────────────────────────────────────────────

export function InvoiceTabBar() {
  const { tabs, activeTabId, openTab, closeTab, switchTab, holdTab, duplicateTab } =
    useInvoiceTabStore()

  // Tab đang chờ xác nhận đóng
  const [pendingClose, setPendingClose] = useState<InvoiceTab | null>(null)

  /** Xử lý click đóng tab — confirm nếu có items (rule 6) */
  const handleCloseRequest = (tab: InvoiceTab) => {
    // Tab đang paying: không làm gì (rule 8 đã block ở store, đây là UX layer)
    if (tab.status === 'paying') return

    if (tab.items.length > 0) {
      // Có items → hiện confirm dialog
      setPendingClose(tab)
    } else {
      // Giỏ trống → đóng ngay
      closeTab(tab.id)
    }
  }

  const handleConfirmClose = () => {
    if (pendingClose) closeTab(pendingClose.id)
    setPendingClose(null)
  }

  return (
    <>
      {/* ── Tab strip ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-end gap-1 border-b bg-muted/20 px-3 pt-2 overflow-x-auto shrink-0"
        role="tablist"
        aria-label="Hóa đơn"
      >
        {tabs.map(tab => (
          <TabChip
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            showClose={tabs.length > 1}
            onSwitch={() => switchTab(tab.id)}
            onClose={() => handleCloseRequest(tab)}
            onHold={() => holdTab(tab.id)}
            onDuplicate={() => duplicateTab(tab.id)}
          />
        ))}

        {/* Nút mở hóa đơn mới */}
        <button
          onClick={openTab}
          className="mb-px ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all shrink-0"
          title="Hóa đơn mới (Ctrl+T)"
          aria-label="Mở hóa đơn mới"
        >
          <PlusOutlined className="h-3.5 w-3.5" />
          <span>Hóa đơn mới</span>
        </button>
      </div>

      {/* ── Confirm close dialog ─────────────────────────────────────────── */}
      <CloseConfirmDialog
        tab={pendingClose}
        onConfirm={handleConfirmClose}
        onCancel={() => setPendingClose(null)}
      />
    </>
  )
}
