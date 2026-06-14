'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { StockInListPage } from '@/components/admin/inventory/StockInListPage'

export default function StockInPage() {
  const { hasPermission } = usePermission()
  if (!hasPermission('INVENTORY_MANAGE')) return <ForbiddenPage />

  return <StockInListPage />
}
