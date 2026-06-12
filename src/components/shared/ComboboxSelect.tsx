'use client'

import { Select } from 'antd'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface Props {
  value: string | null
  onChange: (value: string | null) => void
  options: ComboboxOption[]
  placeholder?: string
  /** Hiển thị mục "—" để bỏ chọn (clear về null). */
  clearable?: boolean
  className?: string
}

/**
 * Dropdown chọn 1 giá trị (Ant Design Select): hiển thị nhãn của lựa chọn.
 */
export function ComboboxSelect({
  value, onChange, options, placeholder, clearable, className,
}: Props) {
  const antOptions = [
    ...(clearable ? [{ value: '', label: placeholder ?? '—' }] : []),
    ...options.map(o => ({ value: o.value, label: o.label })),
  ]

  return (
    <Select
      value={value ?? undefined}
      onChange={(v) => onChange(v === '' || v == null ? null : v)}
      placeholder={placeholder}
      options={antOptions}
      allowClear={clearable}
      onClear={() => onChange(null)}
      className={cn('h-9 w-full', className)}
      popupMatchSelectWidth
    />
  )
}
