'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { setUserLocale } from '@/lib/locale'
import { locales, type AppLocale } from '@/i18n/config'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CheckOutlined, DownOutlined } from '@ant-design/icons'

const LOCALE_CONFIG: Record<AppLocale, { flag: string; label: string; short: string }> = {
  lo: { flag: '🇱🇦', label: 'ພາສາລາວ', short: 'ລາວ' },
  vi: { flag: '🇻🇳', label: 'Tiếng Việt', short: 'Việt' },
  en: { flag: '🇬🇧', label: 'English',    short: 'EN' },
}

export function LocaleSwitcher() {
  const current = useLocale() as AppLocale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSwitch = (locale: AppLocale) => {
    if (locale === current || isPending) return
    startTransition(async () => {
      await setUserLocale(locale)
      router.refresh()
    })
  }

  const currentCfg = LOCALE_CONFIG[current]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-md',
          'border border-border/60 bg-muted/40',
          'text-xs font-medium text-foreground',
          'hover:bg-accent hover:border-border transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          isPending && 'opacity-50 cursor-wait',
        )}
      >
        <span className="text-base leading-none">{currentCfg.flag}</span>
        <DownOutlined className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-40 p-1">
        {locales.map(locale => {
          const cfg = LOCALE_CONFIG[locale]
          const isActive = locale === current
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleSwitch(locale)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer',
                isActive && 'bg-primary/8 text-primary font-medium',
              )}
            >
              <span className="text-lg leading-none">{cfg.flag}</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium leading-tight">{cfg.short}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{cfg.label}</span>
              </div>
              {isActive && (
                <CheckOutlined className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
