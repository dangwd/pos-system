'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configRepository } from '@/lib/repositories/config.repository'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

export default function PricesPage() {
  const t = useTranslations('admin.config.prices')
  const queryClient = useQueryClient()

  const { data: prices, isLoading } = useQuery({
    queryKey: ['config', 'prices'],
    queryFn: () => configRepository.getPrices(),
    staleTime: 60_000,
  })

  const [form, setForm] = useState({
    goldSellPricePerChi: '',
    goldBuyPricePerChi: '',
    silverPricePerGram: '',
  })

  useEffect(() => {
    if (prices) {
      setForm({
        goldSellPricePerChi: String(prices.goldSellPricePerChi),
        goldBuyPricePerChi:  String(prices.goldBuyPricePerChi),
        silverPricePerGram:  String(prices.silverPricePerGram),
      })
    }
  }, [prices])

  const { mutate: update, isPending } = useMutation({
    mutationFn: () => configRepository.updatePriceConfig({
      goldSellPricePerChi: Number(form.goldSellPricePerChi),
      goldBuyPricePerChi:  Number(form.goldBuyPricePerChi),
      silverPricePerGram:  Number(form.silverPricePerGram),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'prices'] })
      toast.success('Prices updated')
    },
    onError: () => toast.error('Failed to update prices'),
  })

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {prices && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('goldSell')} ({t('perChi')})</span>
                <span className="font-bold text-base">{formatKip(prices.goldSellPricePerChi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('goldBuy')} ({t('perChi')})</span>
                <span className="font-bold text-base">{formatKip(prices.goldBuyPricePerChi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('silverSell')} ({t('perGram')})</span>
                <span className="font-bold text-base">{formatKip(prices.silverPricePerGram)}</span>
              </div>
              <div className="pt-2 border-t text-xs text-muted-foreground">
                {t('updatedBy')}: {prices.updatedBy} · {t('effectiveFrom')}: {new Date(prices.effectiveFrom).toLocaleString('lo-LA')}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('form.goldSellLabel')}</Label>
              <Input
                type="number"
                min="0"
                value={form.goldSellPricePerChi}
                onChange={(e) => setForm(p => ({ ...p, goldSellPricePerChi: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.goldBuyLabel')}</Label>
              <Input
                type="number"
                min="0"
                value={form.goldBuyPricePerChi}
                onChange={(e) => setForm(p => ({ ...p, goldBuyPricePerChi: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.silverSellLabel')}</Label>
              <Input
                type="number"
                min="0"
                value={form.silverPricePerGram}
                onChange={(e) => setForm(p => ({ ...p, silverPricePerGram: e.target.value }))}
              />
            </div>

            <Button onClick={() => update()} disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('updateButton')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
