import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { customerRepository } from '@/lib/repositories/customer.repository'
import { getErrorMessage } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type { AppLocale } from '@/lib/errors'
import type { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerSearchParams } from '@/types/customer'

const CUSTOMERS_KEY = ['customers'] as const

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Dùng cho trang admin — tải danh sách với filter tuỳ chọn */
export function useCustomerList(params?: CustomerSearchParams) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, 'list', params],
    queryFn: () => customerRepository.search(params ?? {}),
    staleTime: 60_000,
  })
}

/** Dùng cho POS autocomplete — chỉ fetch khi có ít nhất 1 ký tự */
export function useCustomers(q: string) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, 'search', q],
    queryFn: () => customerRepository.search({ q, limit: 8 }),
    enabled: q.trim().length >= 1,
    staleTime: 30_000,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, id],
    queryFn: () => customerRepository.getById(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('admin.customers.toasts')
  const qc = useQueryClient()
  return useMutation<Customer, ApiError, CreateCustomerDto>({
    mutationFn: (dto) => customerRepository.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEY })
      toast.success(t('createSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateCustomer() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('admin.customers.toasts')
  const qc = useQueryClient()
  return useMutation<Customer, ApiError, { id: string; dto: UpdateCustomerDto }>({
    mutationFn: ({ id, dto }) => customerRepository.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEY })
      toast.success(t('updateSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
