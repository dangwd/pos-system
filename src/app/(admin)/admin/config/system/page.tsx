'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Switch } from 'antd'
import {
  FieldTimeOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSystemConfig,
  useUpdateBuyBackOriginalPrice,
  useUpdateExchangeFree,
} from '@/hooks/useConfig'
import { cn } from '@/lib/utils'

// ─── SettingCard — 1 card cấu hình: toggle Kích hoạt + nhập số ngày ───────────

interface SettingCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  /** Câu mô tả trước ô nhập số ngày */
  label: string
  /** Hậu tố sau ô số (vd "ngày kể từ...") */
  daysSuffix: string
  note: string
  /** Số ngày nhỏ nhất hợp lệ (buyback = 0, exchangeFree = 1) */
  minDays: number
  initialEnabled: boolean
  initialDays: number
  isSaving: boolean
  onSave: (isEnabled: boolean, maxDays: number) => void
}

function SettingCard({
  icon, title, subtitle, label, daysSuffix, note,
  minDays, initialEnabled, initialDays, isSaving, onSave,
}: SettingCardProps) {
  const t = useTranslations('admin.config.systemConfig')
  // State khởi tạo từ server. Khi config đổi (lưu xong → refetch), parent đổi
  // `key` để remount card → state tự lấy lại giá trị mới (không dùng resync effect).
  const [enabled, setEnabled] = useState(initialEnabled)
  const [days, setDays] = useState(initialDays)

  const dirty = enabled !== initialEnabled || days !== initialDays
  const reset = () => { setEnabled(initialEnabled); setDays(initialDays) }

  return (
    <section className="bg-card border border-border rounded-[10px] shadow-card overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-foreground truncate">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{t('activate')}</span>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>
      </header>

      {/* Body */}
      <div className={cn('px-5 py-4 transition-opacity', !enabled && 'opacity-50')}>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          <span className="inline-block h-3 w-0.5 rounded bg-primary" />
          {t('sectionTime')}
        </p>

        <div className="rounded-lg border border-border bg-muted/40 px-4 py-4">
          <p className="text-sm text-foreground">{label}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground">
            <InputNumber
              min={minDays}
              value={days}
              disabled={!enabled}
              onChange={(v) => setDays(typeof v === 'number' ? v : minDays)}
              size="middle"
              className="w-24"
            />
            <span>{daysSuffix}</span>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <InfoCircleOutlined className="mt-0.5 shrink-0" />
            <span>{note}</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
        <Button variant="outline" size="sm" disabled={!dirty || isSaving} onClick={reset}>
          {t('cancel')}
        </Button>
        <Button
          size="sm"
          disabled={!dirty || isSaving}
          onClick={() => onSave(enabled, days)}
        >
          <SaveOutlined className="h-4 w-4" />
          {t('save')}
        </Button>
      </footer>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemConfigPage() {
  const { hasAnyPermission } = usePermission()
  const t = useTranslations('admin.config.systemConfig')
  const { data, isLoading } = useSystemConfig()
  const buyBack = useUpdateBuyBackOriginalPrice()
  const exchangeFree = useUpdateExchangeFree()

  // Tạm ẩn card Đổi Miễn Phí — nghiệp vụ chưa có entry point ở POS (picker thiếu
  // ExchangeFree), triển khai chưa ổn. Bật lại: đổi false → true.
  const SHOW_EXCHANGE_FREE = false

  // CONFIG_SYSTEM là quyền chuẩn (docs). Tạm gộp CONFIG_PRICE làm cầu nối để
  // Manager/SystemAdmin truy cập được trước khi backend cấp CONFIG_SYSTEM —
  // siết lại còn 'CONFIG_SYSTEM' khi quyền đã được seed vào JWT.
  if (!hasAnyPermission('CONFIG_SYSTEM', 'CONFIG_PRICE')) return <ForbiddenPage />

  return (
    <div className="mx-auto max-w-3xl" style={{ padding: '24px 24px 32px' }}>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('pageSubtitle')}</p>
      </div>

      {isLoading || !data ? (
        <div className="space-y-5">
          <Skeleton className="h-56 w-full rounded-[10px]" />
          {SHOW_EXCHANGE_FREE && <Skeleton className="h-56 w-full rounded-[10px]" />}
        </div>
      ) : (
        <div className="space-y-5">
          <SettingCard
            key={`buyback-${data.buyBackOriginalPriceEnabled}-${data.buyBackOriginalPriceMaxDays}`}
            icon={<FieldTimeOutlined />}
            title={t('buyBack.title')}
            subtitle={t('buyBack.subtitle')}
            label={t('buyBack.label')}
            daysSuffix={t('daysSuffix')}
            note={t('buyBack.note')}
            minDays={0}
            initialEnabled={data.buyBackOriginalPriceEnabled}
            initialDays={data.buyBackOriginalPriceMaxDays}
            isSaving={buyBack.isPending}
            onSave={(isEnabled, maxDays) => buyBack.mutate({ isEnabled, maxDays })}
          />

          {SHOW_EXCHANGE_FREE && (
            <SettingCard
              key={`exfree-${data.exchangeFreeEnabled}-${data.exchangeFreeMaxDays}`}
              icon={<SwapOutlined />}
              title={t('exchangeFree.title')}
              subtitle={t('exchangeFree.subtitle')}
              label={t('exchangeFree.label')}
              daysSuffix={t('daysSuffix')}
              note={t('exchangeFree.note')}
              minDays={1}
              initialEnabled={data.exchangeFreeEnabled}
              initialDays={data.exchangeFreeMaxDays}
              isSaving={exchangeFree.isPending}
              onSave={(isEnabled, maxDays) => exchangeFree.mutate({ isEnabled, maxDays })}
            />
          )}
        </div>
      )}
    </div>
  )
}
