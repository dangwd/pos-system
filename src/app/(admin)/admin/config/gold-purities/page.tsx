'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Select } from 'antd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import {
  useGoldPurities,
  useCreateGoldPurity,
  useUpdateGoldPurity,
  useDeleteGoldPurity,
} from '@/hooks/useConfig'
import type { GoldPurity } from '@/types/config'

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


  if (!hasPermission('CONFIG_GOLD_PURITY')) return <ForbiddenPage />
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addButton')}
        </Button>
      </div>

      {isLoading ? <TablePageSkeleton cols={4} rows={5} /> : (
        <div className="rounded-md border shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.code')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.category')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.fineness')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {purities.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
              ) : (
                purities.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-bold">{p.ma}</td>
                    <td className="px-4 py-3">
                      <Badge variant={(p.category ?? 'Gold') === 'Gold' ? 'default' : 'secondary'}>
                        {(p.category ?? 'Gold') === 'Gold' ? t('categoryGold') : t('categorySilver')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{p.hamLuong}%</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title={t('edit')}
                          onClick={() => openEdit(p)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={t('delete')}
                          onClick={() => remove(p.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
              <Button onClick={handleSubmit} disabled={isPending || !form.ma || !form.hamLuong}>
                {isPending && <Spinner className="mr-2" />}
                {dialog?.mode === 'create' ? t('addButton') : t('saveButton')}
              </Button>
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
                <NumberInput decimals={2} min={0} max={100} value={form.hamLuong} onChange={(v) => setForm((f) => ({ ...f, hamLuong: v }))} placeholder="99.99" />
              </Field>
              <Field>
                <FieldLabel>{t('form.category')}</FieldLabel>
                <Select
                  value={form.category}
                  onChange={(v) => v && setForm((f) => ({ ...f, category: v as 'Gold' | 'Silver' }))}
                  options={[
                    { value: 'Gold',   label: t('categoryGold') },
                    { value: 'Silver', label: t('categorySilver') },
                  ]}
                  className="w-full"
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
