/**
 * Client Layout — Root layout cho khu vực POS terminal
 *
 * Trách nhiệm:
 *  1. Full-screen container (không có sidebar nav)
 *  2. Đăng ký keyboard shortcuts cho Invoice Tab Manager ở đây,
 *     KHÔNG đăng ký trong từng component (rule 7 từ docs).
 *
 * Shortcuts được mount một lần duy nhất, sống cùng layout.
 */

'use client'

import { useInvoiceTabShortcuts } from '@/hooks/useInvoiceTabShortcuts'

function ShortcutsProvider() {
  // Hook chỉ đăng ký event listener, không render gì
  useInvoiceTabShortcuts()
  return null
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Keyboard shortcuts được đăng ký ở layout level */}
      <ShortcutsProvider />
      {children}
    </div>
  )
}
