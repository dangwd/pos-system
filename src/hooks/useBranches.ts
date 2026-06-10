import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { branchRepository } from '@/lib/repositories/branch.repository'
import { getErrorMessage } from '@/lib/errors'
import type { AppLocale } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type {
  CreateBranchDto,
  UpdateBranchDto,
  CreateCounterDto,
  UpdateCounterDto,
} from '@/types/branch'

const BRANCHES_KEY = ['branches'] as const
const countersKey = (branchId: string) => ['branches', branchId, 'counters'] as const

function useBranchMutationBase() {
  const queryClient = useQueryClient()
  const locale = useLocale() as AppLocale
  const t = useTranslations('admin.branches')
  const invalidateBranches = () => queryClient.invalidateQueries({ queryKey: BRANCHES_KEY })
  const invalidateCounters = (branchId: string) =>
    queryClient.invalidateQueries({ queryKey: countersKey(branchId) })
  return { locale, t, invalidateBranches, invalidateCounters }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useBranches() {
  return useQuery({
    queryKey: [...BRANCHES_KEY],
    queryFn: () => branchRepository.getList(),
    staleTime: 300_000,
  })
}

export function useCounters(branchId: string | null) {
  return useQuery({
    queryKey: countersKey(branchId ?? ''),
    queryFn: () => branchRepository.getCounters(branchId!),
    staleTime: 120_000,
    enabled: !!branchId,
  })
}

// ─── Branch Mutations ─────────────────────────────────────────────────────────

export function useCreateBranch() {
  const { locale, t, invalidateBranches } = useBranchMutationBase()

  return useMutation<{ id: string; name: string }, ApiError, CreateBranchDto>({
    mutationFn: (dto) => branchRepository.create(dto),
    onSuccess: () => {
      invalidateBranches()
      toast.success(t('toasts.createBranchSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateBranch() {
  const { locale, t, invalidateBranches } = useBranchMutationBase()

  return useMutation<void, ApiError, { id: string; dto: UpdateBranchDto }>({
    mutationFn: ({ id, dto }) => branchRepository.update(id, dto).then(() => undefined),
    onSuccess: () => {
      invalidateBranches()
      toast.success(t('toasts.updateBranchSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Counter Mutations ────────────────────────────────────────────────────────

export function useCreateCounter() {
  const { locale, t, invalidateCounters } = useBranchMutationBase()

  return useMutation<void, ApiError, { branchId: string; dto: CreateCounterDto }>({
    mutationFn: ({ branchId, dto }) => branchRepository.createCounter(branchId, dto).then(() => undefined),
    onSuccess: (_, { branchId }) => {
      invalidateCounters(branchId)
      toast.success(t('toasts.createCounterSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateCounter() {
  const { locale, t, invalidateCounters } = useBranchMutationBase()

  return useMutation<void, ApiError, { branchId: string; counterId: string; dto: UpdateCounterDto }>({
    mutationFn: ({ branchId, counterId, dto }) =>
      branchRepository.updateCounter(branchId, counterId, dto).then(() => undefined),
    onSuccess: (_, { branchId }) => {
      invalidateCounters(branchId)
      toast.success(t('toasts.updateCounterSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeactivateCounter() {
  const { locale, t, invalidateCounters } = useBranchMutationBase()

  return useMutation<void, ApiError, { branchId: string; counterId: string }>({
    mutationFn: ({ branchId, counterId }) => branchRepository.deactivateCounter(branchId, counterId),
    onSuccess: (_, { branchId }) => {
      invalidateCounters(branchId)
      toast.success(t('toasts.deactivateCounterSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
