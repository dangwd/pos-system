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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, X, PauseCircle, Copy } from 'lucide-react'
import type { InvoiceTab } from '@/types/invoice-tab'

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Đóng hóa đơn?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{tab?.label}</span> đang có{' '}
          <span className="font-medium text-destructive">{totalQty} sản phẩm</span>.
          Đóng tab sẽ hủy toàn bộ giỏ hàng này.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Giữ lại</Button>
          <Button variant="destructive" onClick={onConfirm}>Đóng hóa đơn</Button>
        </DialogFooter>
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

  return (
    <div
      onClick={onSwitch}
      role="tab"
      aria-selected={isActive}
      className={cn(
        // Base styles
        'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-md',
        'border border-b-0 text-xs cursor-pointer select-none transition-colors',
        'min-w-[110px] max-w-[168px]',
        // Active / inactive
        isActive
          ? 'bg-background border-border text-foreground shadow-sm'
          : 'bg-muted/60 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {/* Indicator trạng thái holding */}
      {tab.status === 'holding' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Đang giữ" />
      )}

      {/* Indicator trạng thái paying */}
      {tab.status === 'paying' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Đang thanh toán" />
      )}

      {/* Label hóa đơn */}
      <span className="truncate flex-1 font-medium">{tab.label}</span>

      {/* Badge số lượng sản phẩm — chỉ hiện khi có items */}
      {totalQty > 0 && (
        <span className="shrink-0 text-[10px] bg-primary/15 text-primary rounded px-1 font-semibold">
          {totalQty}
        </span>
      )}

      {/* Action buttons — chỉ hiện khi hover tab active */}
      {isActive && (
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onHold() }}
            className="p-0.5 rounded hover:bg-amber-100 hover:text-amber-600"
            title="Tạm giữ đơn (Ctrl+H)"
          >
            <PauseCircle className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate() }}
            className="p-0.5 rounded hover:bg-muted"
            title="Nhân bản đơn (Ctrl+D)"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Nút đóng — chỉ hiện khi có nhiều hơn 1 tab */}
      {showClose && (
        <button
          onClick={e => { e.stopPropagation(); onClose() }}
          className={cn(
            'shrink-0 p-0.5 rounded transition-opacity hover:text-destructive',
            isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-60',
          )}
          title="Đóng hóa đơn (Ctrl+W)"
          aria-label="Đóng hóa đơn"
        >
          <X className="h-3 w-3" />
        </button>
      )}
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
        className="flex items-end gap-0.5 border-b bg-muted/30 px-2 pt-1 overflow-x-auto"
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
          className="mb-0.5 flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="Hóa đơn mới (Ctrl+T)"
          aria-label="Mở hóa đơn mới"
        >
          <Plus className="h-3.5 w-3.5" />
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
