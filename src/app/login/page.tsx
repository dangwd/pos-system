'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Monitor } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocaleSwitcher } from '@/components/pos/LocaleSwitcher'
import { AuthRepository } from '@/lib/repositories/auth.repository'
import { useAuthStore } from '@/stores/auth.store'
import { extractErrorMessage } from '@/lib/errors'
import type { AppLocale } from '@/lib/errors'

type LoginForm = { username: string; password: string }

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const schema = z.object({
    username: z.string().min(1, t('usernameRequired')),
    password: z.string().min(1, t('passwordRequired')),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const { mutate: login, isPending } = useMutation({
    mutationFn: (dto: LoginForm) => AuthRepository.login(dto),
    onSuccess: (data) => {
      setAuth(
        {
          userId: data.userId,
          fullName: data.fullName,
          role: data.role,
          permissions: data.permissions,
          branchId: data.branchId,
        },
        data.accessToken,
        data.refreshToken,
      )
      router.replace('/pos')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, locale))
    },
  })

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-105 xl:w-120 flex-col justify-between p-10 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
            <Monitor className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">FoxAI POS</span>
        </div>

        <div className="space-y-4">
          <div className="text-4xl font-bold leading-tight">
            Khamphuvong<br />Jewelry
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
            ຄຸ້ມຄອງຮ້ານຄ້າ · ຕິດຕາມສິນຄ້າ · ລາຍງານການຂາຍ
          </p>
        </div>

        <div className="text-xs text-primary-foreground/40 font-mono">
          Vientiane, Laos PDR
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2 lg:hidden">
            <Monitor className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">FoxAI POS</span>
          </div>
          <div className="ml-auto">
            <LocaleSwitcher />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">

            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(data => login(data))} className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">
                  {t('usernameLabel')}
                </Label>
                <Input
                  id="username"
                  placeholder={t('usernamePlaceholder')}
                  autoComplete="username"
                  autoFocus
                  className="h-10"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('passwordLabel')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('passwordPlaceholder')}
                    autoComplete="current-password"
                    className="h-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />
                    }
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 font-semibold"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('submitting')}</>
                  : t('submit')
                }
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center text-xs text-muted-foreground border-t">
          FoxAI POS · Khamphuvong Jewelry &copy; 2026
        </div>
      </div>
    </div>
  )
}
