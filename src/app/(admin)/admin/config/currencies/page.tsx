'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, DownOutlined, CloseOutlined, MoneyCollectOutlined,
} from '@ant-design/icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import {
  useCurrencies,
  useCreateCurrency,
  useUpdateCurrency,
  useDeleteCurrency,
} from '@/hooks/useConfig'
import type { Currency } from '@/types/config'
import { Button as AntBtn, Popover as AntPopover } from 'antd'
import { InputNumber } from '@/components/ui/antd-number-input'

// ─── Shared panel styles (matches branches / users pages) ─────────────────────

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }

const PANEL_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  overflow: 'hidden',
}

const PANEL_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
}

// ─── Picker data ──────────────────────────────────────────────────────────────

const FLAGS = [
  { emoji: '🇱🇦', name: 'Lào' },
  { emoji: '🇺🇸', name: 'Mỹ' },
  { emoji: '🇹🇭', name: 'Thái Lan' },
  { emoji: '🇨🇳', name: 'Trung Quốc' },
  { emoji: '🇯🇵', name: 'Nhật Bản' },
  { emoji: '🇪🇺', name: 'Eurozone' },
  { emoji: '🇬🇧', name: 'Anh' },
  { emoji: '🇰🇷', name: 'Hàn Quốc' },
  { emoji: '🇻🇳', name: 'Việt Nam' },
  { emoji: '🇮🇳', name: 'Ấn Độ' },
  { emoji: '🇷🇺', name: 'Nga' },
  { emoji: '🇨🇭', name: 'Thụy Sĩ' },
  { emoji: '🇦🇺', name: 'Úc' },
  { emoji: '🇨🇦', name: 'Canada' },
  { emoji: '🇸🇬', name: 'Singapore' },
  { emoji: '🇲🇾', name: 'Malaysia' },
  { emoji: '🇵🇭', name: 'Philippines' },
  { emoji: '🇮🇩', name: 'Indonesia' },
  { emoji: '🇭🇰', name: 'Hong Kong' },
  { emoji: '🇲🇲', name: 'Myanmar' },
  { emoji: '🇰🇭', name: 'Campuchia' },
  { emoji: '🇹🇼', name: 'Đài Loan' },
  { emoji: '🇲🇴', name: 'Macau' },
  { emoji: '🇧🇷', name: 'Brazil' },
]

type SymbolOption = { char: string; name: string }

