import { useQuery } from '@tanstack/react-query'
import { ProductRepository } from '@/lib/repositories/product.repository'

const repo = new ProductRepository()

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => repo.getAll(),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })
}
