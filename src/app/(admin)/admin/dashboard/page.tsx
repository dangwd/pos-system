'use client'

import { useQuery } from '@tanstack/react-query'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { productRepository } from '@/lib/repositories/product.repository'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Package, TrendingUp, Banknote, Loader2 } from 'lucide-react'
import type { Transaction } from '@/types/transaction'
import { useTranslations } from 'next-intl'

function formatKip(amount: number) {
  return amount.toLocaleString('lo-LA') + ' ₭'
}

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard')

  const { data: txPage, isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionRepository.getList(),
    staleTime: 30_000,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productRepository.getAll(),
    staleTime: 300_000,
  })

  const transactions = txPage?.data ?? []
  const revenue = transactions.reduce((sum: number, tx: Transaction) => sum + (tx.totalAmount ?? 0), 0)
  const avgTransaction = transactions.length ? revenue / transactions.length : 0
  const isLoading = txLoading || productsLoading

  const STATS = [
    { labelKey: 'stats.totalTransactions', value: transactions.length, icon: ClipboardList, color: 'text-blue-500' },
    { labelKey: 'stats.revenue',           value: formatKip(revenue),  icon: Banknote,      color: 'text-green-500' },
    { labelKey: 'stats.avgTransaction',    value: formatKip(avgTransaction), icon: TrendingUp, color: 'text-purple-500' },
    { labelKey: 'stats.products',          value: products.length,     icon: Package,       color: 'text-orange-500' },
  ]

  return (
    <div className="p-6 space-y-6">
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
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {STATS.map(({ labelKey, value, icon: Icon, color }) => (
              <Card key={labelKey}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t(labelKey as Parameters<typeof t>[0])}</CardTitle>
                  <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('recentTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">{t('empty')}</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((tx: Transaction) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tx.invoiceCode ?? `#${tx.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <span className="ml-3 text-muted-foreground text-xs">{tx.transactionType}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{tx.status}</Badge>
                        <span className="font-semibold tabular-nums">{formatKip(tx.totalAmount ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
