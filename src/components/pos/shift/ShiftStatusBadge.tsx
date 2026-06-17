'use client'

/**
 * ShiftStatusBadge — Hiển thị trạng thái ca trong PosTopBar.
 *
 * Khi có ca mở: hiện badge xanh với mã ca + quầy, click → mở CloseShiftModal.
 * Khi không có ca: không render gì (ShiftGuard đã block toàn bộ UI).
 */

import { useActiveShift } from '@/hooks/useSalesShift'
import { cn } from '@/lib/utils'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { CloseShiftModal } from './CloseShiftModal'

export function ShiftStatusBadge() {
  const { data } = useActiveShift()
  const [closeModalOpen, setCloseModalOpen] = useState(false)

  if (!data?.hasOpenShift || !data.shiftId) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setCloseModalOpen(true)}
        title="Xem chi tiết ca / Chốt ca"
        className={cn(
          'hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-md',
          'bg-green-500/20 hover:bg-green-500/30 border border-green-400/30',
          'text-green-100 transition-colors text-[10px] font-medium',
        )}
      >
        <ClockCircleOutlined className="h-3 w-3 shrink-0 text-green-300" />
        <span className="font-mono leading-none">{data.shiftCode}</span>
        {data.counterName && (
          <span className="text-green-300/70 max-w-24 truncate hidden lg:inline">
            · {data.counterName}
          </span>
        )}
        <DownOutlined className="h-3 w-3 text-green-300/60 shrink-0" />
      </button>

      <CloseShiftModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        shiftId={data.shiftId}
        shiftCode={data.shiftCode ?? ''}
        counterName={data.counterName ?? ''}
        openedAt={data.openedAt ?? ''}
        openingCashLak={data.openingCashLak ?? 0}
      />
    </>
  )
}
