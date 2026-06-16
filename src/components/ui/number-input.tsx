'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface NumberInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'onChange' | 'value'
> {
  value?: string | number
  onChange?: (value: string) => void
  /** Max decimal places. 0 = integers only (default) */
  decimals?: number
  /** Clamp value to this max on blur */
  max?: number
}

function formatDisplay(raw: string, dec: number): string {
  const s = raw.replace(/[^0-9.]/g, '')
  if (!s) return ''
  const n = parseFloat(s)
  if (isNaN(n)) return s
  if (dec === 0) return Math.round(n).toLocaleString('en')
  const dotIdx = s.indexOf('.')
  if (dotIdx < 0) return n.toLocaleString('en', { maximumFractionDigits: 0 })
  // Tách phần nguyên (thêm dấu phẩy hàng nghìn) + phần thập phân từ raw string
  // Dùng raw string thay vì toLocaleString để tránh làm tròn (ví dụ 0.125 → 0.13)
  const intFormatted = Math.trunc(n).toLocaleString('en')
  const decPart = s.slice(dotIdx + 1, dotIdx + 1 + dec)
  return `${intFormatted}.${decPart}`
}

export function NumberInput({
  value = '',
  onChange,
  decimals = 0,
  max,
  className,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(() => String(value ?? ''))

  useEffect(() => {
    if (!focused) setRaw(String(value ?? ''))
  }, [value, focused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = decimals > 0
      ? e.target.value.replace(/[^0-9.]/g, '')
      : e.target.value.replace(/[^0-9]/g, '')
    setRaw(v)
    onChange?.(v)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true)
    requestAnimationFrame(() => e.target.select())
    onFocus?.(e)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false)
    if (max !== undefined) {
      const n = parseFloat(raw.replace(/,/g, ''))
      if (!isNaN(n) && n > max) {
        const clamped = String(max)
        setRaw(clamped)
        onChange?.(clamped)
      }
    }
    onBlur?.(e)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      value={focused ? raw : formatDisplay(raw, decimals)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn('tabular-nums', className)}
    />
  )
}
