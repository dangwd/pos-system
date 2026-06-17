'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { InputNumber } from 'antd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import {
  useStonePriceRules,
  useCreateStonePriceRule,
  useUpdateStonePriceRule,
  useDeleteStonePriceRule,
} from '@/hooks/useConfig'
import type { StonePriceRule } from '@/types/config'

type DialogState = { mode: 'create' } | { mode: 'edit'; rule: StonePriceRule } | null

const EMPTY_FORM = { tuSoChi: '', denSoChi: '', giaDa: '' }

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

export default function StonePricesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.stonePrices')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: rules = [], isLoading } = useStonePriceRules()
  const { mutate: create, isPending: isCreating } = useCreateStonePriceRule()
  const { mutate: update, isPending: isUpdating } = useUpdateStonePriceRule()
  const { mutate: remove } = useDeleteStonePriceRule()

  const isPending = isCreating || isUpdating

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialog({ mode: 'create' })
  }

  function openEdit(rule: StonePriceRule) {
    setForm({ tuSoChi: String(rule.tuSoChi), denSoChi: String(rule.denSoChi), giaDa: String(rule.giaDa) })
    setDialog({ mode: 'edit', rule })
  }

  function handleSubmit() {
    const dto = { tuSoChi: Number(form.tuSoChi), denSoChi: Number(form.denSoChi), giaDa: Number(form.giaDa) }
    if (!form.tuSoChi || !form.denSoChi || !form.giaDa) return
    if (dialog?.mode === 'create') {
      create(dto, { onSuccess: () => setDialog(null) })
    } else if (dialog?.mode === 'edit') {
      update({ id: dialog.rule.id, dto }, { onSuccess: () => setDialog(null) })
    }
  }

  const isFormValid = !!form.tuSoChi && !!form.denSoChi && !!form.giaDa


  if (!hasPermission('CONFIG_STONE_PRICE')) return <ForbiddenPage />
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button size="sm" onClick={openCreate}>
          <PlusOutlined className="h-4 w-4 mr-1" />
          {t('addButton')}
        </Button>
      </div>

      {isLoading ? <TablePageSkeleton cols={4} rows={4} /> : (
        <div className="rounded-md border shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.weightFrom')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.weightTo')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.fee')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">{rule.tuSoChi}</td>
                    <td className="px-4 py-3">{rule.denSoChi}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatKip(rule.giaDa)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title={t('edit')}
                          onClick={() => openEdit(rule)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <EditOutlined className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={t('delete')}
                          onClick={() => remove(rule.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <DeleteOutlined className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent
          className="sm:max-w-lg"
          title={dialog?.mode === 'create' ? t('addButton') : t('editDialogTitle')}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>{t('cancel')}</Button>
              <Button onClick={handleSubmit} disabled={isPending || !isFormValid}>
                {isPending && <Spinner className="mr-2" />}
                {dialog?.mode === 'create' ? t('addButton') : t('saveButton')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>{t('columns.weightFrom')}</FieldLabel>
                <InputNumber precision={2} min={0} value={form.tuSoChi ? Number(form.tuSoChi) : null} onChange={(v) => setForm((f) => ({ ...f, tuSoChi: String(v ?? '') }))} style={{ width: '100%' }} />
              </Field>
              <Field>
                <FieldLabel>{t('columns.weightTo')}</FieldLabel>
                <InputNumber precision={2} min={0} value={form.denSoChi ? Number(form.denSoChi) : null} onChange={(v) => setForm((f) => ({ ...f, denSoChi: String(v ?? '') }))} style={{ width: '100%' }} />
              </Field>
            </div>
            <Field>
              <FieldLabel>{t('columns.fee')}</FieldLabel>
              <InputNumber min={0} value={form.giaDa ? Number(form.giaDa) : null} onChange={(v) => setForm((f) => ({ ...f, giaDa: String(v ?? '') }))} style={{ width: '100%' }} />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
