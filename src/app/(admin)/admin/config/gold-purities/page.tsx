'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configRepository } from '@/lib/repositories/config.repository'
import { Loader2, Plus } from 'lucide-react'
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

export default function GoldPuritiesPage() {
  const t = useTranslations('admin.config.goldPurities')
  const queryClient = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ ma: '', hamLuong: '' })

  const { data: purities = [], isLoading } = useQuery({
    queryKey: ['config', 'gold-purities'],
    queryFn: () => configRepository.getGoldPurities(),
    staleTime: 300_000,
  })

  const { mutate: addPurity, isPending } = useMutation({
    mutationFn: () => configRepository.createGoldPurity({
      ma:       form.ma,
      hamLuong: Number(form.hamLuong),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'gold-purities'] })
      setAddOpen(false)
      setForm({ ma: '', hamLuong: '' })
    },
    onError: () => toast.error('Failed to add purity'),
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
        <div className="rounded-md border max-w-md">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.code')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.label')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('columns.fineness')}</th>
              </tr>
            </thead>
            <tbody>
              {purities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">—</td>
                </tr>
              ) : (
                purities.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-bold">{p.ma}</td>
                    <td className="px-4 py-3">{p.ma}</td>
                    <td className="px-4 py-3 text-right">{p.hamLuong}‰</td>
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
            <div className="space-y-1.5">
              <Label>{t('columns.code')}</Label>
              <Input
                value={form.ma}
                onChange={(e) => setForm(p => ({ ...p, ma: e.target.value }))}
                placeholder="9999, 750, 585..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('columns.fineness')}</Label>
              <Input
                type="number"
                min="0"
                max="1000"
                value={form.hamLuong}
                onChange={(e) => setForm(p => ({ ...p, hamLuong: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addPurity()} disabled={isPending || !form.ma || !form.hamLuong}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
