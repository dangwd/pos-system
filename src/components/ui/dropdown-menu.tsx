'use client'

import React from 'react'
import { Dropdown } from 'antd'
import { cn } from '@/lib/utils'

// ─── Context ────────────────────────────────────────────────────────────────

interface DropdownCtxType {
  open: boolean
  setOpen: (v: boolean) => void
}

const DropdownCtx = React.createContext<DropdownCtxType>({
  open: false,
  setOpen: () => {},
})

// ─── DropdownMenu ────────────────────────────────────────────────────────────
// Scans children for DropdownMenuTrigger and DropdownMenuContent, assembles
// them into an Ant Design Dropdown. Trigger and Content must be direct children.

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  let triggerEl: React.ReactElement | null = null
  let contentEl: React.ReactElement | null = null
  let contentAlign: string | undefined

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const type = (child as React.ReactElement<object>).type
    if (type === DropdownMenuTrigger) triggerEl = child as React.ReactElement
    else if (type === DropdownMenuContent) {
      contentEl = child as React.ReactElement
      contentAlign = (child.props as { align?: string }).align
    }
  })

  if (!triggerEl) return null

  const placement = (contentAlign === 'end' ? 'bottomRight' : 'bottomLeft') as 'bottomRight' | 'bottomLeft'

  return (
    <DropdownCtx.Provider value={{ open, setOpen }}>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={['click']}
        placement={placement}
        dropdownRender={() =>
          contentEl ? React.cloneElement(contentEl) : <div />
        }
      >
        {/* Wrap in span so Dropdown can attach its ref/event handlers */}
        <span className="inline-flex">
          {React.cloneElement(triggerEl)}
        </span>
      </Dropdown>
    </DropdownCtx.Provider>
  )
}

// ─── DropdownMenuTrigger ─────────────────────────────────────────────────────

function DropdownMenuTrigger({
  children,
  className,
  disabled,
  ...props
}: React.ComponentProps<'div'> & { disabled?: boolean }) {
  return (
    <div
      className={cn('inline-flex cursor-pointer', disabled && 'pointer-events-none opacity-50', className)}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── DropdownMenuPortal ──────────────────────────────────────────────────────

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

// ─── DropdownMenuContent ─────────────────────────────────────────────────────

function DropdownMenuContent({
  children,
  className,
  align: _align,
  alignOffset: _alignOffset,
  side: _side,
  sideOffset: _sideOffset,
}: {
  children?: React.ReactNode
  className?: string
  align?: string
  alignOffset?: number
  side?: string
  sideOffset?: number
}) {
  return (
    <div
      className={cn(
        'z-50 min-w-32 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 p-1 outline-none',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── DropdownMenuGroup ───────────────────────────────────────────────────────

function DropdownMenuGroup({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>
}

// ─── DropdownMenuLabel ───────────────────────────────────────────────────────

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<'div'> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        'px-1.5 py-1 text-xs font-medium text-muted-foreground',
        inset && 'pl-7',
        className
      )}
      {...props}
    />
  )
}

// ─── DropdownMenuItem ────────────────────────────────────────────────────────

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  disabled,
  ...props
}: React.ComponentProps<'div'> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
  disabled?: boolean
}) {
  const { setOpen } = React.useContext(DropdownCtx)
  const originalOnClick = props.onClick

  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        'relative flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm outline-none select-none',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        inset && 'pl-7',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
      onClick={(e) => {
        originalOnClick?.(e)
        setOpen(false)
      }}
    />
  )
}

// ─── DropdownMenuCheckboxItem ────────────────────────────────────────────────

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  disabled,
  ...props
}: React.ComponentProps<'div'> & {
  checked?: boolean
  inset?: boolean
  disabled?: boolean
}) {
  const { setOpen } = React.useContext(DropdownCtx)
  const originalOnClick = props.onClick

  return (
    <div
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={0}
      className={cn(
        'relative flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 pr-8 text-sm outline-none select-none',
        'hover:bg-accent hover:text-accent-foreground',
        inset && 'pl-7',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
      onClick={(e) => {
        originalOnClick?.(e)
        setOpen(false)
      }}
    >
      {checked && (
        <span className="absolute right-2 flex items-center justify-center">✓</span>
      )}
      {children}
    </div>
  )
}

// ─── DropdownMenuRadioGroup ──────────────────────────────────────────────────

function DropdownMenuRadioGroup({ children }: { children?: React.ReactNode }) {
  return <div role="group">{children}</div>
}

// ─── DropdownMenuRadioItem ───────────────────────────────────────────────────

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  disabled,
  ...props
}: React.ComponentProps<'div'> & { inset?: boolean; disabled?: boolean }) {
  const { setOpen } = React.useContext(DropdownCtx)
  const originalOnClick = props.onClick

  return (
    <div
      role="menuitemradio"
      tabIndex={0}
      className={cn(
        'relative flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 pr-8 text-sm outline-none select-none',
        'hover:bg-accent hover:text-accent-foreground',
        inset && 'pl-7',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
      onClick={(e) => {
        originalOnClick?.(e)
        setOpen(false)
      }}
    >
      {children}
    </div>
  )
}

// ─── DropdownMenuSeparator ───────────────────────────────────────────────────

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} />
}

// ─── DropdownMenuShortcut ────────────────────────────────────────────────────

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}

// ─── DropdownMenuSub ─────────────────────────────────────────────────────────
// Simplified: renders as group (full sub-menu support omitted in this migration step)

function DropdownMenuSub({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<'div'> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm outline-none select-none',
        'hover:bg-accent hover:text-accent-foreground',
        inset && 'pl-7',
        className
      )}
      {...props}
    >
      {children}
      <span className="ml-auto">›</span>
    </div>
  )
}

function DropdownMenuSubContent({
  className,
  children,
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'z-50 min-w-24 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 p-1',
        className
      )}
    >
      {children}
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
