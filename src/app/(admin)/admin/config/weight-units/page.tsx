'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
        <div className="rounded-md border">
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
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={editing.gramPerUnit}
                        onChange={(e) => setEditing((s) => s ? { ...s, gramPerUnit: e.target.value } : s)}
                        className="h-7 w-24 text-right ml-auto text-xs"
                      />
                    ) : (
                      <span className="font-semibold">{unit.gramPerUnit}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing?.id === unit.id ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" disabled={isUpdating} onClick={() => saveEdit(unit)}>
                          {isUpdating ? <Spinner className="size-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(unit)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!unit.isSystem && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(unit.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('createDialogTitle')}</DialogTitle>
          </DialogHeader>
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
              <Input type="number" min="0" step="0.001" value={createForm.gramPerUnit} onChange={(e) => setCreateForm((f) => ({ ...f, gramPerUnit: e.target.value }))} placeholder="37.799" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>{t('cancel')}</Button>
            <Button onClick={handleCreate} disabled={isCreating || !createForm.tenDonVi || !createForm.maTocDoc || !createForm.gramPerUnit}>
              {isCreating && <Spinner className="mr-2" />}
              {t('addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
