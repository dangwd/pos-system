'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react'
import { InputNumber } from 'antd'
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

type EditingState = { id: string; tenDonVi: string; gramPerUnit: string } | null

export default function WeightUnitsPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.weightUnits')
  const [editing, setEditing] = useState<EditingState>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ tenDonVi: '', maTocDoc: '', gramPerUnit: '' })

  const { data: units = [], isLoading } = useWeightUnits()
  const { mutate: create, isPending: isCreating } = useCreateWeightUnit()
  const { mutate: update, isPending: isUpdating } = useUpdateWeightUnit()
  const { mutate: remove } = useDeleteWeightUnit()

  function startEdit(unit: WeightUnit) {
    setEditing({ id: unit.id, tenDonVi: unit.tenDonVi, gramPerUnit: String(unit.gramPerUnit) })
  }

  function saveEdit(unit: WeightUnit) {
    if (!editing) return
    const gramPerUnit = parseFloat(editing.gramPerUnit)
    if (!editing.tenDonVi || isNaN(gramPerUnit)) return
    update(
      { id: unit.id, dto: { tenDonVi: editing.tenDonVi, gramPerUnit } },
      { onSuccess: () => setEditing(null) },
    )
  }

  function handleCreate() {
    const gramPerUnit = parseFloat(createForm.gramPerUnit)
    if (!createForm.tenDonVi || !createForm.maTocDoc || isNaN(gramPerUnit)) return
    create(
      { tenDonVi: createForm.tenDonVi, maTocDoc: createForm.maTocDoc.toLowerCase(), gramPerUnit },
      { onSuccess: () => { setCreateOpen(false); setCreateForm({ tenDonVi: '', maTocDoc: '', gramPerUnit: '' }) } },
    )
  }


  if (!hasPermission('CONFIG_WEIGHT_UNIT')) return <ForbiddenPage />
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
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
                    {editing?.id === unit.id ? (
                      <Input
                        value={editing.tenDonVi}
                        onChange={(e) => setEditing((s) => s ? { ...s, tenDonVi: e.target.value } : s)}
                        className="h-7 text-xs w-28"
                        autoFocus
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        {unit.tenDonVi}
                        {unit.isSystem && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('systemBadge')}</Badge>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing?.id === unit.id ? (
                      <InputNumber
                        precision={4}
                        min={0}
                        size="small"
                        value={editing.gramPerUnit ? Number(editing.gramPerUnit) : null}
                        onChange={(v) => setEditing((s) => s ? { ...s, gramPerUnit: String(v ?? '') } : s)}
                        style={{ width: 96 }}
                      />                    ) : (
                      <span className="font-semibold">{unit.gramPerUnit}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing?.id === unit.id ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title={t('saveButton')}
                          disabled={isUpdating}
                          onClick={() => saveEdit(unit)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                        >
                          {isUpdating ? <Spinner className="size-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          title={t('cancel')}
                          onClick={() => setEditing(null)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title={t('edit')}
                          onClick={() => startEdit(unit)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!unit.isSystem && (
                          <button
                            type="button"
                            title={t('delete')}
                            onClick={() => remove(unit.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent
          className="sm:max-w-lg"
          title={t('createDialogTitle')}
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>{t('cancel')}</Button>
              <Button onClick={handleCreate} disabled={isCreating || !createForm.tenDonVi || !createForm.maTocDoc || !createForm.gramPerUnit}>
                {isCreating && <Spinner className="mr-2" />}
                {t('addButton')}
              </Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>{t('form.tenDonVi')}</FieldLabel>
              <Input value={createForm.tenDonVi} onChange={(e) => setCreateForm((f) => ({ ...f, tenDonVi: e.target.value }))} placeholder="Tael..." />
            </Field>
            <Field>
              <FieldLabel>{t('form.maTocDoc')}</FieldLabel>
              <Input value={createForm.maTocDoc} onChange={(e) => setCreateForm((f) => ({ ...f, maTocDoc: e.target.value }))} placeholder="tael" className="font-mono lowercase" />
            </Field>
            <Field>
              <FieldLabel>{t('form.gramPerUnit')}</FieldLabel>
              <InputNumber precision={4} min={0} value={createForm.gramPerUnit ? Number(createForm.gramPerUnit) : null} onChange={(v) => setCreateForm((f) => ({ ...f, gramPerUnit: String(v ?? '') }))} placeholder="37.799" style={{ width: '100%' }} />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
