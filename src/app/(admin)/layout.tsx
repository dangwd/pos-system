'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, ClipboardList, Monitor, LogOut,
  Users, Boxes, ArrowLeftRight, Wallet, BarChart3,
  Tag, RefreshCw, Gem, Scale, Sparkles, UserCog,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/pos/LocaleSwitcher'
import { useAuthStore } from '@/stores/auth.store'
import { AuthRepository } from '@/lib/repositories/auth.repository'
import { useMutation } from '@tanstack/react-query'

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.layout')
  const tAuth = useTranslations('auth.login')
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken') ?? ''
        : ''
      await AuthRepository.logout(refreshToken)
    },
    onSettled: () => {
      clearAuth()
      router.push('/login')
    },
  })

  const NAV_GROUPS = [
    {
      label: null as string | null,
      items: [
        { href: '/admin/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/admin/orders',    label: t('nav.orders'),    icon: ClipboardList },
      ],
    },
    {
      label: t('nav.groupCatalog'),
      items: [
        { href: '/admin/products',  label: t('nav.products'),  icon: Package },
        { href: '/admin/customers', label: t('nav.customers'), icon: Users },
        { href: '/admin/inventory', label: t('nav.inventory'), icon: Boxes },
      ],
    },
    {
      label: t('nav.groupFinance'),
      items: [
        { href: '/admin/trade',       label: t('nav.trade'),      icon: ArrowLeftRight },
        { href: '/admin/cash-ledger', label: t('nav.cashLedger'), icon: Wallet },
        { href: '/admin/reports',     label: t('nav.reports'),    icon: BarChart3 },
      ],
    },
    {
      label: t('nav.groupConfig'),
      items: [
        { href: '/admin/config/prices',         label: t('nav.prices'),        icon: Tag },
        { href: '/admin/config/exchange-rates',  label: t('nav.exchangeRates'), icon: RefreshCw },
        { href: '/admin/config/stone-prices',    label: t('nav.stonePrices'),   icon: Gem },
        { href: '/admin/config/weight-units',    label: t('nav.weightUnits'),   icon: Scale },
        { href: '/admin/config/gold-purities',   label: t('nav.goldPurities'),  icon: Sparkles },
      ],
    },
    {
      label: t('nav.groupSystem'),
      items: [
        { href: '/admin/users', label: t('nav.users'), icon: UserCog },
      ],
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 flex flex-col border-r bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 px-4 h-14 font-bold text-base border-b">
          <Monitor className="h-5 w-5 text-primary" />
          {t('title')}
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === href || pathname.startsWith(href + '/')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <Separator />
        <div className="px-3 py-3 space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-md">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                {getInitials(user.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate leading-tight">{user.fullName}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{user.role}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <button
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {tAuth('logout')}
            </button>
          </div>
          <Link
            href="/pos"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            {t('nav.backToPOS')}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
