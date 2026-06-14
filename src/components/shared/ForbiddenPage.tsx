'use client'

import { ShieldOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

export function ForbiddenPage() {
  const t = useTranslations('common.forbidden')
  const router = useRouter()
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-5 text-center px-6">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldOff className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        {user && (
          <p className="text-xs text-muted-foreground/70 pt-1">
            {t('role')}: <span className="font-medium">{user.role}</span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          {t('goBack')}
        </Button>
        <Button size="sm" onClick={() => router.push('/pos')}>
          {t('goToPOS')}
        </Button>
      </div>
    </div>
  )
}
