'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customerRepository } from '@/lib/repositories/customer.repository'
import { DataTable } from '@/components/pos/DataTable'
import { createCustomerColumns } from '@/components/pos/columns/customer-columns'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function CustomersPage() {
  const t = useTranslations('admin.customers')
  const tStatus = useTranslations('admin.users.status')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerRepository.search({}),
    staleTime: 60_000,
  })

  const columns = useMemo(() => createCustomerColumns({
    name:       t('columns.name'),
    phone:      t('columns.phone'),
    loyalty:    'Loyalty',
    points:     'Points',
    status:     t('columns.lastVisit'),
    openMenu:   t('columns.openMenu'),
    viewDetail: t('columns.viewDetail'),
    active:     tStatus('active'),
    inactive:   tStatus('inactive'),
  }), [t, tStatus])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle', { count: customers.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          searchKey="name"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
    </div>
  )
}
