import React from 'react'
import { Skeleton as AntSkeleton } from 'antd'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-md overflow-hidden', className)}
      {...props}
    >
      <AntSkeleton.Button
        active
        block
        style={{ height: '100%', minHeight: 16, borderRadius: 6 }}
      />
    </div>
  )
}

export { Skeleton }
