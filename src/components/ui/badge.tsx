import React from 'react'
import { Tag } from 'antd'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  variant?: Variant
  className?: string
  children?: React.ReactNode
}

const variantStyle: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground border-transparent',
  secondary:   'bg-secondary text-secondary-foreground border-transparent',
  destructive: 'bg-destructive/10 text-destructive border-transparent',
  outline:     'border-border text-foreground bg-transparent',
  ghost:       'bg-transparent border-transparent text-foreground hover:bg-muted',
  link:        'bg-transparent border-transparent text-primary underline-offset-4 hover:underline',
}

function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <Tag
      bordered
      className={cn(
        'inline-flex items-center justify-center h-5 rounded-full px-2 text-xs font-medium whitespace-nowrap shrink-0',
        variantStyle[variant],
        className
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Tag>
  )
}

export { Badge }
export type { BadgeProps }
