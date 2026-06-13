'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmText: string
  cancelText: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Popup xác nhận tái sử dụng cho các action (vô hiệu hóa, kích hoạt, xóa…). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="max-w-md"
        title={title}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              {cancelText}
            </Button>
            <Button variant={variant} onClick={onConfirm} loading={loading}>
              {confirmText}
            </Button>
          </DialogFooter>
        }
      >
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
