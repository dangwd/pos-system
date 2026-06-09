/**
 * useInvoiceTabShortcuts — Keyboard shortcuts cho Invoice Tab Manager
 *
 * Theo docs rule 7: shortcuts phải đăng ký ở root layout (client),
 * không phải trong từng component.
 *
 * | Phím              | Hành động                        |
 * |-------------------|----------------------------------|
 * | Ctrl + T          | Mở tab hóa đơn mới               |
 * | Ctrl + W          | Đóng tab đang active             |
 * | Ctrl + Tab        | Switch sang tab kế tiếp          |
 * | Ctrl + Shift + Tab| Switch sang tab trước đó         |
 * | Ctrl + H          | Hold đơn hiện tại                |
 * | Ctrl + D          | Duplicate đơn hiện tại           |
 */

import { useEffect } from 'react'
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'

export function useInvoiceTabShortcuts() {
  const { tabs, activeTabId, openTab, closeTab, switchTab, holdTab, duplicateTab } =
    useInvoiceTabStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return

      const idx = tabs.findIndex(t => t.id === activeTabId)
      const currentId = activeTabId ?? tabs[0]?.id

      switch (e.key) {
        case 't':
          e.preventDefault()
          openTab()
          break

        case 'w':
          e.preventDefault()
          if (currentId) closeTab(currentId)
          break

        case 'Tab':
          e.preventDefault()
          if (tabs.length < 2) break
          if (e.shiftKey) {
            // Ctrl+Shift+Tab → tab trước
            switchTab(tabs[(idx - 1 + tabs.length) % tabs.length].id)
          } else {
            // Ctrl+Tab → tab kế tiếp
            switchTab(tabs[(idx + 1) % tabs.length].id)
          }
          break

        case 'h':
          e.preventDefault()
          if (currentId) holdTab(currentId)
          break

        case 'd':
          e.preventDefault()
          if (currentId) duplicateTab(currentId)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activeTabId])
}
