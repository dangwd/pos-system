'use client'

import React from 'react'
import { Modal } from 'antd'
import { cn } from '@/lib/utils'

interface DialogCtxType {
  open: boolean
  setOpen: (v: boolean) => void
}

const DialogCtx = React.createContext<DialogCtxType>({ open: false, setOpen: () => {} })

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children?: React.ReactNode
}

function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: DialogProps) {
  const [internal, setInternal] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen! : internal

  const setOpen = React.useCallback((v: boolean) => {
    if (!isControlled) setInternal(v)
    onOpenChange?.(v)
  }, [isControlled, onOpenChange])

  return (
    <DialogCtx.Provider value={{ open, setOpen }}>
      {children}
    </DialogCtx.Provider>
  )
}

function DialogTrigger({ children, className, ...props }: React.ComponentProps<'span'>) {
  const { setOpen } = React.useContext(DialogCtx)
  return (
    <span
      onClick={() => setOpen(true)}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </span>
  )
}

function DialogClose({ children, className, ...props }: React.ComponentProps<'span'>) {
  const { setOpen } = React.useContext(DialogCtx)
  return (
    <span
      onClick={() => setOpen(false)}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </span>
  )
}

function parseWidth(className?: string): number {
  if (!className) return 520
  if (className.includes('max-w-5xl')) return 900
  if (className.includes('max-w-4xl')) return 800
  if (className.includes('max-w-3xl')) return 720
  if (className.includes('max-w-2xl')) return 640
  if (className.includes('max-w-xl'))  return 576
  if (className.includes('max-w-lg'))  return 512
  if (className.includes('max-w-md'))  return 448
  if (className.includes('max-w-sm'))  return 384
  if (className.includes('max-w-xs'))  return 320
  return 520
}

interface DialogContentProps {
  children?: React.ReactNode
  className?: string
  showCloseButton?: boolean
  /** Passed to antd Modal title slot — renders in the header with antd's default styling */
  title?: React.ReactNode
  /** Passed to antd Modal footer slot — renders with antd's default border-top and padding */
  footer?: React.ReactNode
}

function DialogContent({
  children,
  className,
  showCloseButton = true,
  title,
  footer,
}: DialogContentProps) {
  const { open, setOpen } = React.useContext(DialogCtx)
  const width = parseWidth(className)

  const isNoPadding = !!className?.includes('p-0')
  const maxHeight = className?.match(/\bmax-h-\[([^\]]+)\]/)?.[1]
  const isFlexCol = !!(className?.includes('flex') && className?.includes('flex-col'))

  const bodyStyle: React.CSSProperties = {}
  if (isNoPadding) bodyStyle.padding = 0
  if (maxHeight) {
    bodyStyle.maxHeight = maxHeight
    bodyStyle.overflow = 'hidden'
    bodyStyle.display = 'flex'
    bodyStyle.flexDirection = 'column'
  } else if (isFlexCol) {
    bodyStyle.display = 'flex'
    bodyStyle.flexDirection = 'column'
    bodyStyle.flex = '1 1 auto'
    bodyStyle.minHeight = 0
    bodyStyle.overflow = 'hidden'
  }

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      title={title}
      footer={footer ?? null}
      closable={showCloseButton}
      width={width}
      destroyOnHidden
      centered
      styles={{
        body: Object.keys(bodyStyle).length > 0 ? bodyStyle : undefined,
      }}
    >
      {children}
    </Modal>
  )
}

/** Semantic wrapper — renders children as-is; use className for custom header layouts */
function DialogHeader({ className, children, ...props }: React.ComponentProps<'div'>) {
  if (className) return <div className={className} {...props}>{children}</div>
  return <>{children}</>
}

/** Renders a right-aligned flex row for action buttons — use as the `footer` prop value on DialogContent */
function DialogFooter({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex justify-end gap-2', className)} {...props}>
      {children}
    </div>
  )
}

/** Semantic title text — renders inline; use className to override antd's default title font */
function DialogTitle({ className, children, ...props }: React.ComponentProps<'div'>) {
  if (className) return <span className={className} {...props}>{children}</span>
  return <>{children}</>
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DialogOverlay() {
  return null
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
