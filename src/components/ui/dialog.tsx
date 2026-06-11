'use client'

import React from 'react'
import { Modal } from 'antd'
import { cn } from '@/lib/utils'

// Width tokens extracted from Tailwind max-w-* classes passed as className.
// The actual width is controlled by antd's width prop; layout CSS is not forwarded.

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
}

function DialogContent({ children, className, showCloseButton = true }: DialogContentProps) {
  const { open, setOpen } = React.useContext(DialogCtx)
  const width = parseWidth(className)

  // Parse layout hints from className and forward to antd Modal styles.
  // antd Modal ignores className for layout — these must be explicit style overrides.
  const isNoPadding = !!className?.includes('p-0')
  const isFlexCol = !!(className?.includes('flex') && className?.includes('flex-col'))
  const maxHeight = className?.match(/\bmax-h-\[([^\]]+)\]/)?.[1]

  // antd v6 only supports styles.body (not styles.content) — all layout overrides go here.
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
      footer={null}
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

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mb-4 flex flex-col gap-1', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 pt-4 border-t sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-base font-semibold leading-none', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

// No-op portals — Ant Design Modal handles its own portal
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