const SYMBOL_OPTIONS: SymbolOption[] = [
  { char: '$',  name: 'Dollar' },
  { char: '€',  name: 'Euro' },
  { char: '£',  name: 'Pound' },
  { char: '¥',  name: 'Yen / Yuan' },
  { char: '₹',  name: 'Rupee' },
  { char: '₽',  name: 'Ruble' },
  { char: '₣',  name: 'Franc' },
  { char: '₺',  name: 'Lira' },
  { char: '₿',  name: 'Bitcoin' },
  { char: '₭',  name: 'Kip' },
  { char: '฿',  name: 'Baht' },
  { char: '₩',  name: 'Won' },
  { char: '₫',  name: 'Đồng' },
  { char: 'R$', name: 'Real' },
  { char: 'kr', name: 'Krone' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; currency: Currency }
  | { mode: 'delete'; currency: Currency }
  | null

const EMPTY_FORM = { code: '', name: '', symbol: '', flag: '', sortOrder: '1', isActive: true }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CurrenciesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.currencies')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [flagPickerOpen, setFlagPickerOpen] = useState(false)
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)

  const { data: currencies = [], isLoading } = useCurrencies()
  const { mutate: create, isPending: isCreating } = useCreateCurrency()
  const { mutate: update, isPending: isUpdating } = useUpdateCurrency()
  const { mutate: remove, isPending: isDeleting } = useDeleteCurrency()

  const isSaving = isCreating || isUpdating

  function closePickers() {
    setFlagPickerOpen(false)
    setSymbolPickerOpen(false)
  }

  function openCreate() {
    const nextOrder = currencies.length > 0
      ? Math.max(...currencies.map(c => c.sortOrder)) + 1
      : 1
    setForm({ ...EMPTY_FORM, sortOrder: String(nextOrder) })
    closePickers()
    setDialog({ mode: 'create' })
  }

  function openEdit(currency: Currency) {
    setForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      flag: currency.flag ?? '',
      sortOrder: String(currency.sortOrder),
      isActive: currency.isActive,
    })
    closePickers()
    setDialog({ mode: 'edit', currency })
  }

  function handleSubmit() {
    const sortOrder = parseInt(form.sortOrder, 10)
    if (!form.name.trim() || !form.symbol.trim() || isNaN(sortOrder)) return

    if (dialog?.mode === 'create') {
      if (!form.code.trim()) return
      create(
        { code: form.code.trim().toUpperCase(), name: form.name.trim(), symbol: form.symbol.trim(), flag: form.flag.trim() || undefined, sortOrder, isActive: form.isActive },
        { onSuccess: () => setDialog(null) },
      )
    } else if (dialog?.mode === 'edit') {
      update(
        { id: dialog.currency.id, dto: { name: form.name.trim(), symbol: form.symbol.trim(), flag: form.flag.trim() || undefined, isActive: form.isActive, sortOrder } },
        { onSuccess: () => setDialog(null) },
      )
    }
  }

  function handleDelete() {
    if (dialog?.mode !== 'delete') return
    remove(dialog.currency.id, { onSuccess: () => setDialog(null) })
  }

  const isFormValid = dialog?.mode === 'create'
    ? !!form.code.trim() && !!form.name.trim() && !!form.symbol.trim() && !!form.sortOrder
    : !!form.name.trim() && !!form.symbol.trim() && !!form.sortOrder

  if (!hasPermission('CONFIG_PRICE')) return <ForbiddenPage />

  const sorted = [...currencies].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div style={PAGE_STYLE}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {currencies.length > 0
              ? `${currencies.length} ${t('columns.code').toLowerCase()}`
              : t('noData')}
          </p>
        </div>
        <AntBtn type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('addButton')}
        </AntBtn>
      </div>

      {/* ── Table panel ── */}
      <div style={PANEL_STYLE}>
        <div style={PANEL_HEADER_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MoneyCollectOutlined style={{ fontSize: 15, color: '#6b7280' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {t('title')}
            </span>
            {sorted.length > 0 && (
              <span style={{ fontSize: 11, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                ({sorted.length})
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 16 }}>
            <TablePageSkeleton cols={5} rows={3} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={TH_STYLE}>{t('columns.sortOrder')}</th>
                <th style={TH_STYLE}>{t('columns.flag')}</th>
                <th style={TH_STYLE}>{t('columns.symbol')}</th>
                <th style={TH_STYLE}>{t('columns.code')}</th>
                <th style={{ ...TH_STYLE, width: '100%' }}>{t('columns.name')}</th>
                <th style={TH_STYLE}>{t('columns.status')}</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <MoneyCollectOutlined style={{ fontSize: 28, opacity: 0.25 }} />
                      <span>{t('noData')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid #f3f4f6',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={TD_STYLE}>
                      <span style={{ fontFamily: 'monospace', color: '#9ca3af', fontSize: 12 }}>
                        {c.sortOrder}
                      </span>
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{c.flag ?? '—'}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{c.symbol}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5', fontSize: 13 }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ fontWeight: 500, color: '#111827' }}>{c.name}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <Badge variant={c.isActive ? 'default' : 'secondary'}>
                        {c.isActive ? t('activeBadge') : t('inactiveBadge')}
                      </Badge>
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <button
                          type="button"
                          title={t('edit')}
                          onClick={() => openEdit(c)}
                          style={ACTION_BTN_STYLE}
                          onMouseEnter={e => Object.assign(e.currentTarget.style, ACTION_BTN_HOVER)}
                          onMouseLeave={e => Object.assign(e.currentTarget.style, ACTION_BTN_STYLE)}
                        >
                          <EditOutlined size={13} />
                        </button>
                        <button
                          type="button"
                          title={t('delete')}
                          onClick={() => setDialog({ mode: 'delete', currency: c })}
                          style={DEL_BTN_STYLE}
                          onMouseEnter={e => Object.assign(e.currentTarget.style, DEL_BTN_HOVER)}
                          onMouseLeave={e => Object.assign(e.currentTarget.style, DEL_BTN_STYLE)}
                        >
                          <DeleteOutlined size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit dialog ── */}
      <Dialog
        open={dialog?.mode === 'create' || dialog?.mode === 'edit'}
        onOpenChange={(o) => { if (!o) { setDialog(null); closePickers() } }}
      >
        <DialogContent
          className="sm:max-w-md"
          title={dialog?.mode === 'create' ? t('createDialogTitle') : t('editDialogTitle')}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isSaving}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving || !isFormValid}>
                {isSaving && <Spinner className="mr-2" />}
                {dialog?.mode === 'create' ? t('addButton') : t('saveButton')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>
                {dialog?.mode === 'create' ? t('form.code') : t('codeReadonly')}
              </FieldLabel>
              {dialog?.mode === 'create' ? (
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="USD, THB, CNY..."
                  maxLength={10}
                  className="font-mono uppercase"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border/50">
                  <span className="font-mono font-bold text-primary">{form.code}</span>
                  <span className="text-xs text-muted-foreground ml-auto">ISO 4217</span>
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel>{t('form.name')}</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="US Dollar, Thai Baht..."
                maxLength={100}
              />
            </Field>

            {/* ── Flag picker ── */}
            <Field>
              <FieldLabel>{t('form.flag')}</FieldLabel>
              <AntPopover
                open={flagPickerOpen}
                onOpenChange={(visible) => { setFlagPickerOpen(visible); if (visible) setSymbolPickerOpen(false) }}
                trigger="click"
                placement="bottomLeft"
                styles={{ content: { padding: 6 } }}
                content={
                  <div className="grid grid-cols-6 gap-1" style={{ width: 380 }}>
                    {FLAGS.map(({ emoji, name }) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, flag: emoji })); setFlagPickerOpen(false) }}
                        className={cn(
                          'flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-colors hover:bg-muted',
                          form.flag === emoji && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
                        )}
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                        <span className="text-[9px] text-muted-foreground leading-none font-medium truncate w-full text-center px-0.5">{name}</span>
                      </button>
                    ))}
                  </div>
                }
              >
                <button
                  type="button"
                  className={cn(
                    'h-9 w-full flex items-center gap-2 rounded-md border border-border bg-background px-3 text-left transition-colors hover:bg-muted/40',
                    flagPickerOpen && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  {form.flag ? (
                    <>
                      <span className="text-xl leading-none">{form.flag}</span>
                      <span className="text-sm text-muted-foreground flex-1 truncate">
                        {FLAGS.find(f => f.emoji === form.flag)?.name ?? ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground flex-1">Chọn cờ quốc gia...</span>
                  )}
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {form.flag && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, flag: '' })) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setForm(f => ({ ...f, flag: '' })) } }}
                        className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <CloseOutlined className="h-3 w-3" />
                      </span>
                    )}
                    <DownOutlined className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-150', flagPickerOpen && 'rotate-180')} />
                  </div>
                </button>
              </AntPopover>
            </Field>

            {/* ── Symbol picker ── */}
            <Field>
              <FieldLabel>{t('form.symbol')}</FieldLabel>
              <AntPopover
                open={symbolPickerOpen}
                onOpenChange={(visible) => { setSymbolPickerOpen(visible); if (visible) setFlagPickerOpen(false) }}
                trigger="click"
                placement="bottomLeft"
                styles={{ content: { padding: 6 } }}
                content={
                  <div className="grid grid-cols-6 gap-1" style={{ width: 380 }}>
                    {SYMBOL_OPTIONS.map(({ char, name }) => (
                      <button
                        key={char}
                        type="button"
                        title={name}
                        onClick={() => { setForm(f => ({ ...f, symbol: char })); setSymbolPickerOpen(false) }}
                        className={cn(
                          'flex flex-col items-center gap-0.5 py-2 rounded-md transition-colors hover:bg-muted',
                          form.symbol === char && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
                        )}
                      >
                        <span className={cn('text-base font-bold leading-none tabular-nums', form.symbol === char ? 'text-primary' : 'text-muted-foreground')}>{char}</span>
                        <span className={cn('text-[10px] leading-none', form.symbol === char ? 'text-primary' : 'text-muted-foreground')}>{name}</span>
                      </button>
                    ))}
                  </div>
                }
              >
                <button
                  type="button"
                  className={cn(
                    'h-9 w-full flex items-center gap-2 rounded-md border border-border bg-background px-3 text-left transition-colors hover:bg-muted/40',
                    symbolPickerOpen && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  {form.symbol ? (() => {
                    const opt = SYMBOL_OPTIONS.find(o => o.char === form.symbol)
                    return (
                      <>
                        <span className="font-bold text-sm">{form.symbol}</span>
                        {opt && <span className="text-sm text-muted-foreground flex-1">{opt.name}</span>}
                      </>
                    )
                  })() : (
                    <span className="text-sm text-muted-foreground flex-1">Chọn ký hiệu tiền tệ...</span>
                  )}
                  <DownOutlined className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ml-auto shrink-0', symbolPickerOpen && 'rotate-180')} />
                </button>
              </AntPopover>
            </Field>

            <div className="grid grid-cols-2 gap-3 items-end">
              <Field>
                <FieldLabel>{t('form.sortOrder')}</FieldLabel>
                <InputNumber
                  precision={0}
                  min={1}
                  value={form.sortOrder ? Number(form.sortOrder) : null}
                  onChange={(v) => setForm((f) => ({ ...f, sortOrder: String(v ?? '') }))}
                  style={{ width: '100%' }}
                />
              </Field>
              <div className="flex items-center gap-2 pb-1">
                <Checkbox
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isActive: checked === true }))
                  }
                />
                <Label htmlFor="isActive" className="text-sm cursor-pointer">
                  {t('form.isActive')}
                </Label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog
        open={dialog?.mode === 'delete'}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          title={t('deleteConfirmTitle')}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isDeleting}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Spinner className="mr-2" />}
                {t('deleteConfirmButton')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="flex gap-3 py-2">
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <WarningOutlined className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm">
                Xóa tiền tệ{' '}
                {dialog?.mode === 'delete' && (
                  <span className="font-bold font-mono" style={{ color: '#4f46e5' }}>
                    {dialog.currency.code}
                  </span>
                )}
                {' '}— thao tác này không thể hoàn tác.
              </p>
              <p className="text-xs text-muted-foreground">
                Nếu tiền tệ đang được dùng trong ca bán hàng thao tác này sẽ thất bại.
                Hãy dùng{' '}
                <button
                  type="button"
                  className="underline underline-offset-2 cursor-pointer"
                  onClick={() => {
                    if (dialog?.mode === 'delete') {
                      openEdit(dialog.currency)
                    }
                  }}
                >
                  Tạm ẩn
                </button>
                {' '}thay thế.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Inline style constants ────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  borderBottom: '1px solid #f0f0f0',
  whiteSpace: 'nowrap',
}

const TD_STYLE: React.CSSProperties = {
  padding: '11px 16px',
  verticalAlign: 'middle',
}

const ACTION_BTN_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 28,
  width: 28,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: '#9ca3af',
  cursor: 'pointer',
  transition: 'all 0.12s',
}

const ACTION_BTN_HOVER: React.CSSProperties = {
  ...ACTION_BTN_STYLE,
  background: '#f3f4f6',
  color: '#374151',
}

const DEL_BTN_STYLE: React.CSSProperties = {
  ...ACTION_BTN_STYLE,
  color: '#f87171',
}

const DEL_BTN_HOVER: React.CSSProperties = {
  ...DEL_BTN_STYLE,
  background: '#fef2f2',
  color: '#dc2626',
}
