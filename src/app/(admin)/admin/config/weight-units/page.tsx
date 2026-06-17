'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { InputNumber } from '@/components/ui/antd-number-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import {
  useWeightUnits,
  useCreateWeightUnit,
  useUpdateWeightUnit,
  useDeleteWeightUnit,
} from '@/hooks/useConfig'
import type { WeightUnit } from '@/types/config'

type FormState = { tenDonVi: string; maTocDoc: string; gramPerUnit: string }
type DialogState = { mode: 'create' } | { mode: 'edit'; unit: WeightUnit } | null

const EMPTY_FORM: FormState = { tenDonVi: '', maTocDoc: '', gramPerUnit: '' }

export default function WeightUnitsPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.weightUnits')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const { data: units = [], isLoading } = useWeightUnits()
  const { mutate: create, isPending: isCreating } = useCreateWeightUnit()
  const { mutate: update, isPending: isUpdating } = useUpdateWeightUnit()
  const { mutate: remove } = useDeleteWeightUnit()

  const isSaving = isCreating || isUpdating

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialog({ mode: 'create' })
  }

  function openEdit(unit: WeightUnit) {
    setForm({ tenDonVi: unit.tenDonVi, maTocDoc: unit.maTocDoc, gramPerUnit: String(unit.gramPerUnit) })
    setDialog({ mode: 'edit', unit })
  }

  function closeDialog() {
    setDialog(null)
    setForm(EMPTY_FORM)
  }

  function handleSubmit() {
    if (!dialog) return
    const gramPerUnit = parseFloat(form.gramPerUnit)
    if (!form.tenDonVi || isNaN(gramPerUnit)) return

    if (dialog.mode === 'edit') {
      update(
        { id: dialog.unit.id, dto: { tenDonVi: form.tenDonVi, gramPerUnit } },
        { onSuccess: closeDialog },
      )
      return
    }

    if (!form.maTocDoc) return
    create(
      { tenDonVi: form.tenDonVi, maTocDoc: form.maTocDoc.toLowerCase(), gramPerUnit },
      { onSuccess: closeDialog },
    )
  }

  if (!hasPermission('CONFIG_WEIGHT_UNIT')) return <ForbiddenPage />

  const isEdit = dialog?.mode === 'edit'
  const canSubmit = !!form.tenDonVi && !!form.gramPerUnit && (isEdit || !!form.maTocDoc)

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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.code')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.name')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.gramPerUnit')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{unit.maTocDoc}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {unit.tenDonVi}
                      {unit.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('systemBadge')}</Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold">{unit.gramPerUnit}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={t('edit')}
                        onClick={() => openEdit(unit)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <EditOutlined className="h-3.5 w-3.5" />
                      </button>
                      {!unit.isSystem && (
                        <button
                          type="button"
                          title={t('delete')}
                          onClick={() => remove(unit.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <DeleteOutlined className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent
          className="sm:max-w-lg"
          title={isEdit ? t('editDialogTitle') : t('createDialogTitle')}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={isSaving}>{t('cancel')}</Button>
              <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
                {isSaving && <Spinner className="mr-2" />}
                {isEdit ? t('saveButton') : t('addButton')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>{t('form.tenDonVi')}</FieldLabel>
              <Input value={form.tenDonVi} onChange={(e) => setForm((f) => ({ ...f, tenDonVi: e.target.value }))} placeholder="Tael..." />
            </Field>
            <Field>
              <FieldLabel>{t('form.maTocDoc')}</FieldLabel>
              <Input value={form.maTocDoc} onChange={(e) => setForm((f) => ({ ...f, maTocDoc: e.target.value }))} placeholder="tael" className="font-mono lowercase" disabled={isEdit} />
            </Field>
            <Field>
              <FieldLabel>{t('form.gramPerUnit')}</FieldLabel>
              <InputNumber min={0} value={form.gramPerUnit ? Number(form.gramPerUnit) : null} onChange={(v) => setForm((f) => ({ ...f, gramPerUnit: String(v ?? '') }))} placeholder="37.799" style={{ width: '100%' }} />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
