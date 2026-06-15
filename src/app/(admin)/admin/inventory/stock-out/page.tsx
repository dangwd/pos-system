'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { StockOutListPage } from '@/components/admin/inventory/StockOutListPage'

export default function StockOutPage() {
  const { hasPermission } = usePermission()
  if (!hasPermission('INVENTORY_MANAGE')) return <ForbiddenPage />

  return <StockOutListPage />
}
