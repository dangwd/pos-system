'use client'

import React from 'react'
import { Select as AntSelect } from 'antd'
import { cn } from '@/lib/utils'

// Collect SelectItem options from the JSX tree synchronously (no useEffect needed).
// This eliminates the first-render flash where AntSelect had empty options.
function collectItems(
  node: React.ReactNode
): Array<{ value: string; label: React.ReactNode; disabled?: boolean }> {
  const result: Array<{ value: string; label: React.ReactNode; disabled?: boolean }> = []
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectItem) {
      const p = child.props as { value: string; children?: React.ReactNode; disabled?: boolean }
      result.push({ value: p.value, label: p.children, disabled: p.disabled })
    } else {
      const p = child.props as { children?: React.ReactNode }
      if (p.children) result.push(...collectItems(p.children))
    }
  })
  return result
}

interface SelectCtxType {
  value?: string
  onValueChange?: (v: string) => void
  disabled?: boolean
  items: Array<{ value: string; label: React.ReactNode; disabled?: boolean }>
}

const SelectCtx = React.createContext<SelectCtxType>({ items: [] })

interface SelectRootProps {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  disabled?: boolean
  children?: React.ReactNode
}

function Select({ value, onValueChange, disabled, children }: SelectRootProps) {
  const items = collectItems(children)
  return (
    <SelectCtx.Provider value={{ value, onValueChange, disabled, items }}>
      {children}
    </SelectCtx.Provider>
  )
}

interface SelectTriggerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'> {
  size?: 'sm' | 'default'
  children?: React.ReactNode
  className?: string
}

function SelectTrigger({ className, size: _size, children }: SelectTriggerProps) {
  const { value, onValueChange, disabled, items } = React.useContext(SelectCtx)

  let placeholder: string | undefined
  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement(child) &&
      (child as React.ReactElement<{ placeholder?: string }>).type === SelectValue
    ) {
      placeholder = (child as React.ReactElement<{ placeholder?: string }>).props.placeholder
    }
  })

  return (
    <AntSelect
      value={value || undefined}
      onChange={(v) => onValueChange?.(v)}
      disabled={disabled}
      placeholder={placeholder}
      options={items.map((item) => ({
        value: item.value,
        label: item.label,
        disabled: item.disabled,
      }))}
      className={cn('w-full', className)}
      popupMatchSelectWidth
    />
  )
}

function SelectValue({ placeholder: _placeholder }: { placeholder?: string; children?: React.ReactNode }) {
  return null
}

function SelectContent({ children, className: _className }: { children?: React.ReactNode; className?: string }) {
  return <>{children}</>
}

// SelectItem is a data-only node — collectItems() reads its props, render returns null.
function SelectItem({
  value: _value,
  children: _children,
  disabled: _disabled,
  className: _className,
}: {
  value: string
  children?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return null
}

function SelectGroup({ children }: { children?: React.ReactNode }) { return <>{children}</> }
function SelectLabel({ children }: { children?: React.ReactNode }) { return <>{children}</> }
function SelectSeparator() { return null }
function SelectScrollUpButton() { return null }
function SelectScrollDownButton() { return null }

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
