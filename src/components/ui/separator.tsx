'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SeparatorProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

function Separator({ className, orientation = 'horizontal' }: SeparatorProps) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block self-stretch w-px bg-border mx-2', className)}
      />
    )
  }
  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={cn('border-t border-border my-0 w-full', className)}
    />
  )
}

export { Separator }
