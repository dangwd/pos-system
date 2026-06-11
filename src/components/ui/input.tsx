import React from 'react'
import { Input as AntInput } from 'antd'
import type { InputRef } from 'antd'
import { cn } from '@/lib/utils'

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  className?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const antRef = React.useRef<InputRef | null>(null)

    // Expose the underlying HTMLInputElement to callers that expect one (e.g. React Hook Form).
    React.useImperativeHandle(ref, () => antRef.current?.input as HTMLInputElement, [])

    return (
      <AntInput
        ref={antRef}
        type={type}
        className={cn('w-full text-sm', className)}
        {...(props as React.HTMLAttributes<HTMLInputElement>)}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
export type { InputProps }
