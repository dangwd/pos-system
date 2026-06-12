import React from 'react'
import { Spin } from 'antd'
import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <Spin size="small" />
    </span>
  )
}

export { Spinner }
