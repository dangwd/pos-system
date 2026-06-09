'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configRepository } from '@/lib/repositories/config.repository'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

export default function StonePricesPage() {
  const t = useTranslations('admin.config.stonePrices')
  const queryClient = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ tuSoChi: '', denSoChi: '', giaDa: '' })

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['config', 'stone-prices'],
    queryFn: () => configRepository.getStonePriceRules(),
    staleTime: 300_000,
  })

  const { mutate: addRule, isPending: isAdding } = useMutation({
    mutationFn: () => configRepository.createStonePriceRule({
      tuSoChi:  Number(form.tuSoChi),
      denSoChi: Number(form.denSoChi),
      giaDa:    Number(form.giaDa),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'stone-prices'] })
      setAddOpen(false)
      setForm({ tuSoChi: '', denSoChi: '', giaDa: '' })
    },
    onError: () => toast.error('Failed to add rule'),
  })

  const { mutate: deleteRule } = useMutation({
    mutationFn: (id: string) => configRepository.deleteStonePriceRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'stone-prices'] })
    },
    onError: () => toast.error('Failed to delete rule'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addButton')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border max-w-xl">
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
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">—</td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">{rule.tuSoChi}</td>
                    <td className="px-4 py-3">{rule.denSoChi}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatKip(rule.giaDa)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addButton')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('columns.weightFrom')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.tuSoChi}
                  onChange={(e) => setForm(p => ({ ...p, tuSoChi: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('columns.weightTo')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.denSoChi}
                  onChange={(e) => setForm(p => ({ ...p, denSoChi: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('columns.fee')}</Label>
              <Input
                type="number"
                min="0"
                value={form.giaDa}
                onChange={(e) => setForm(p => ({ ...p, giaDa: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addRule()}
              disabled={isAdding || !form.tuSoChi || !form.denSoChi || !form.giaDa}
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
