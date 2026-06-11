'use client'

import React from 'react'
import { Checkbox as AntCheckbox } from 'antd'
import type { CheckboxProps as AntCheckboxProps } from 'antd'
import { cn } from '@/lib/utils'

type CheckboxProps = Omit<AntCheckboxProps, 'className'> & {
  className?: string
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, _ref) => {
    return (
      <AntCheckbox
        className={cn(className)}
        onChange={(e) => {
          onChange?.(e)
          onCheckedChange?.(e.target.checked)
        }}
        {...props}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
