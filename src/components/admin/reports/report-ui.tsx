'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatKip(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('lo-LA') + ' ₭'
}

export function formatGram(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('lo-LA', { maximumFractionDigits: 2 }) + ' g'
}

export function formatNum(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('lo-LA')
}

/** Rút gọn cho trục biểu đồ: 1.2M, 980K... */
export function compactKip(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

// Bảng màu cho biểu đồ (recharts cần màu cụ thể — không dùng được CSS token).
export const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ec4899',
  '#14b8a6', '#ef4444', '#8b5cf6', '#0ea5e9',
  '#84cc16', '#f97316',
]

// ─── Presentational ────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function Panel({ title, action, children, className }: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-10">{children}</p>
}
