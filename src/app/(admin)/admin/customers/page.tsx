'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customerRepository } from '@/lib/repositories/customer.repository'
import { DataTable } from '@/components/shared/DataTable'
import { createCustomerColumns } from '@/components/admin/columns/customer-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

const PAGE_SIZE = 20

export default function CustomersPage() {
  const t = useTranslations('admin.customers')
  const tStatus = useTranslations('admin.users.status')

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => { setFilterSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search: filterSearch, page, pageSize: PAGE_SIZE }],
    queryFn: () => customerRepository.getListPaged({
      search: filterSearch || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 60_000,
  })

  const customers = data?.data ?? []

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
          {t('subtitle', { count: data?.total ?? 0 })}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="h-8 w-56 text-sm"
        />
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={customers}
          hideSearch
          serverPagination={data ? {
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}
    </div>
  )
}
