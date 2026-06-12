'use client'

import React from 'react'
import { Divider } from 'antd'
import { cn } from '@/lib/utils'

interface SeparatorProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

function Separator({ className, orientation = 'horizontal' }: SeparatorProps) {
  return (
    <Divider
      type={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      className={cn('my-0 border-border', className)}
      style={{ margin: 0 }}
    />
  )
}

export { Separator }
