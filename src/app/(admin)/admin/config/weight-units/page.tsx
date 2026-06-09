'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configRepository } from '@/lib/repositories/config.repository'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { WeightUnit } from '@/types/config'

export default function WeightUnitsPage() {
  const t = useTranslations('admin.config.weightUnits')
  const queryClient = useQueryClient()

  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['config', 'weight-units'],
    queryFn: () => configRepository.getWeightUnits(),
    staleTime: 300_000,
  })

  const { mutate: update, isPending } = useMutation({
    mutationFn: (unit: WeightUnit) => configRepository.updateWeightUnit(
      unit.maTocDoc,
      Number(editValue),
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'weight-units'] })
      setEditingCode(null)
      toast.success('Updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  function startEdit(unit: WeightUnit) {
    setEditingCode(unit.maTocDoc)
    setEditValue(String(unit.gramPerUnit))
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border max-w-lg">
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
                <tr key={unit.maTocDoc} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{unit.maTocDoc}</td>
                  <td className="px-4 py-3">{unit.tenDonVi}</td>
                  <td className="px-4 py-3 text-right">
                    {editingCode === unit.maTocDoc ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 w-24 text-right ml-auto"
                        autoFocus
                      />
                    ) : (
                      <span className="font-semibold">{unit.gramPerUnit}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingCode === unit.maTocDoc ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-primary"
                          disabled={isPending}
                          onClick={() => update(unit)}
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingCode(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(unit)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
