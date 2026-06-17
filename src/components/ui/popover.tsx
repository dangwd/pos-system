"use client"

import * as React from "react"
import { Popover as AntPopover } from "antd"
import { cn } from "@/lib/utils"

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children?: React.ReactNode
}

interface PopoverCtxType {
  open: boolean
  setOpen: (v: boolean) => void
  trigger?: React.ReactElement
  content?: React.ReactNode
}

const PopoverCtx = React.createContext<PopoverCtxType>({ open: false, setOpen: () => {} })

function Popover({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: PopoverProps) {
  const [internal, setInternal] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen! : internal

  const setOpen = React.useCallback((v: boolean) => {
    if (!isControlled) setInternal(v)
    onOpenChange?.(v)
  }, [isControlled, onOpenChange])

  let triggerEl: React.ReactElement | null = null
  let contentEl: React.ReactNode = null

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === PopoverTrigger) triggerEl = child as React.ReactElement
    else if (child.type === PopoverContent) contentEl = child
  })

  if (!triggerEl) return null

  return (
    <PopoverCtx.Provider value={{ open, setOpen }}>
      <AntPopover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        content={contentEl}
        destroyOnHidden
      >
        {React.cloneElement(triggerEl)}
      </AntPopover>
    </PopoverCtx.Provider>
  )
}

function PopoverTrigger({ children, ...props }: React.ComponentProps<"span">) {
  return <span {...props}>{children}</span>
}

function PopoverContent({
  className,
  children,
  align: _align,
  alignOffset: _alignOffset,
  side: _side,
  sideOffset: _sideOffset,
  ...props
}: React.ComponentProps<"div"> & {
  align?: string
  alignOffset?: number
  side?: string
  sideOffset?: number
}) {
  return (
    <div
      data-slot="popover-content"
      className={cn("z-50 flex w-72 flex-col gap-2.5 rounded-lg p-2.5 text-sm", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-0.5 text-sm", className)} {...props} />
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-title" className={cn("font-medium", className)} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-description" className={cn("text-muted-foreground", className)} {...props} />
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
