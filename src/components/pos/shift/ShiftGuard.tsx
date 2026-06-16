'use client'

/**
 * ShiftGuard — Middleware component cho POS terminal.
 *
 * Khi chưa có ca mở:
 *   → render <OpenShiftModal /> THAY THẾ children (không phải overlay)
 *   → POS DOM không tồn tại → không thể navigate sang Admin
 *   → không có z-index conflict với dropdown portals
 *
 * Sau khi mở ca thành công:
 *   → useActiveShift() invalidate → hasOpenShift = true → render children bình thường
 */

import { Spinner } from '@/components/ui/spinner'
import { useActiveShift } from '@/hooks/useSalesShift'
import type { ReactNode } from 'react'
import { OpenShiftModal } from './OpenShiftModal'

interface ShiftGuardProps {
  children: ReactNode
}

export function ShiftGuard({ children }: ShiftGuardProps) {
  const { data, isLoading } = useActiveShift()

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-background">
        <Spinner className="h-7 w-7 text-primary" />
        <p className="text-sm text-muted-foreground">Đang kiểm tra ca làm việc...</p>
      </div>
    )
  }

  if (!data?.hasOpenShift) {
    return <OpenShiftModal />
  }

  return <>{children}</>
}
