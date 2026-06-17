import React from 'react'
import { Button as AntButton } from 'antd'
import type { ButtonProps as AntButtonProps } from 'antd'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type Size = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

const variantToAnt: Record<Variant, Pick<AntButtonProps, 'type' | 'danger'>> = {
  default:     { type: 'primary' },
  destructive: { type: 'primary', danger: true },
  outline:     { type: 'default' },
  secondary:   { type: 'default' },
  ghost:       { type: 'text' },
  link:        { type: 'link' },
}

const variantClass: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90',
  outline:     'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary:   'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost:       'hover:bg-accent hover:text-accent-foreground',
  link:        'text-primary underline-offset-4 hover:underline',
}

const sizeClass: Record<Size, string> = {
  default:   'h-9 px-4 py-2',
  xs:        'h-7 gap-1 px-2.5 text-xs',
  sm:        'h-8 rounded-md px-3 text-xs',
  lg:        'h-10 rounded-md px-8',
  icon:      'size-9',
  'icon-xs': 'size-7',
  'icon-sm': 'size-8',
  'icon-lg': 'size-10',
}

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: Variant
  size?: Size
  loading?: boolean | { delay: number }
  type?: 'button' | 'submit' | 'reset'
}

function Button({
  variant = 'default',
  size = 'default',
  className,
  children,
  disabled,
  loading,
  type = 'button',
  ...props
}: ButtonProps) {
  const { type: antType, danger } = variantToAnt[variant]
  return (
    <AntButton
      type={antType}
      danger={danger}
      disabled={disabled}
      loading={loading}
      htmlType={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...(props as Omit<AntButtonProps, 'type' | 'danger' | 'disabled' | 'loading' | 'htmlType'>)}
    >
      {children}
    </AntButton>
  )
}

export { Button }
export type { ButtonProps }
