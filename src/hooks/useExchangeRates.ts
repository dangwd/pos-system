import { useQuery } from '@tanstack/react-query'
import { configRepository } from '@/lib/repositories/config.repository'

export function useExchangeRates() {
  return useQuery({
    queryKey: ['config', 'exchange-rates'],
    queryFn: () => configRepository.getExchangeRates(),
    staleTime: 60_000,
  })
}
