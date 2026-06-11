import React from 'react'
import { Input } from 'antd'
import { cn } from '@/lib/utils'

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
  className?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 3, ...props }, ref) => {
    return (
      <Input.TextArea
        rows={rows}
        className={cn('w-full text-sm', className)}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
