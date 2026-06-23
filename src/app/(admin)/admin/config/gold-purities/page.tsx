'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Table, Button, Card, Select as AntSelect } from 'antd'
import type { TableColumnsType } from 'antd'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Button as ShadButton } from '@/components/ui/button'
import {
  useGoldPurities,
  useCreateGoldPurity,
  useUpdateGoldPurity,
  useDeleteGoldPurity,
} from '@/hooks/useConfig'
import type { GoldPurity } from '@/types/config'

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}

type DialogState = { mode: 'create' } | { mode: 'edit'; purity: GoldPurity } | null

const EMPTY_FORM = { ma: '', hamLuong: '', category: 'Gold' as 'Gold' | 'Silver' }

export default function GoldPuritiesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.goldPurities')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: purities = [], isLoading } = useGoldPurities()
  const { mutate: create, isPending: isCreating } = useCreateGoldPurity()
  const { mutate: update, isPending: isUpdating } = useUpdateGoldPurity()
  const { mutate: remove } = useDeleteGoldPurity()

  const isPending = isCreating || isUpdating

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialog({ mode: 'create' })
  }

  function openEdit(p: GoldPurity) {
    setForm({ ma: p.ma, hamLuong: String(p.hamLuong), category: p.category ?? 'Gold' })
    setDialog({ mode: 'edit', purity: p })
  }

  function handleSubmit() {
    const hamLuong = parseFloat(form.hamLuong)
    if (!form.ma || isNaN(hamLuong)) return
    if (dialog?.mode === 'create') {
      create({ ma: form.ma.trim(), hamLuong, category: form.category }, { onSuccess: () => setDialog(null) })
    } else if (dialog?.mode === 'edit') {
      update(
        { id: dialog.purity.id, dto: { ma: form.ma.trim(), hamLuong, category: form.category } },
        { onSuccess: () => setDialog(null) },
      )
    }
  }

  const columns: TableColumnsType<GoldPurity> = [
    {
      title: t('columns.code'),
      dataIndex: 'ma',
      key: 'ma',
      render: (v: string) => <span className="font-mono font-bold">{v}</span>,
    },
    {
      title: t('columns.category'),
      key: 'category',
      render: (_: unknown, row: GoldPurity) => (
        <Badge variant={(row.category ?? 'Gold') === 'Gold' ? 'default' : 'secondary'}>
          {(row.category ?? 'Gold') === 'Gold' ? t('categoryGold') : t('categorySilver')}
        </Badge>
      ),
    },
    {
      title: t('columns.fineness'),
      dataIndex: 'hamLuong',
      key: 'hamLuong',
      align: 'right',
      render: (v: number) => <span>{v}%</span>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      width: 80,
      render: (_: unknown, row: GoldPurity) => (
        <span className="flex items-center justify-end gap-1">
          <button
            type="button"
            title={t('edit')}
            onClick={() => openEdit(row)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <EditOutlined className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t('delete')}
            onClick={() => remove(row.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
          >
            <DeleteOutlined className="h-3.5 w-3.5" />
          </button>
        </span>
      ),
    },
  ]

  if (!hasPermission('CONFIG_GOLD_PURITY')) return <ForbiddenPage />

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: purities.length })}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('addButton')}
        </Button>
      </div>

      {/* ── Bảng ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <Table<GoldPurity>
          rowKey="id"
          columns={columns}
          dataSource={purities}
          loading={isLoading}
          size="middle"
          pagination={false}
        />
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent
          className="sm:max-w-lg"
          title={dialog?.mode === 'create' ? t('addButton') : t('editDialogTitle')}
          footer={
            <DialogFooter>
              <ShadButton variant="outline" onClick={() => setDialog(null)} disabled={isPending}>{t('cancel')}</ShadButton>
              <ShadButton onClick={handleSubmit} disabled={isPending || !form.ma || !form.hamLuong}>
                {isPending && <Spinner className="mr-2" />}
                {dialog?.mode === 'create' ? t('addButton') : t('saveButton')}
              </ShadButton>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>{t('form.ma')}</FieldLabel>
              <Input value={form.ma} onChange={(e) => setForm((f) => ({ ...f, ma: e.target.value }))} placeholder="9999, 24K, 925..." className="font-mono" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>{t('form.hamLuong')}</FieldLabel>
                <InputNumber precision={2} min={0} max={100} value={form.hamLuong ? Number(form.hamLuong) : null} onChange={(v) => setForm((f) => ({ ...f, hamLuong: String(v ?? '') }))} placeholder="99.99" style={{ width: '100%' }} />
              </Field>
              <Field>
                <FieldLabel>{t('form.category')}</FieldLabel>
                <AntSelect
                  value={form.category}
                  onChange={(v) => v && setForm((f) => ({ ...f, category: v as 'Gold' | 'Silver' }))}
                  options={[
                    { value: 'Gold',   label: t('categoryGold') },
                    { value: 'Silver', label: t('categorySilver') },
                  ]}
                  style={{ width: '100%' }}
                  popupMatchSelectWidth={false}
                />
              </Field>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
