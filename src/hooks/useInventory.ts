import { useQuery } from '@tanstack/react-query'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import type { InventoryListParams } from '@/types/inventory'

const INVENTORY_KEY = ['inventory'] as const

export function useInventory(params?: InventoryListParams) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, params],
    queryFn: () => inventoryRepository.getList(params),
    staleTime: 60_000,
  })
}
