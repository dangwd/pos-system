import React from 'react'
import { Input as AntInput } from 'antd'
import type { InputRef, InputProps as AntInputProps } from 'antd'
import { cn } from '@/lib/utils'

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'suffix'> & {
  className?: string
  /** Antd prefix — icon/element hiển thị bên trái bên trong input */
  prefix?: AntInputProps['prefix']
  /** Antd suffix — icon/element hiển thị bên phải bên trong input */
  suffix?: AntInputProps['suffix']
  allowClear?: AntInputProps['allowClear']
  /** 'error' → viền đỏ, 'warning' → viền vàng */
  status?: AntInputProps['status']
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefix, suffix, allowClear, status, ...props }, ref) => {
    const antRef = React.useRef<InputRef | null>(null)

    React.useImperativeHandle(ref, () => antRef.current?.input as HTMLInputElement, [])

    return (
      <AntInput
        ref={antRef}
        type={type}
        prefix={prefix}
        suffix={suffix}
        allowClear={allowClear}
        status={status}
        className={cn('w-full text-sm', className)}
        {...(props as React.HTMLAttributes<HTMLInputElement>)}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
export type { InputProps }
