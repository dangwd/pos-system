'use client'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

/** Sentinel cho mục "bỏ chọn" — tránh base-ui Select hiểu nhầm value rỗng. */
const CLEAR = '__clear__'

/**
 * Dropdown chọn 1 giá trị (base-ui Select): click mở ổn định, trigger hiển thị
 * **nhãn** của lựa chọn (không phải value/id). Dùng cho danh sách lựa chọn cố định.
 */
export function ComboboxSelect({
  value, onChange, options, placeholder, clearable, className,
}: Props) {
  return (
    <Select
      value={value ?? ''}
      onValueChange={v => onChange(v === CLEAR || v === '' ? null : v)}
    >
      <SelectTrigger className={cn('h-9 w-full', className)}>
        <SelectValue placeholder={placeholder}>
          {(val) => {
            const selected = options.find(o => o.value === val)
            return selected
              ? <span className="truncate">{selected.label}</span>
              : <span className="text-muted-foreground">{placeholder}</span>
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {clearable && <SelectItem value={CLEAR}>{placeholder ?? '—'}</SelectItem>}
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
