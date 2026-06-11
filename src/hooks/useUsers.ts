import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { userRepository, type UserListParams } from '@/lib/repositories/user.repository'
import { getErrorMessage } from '@/lib/errors'
import type { AppLocale } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type {
  AssignCounterDto,
  CreateAdminUserDto,
  CreateUserResponse,
  UpdateAdminUserDto,
  UpdateRoleDto,
  ResetPasswordDto,
} from '@/types/admin-user'

const USERS_KEY = ['users'] as const

function useUserMutationBase() {
  const queryClient = useQueryClient()
  const locale = useLocale() as AppLocale
  const t = useTranslations('admin.users')
  const invalidate = () => queryClient.invalidateQueries({ queryKey: USERS_KEY })
  return { locale, t, invalidate }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: () => userRepository.getList(params),
    staleTime: 60_000,
  })
}

export function useUsersPaged(params?: UserListParams) {
  return useQuery({
    queryKey: [...USERS_KEY, 'paged', params],
    queryFn: () => userRepository.getListPaged(params),
    staleTime: 60_000,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: () => userRepository.getById(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const { locale, t, invalidate } = useUserMutationBase()

  return useMutation<CreateUserResponse, ApiError, CreateAdminUserDto>({
    mutationFn: (dto) => userRepository.create(dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('toasts.createSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateUser() {
  const { locale, t, invalidate } = useUserMutationBase()

  return useMutation<void, ApiError, { id: string; dto: UpdateAdminUserDto }>({
    mutationFn: ({ id, dto }) => userRepository.update(id, dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('toasts.updateSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateUserRole() {
  const { locale, t, invalidate } = useUserMutationBase()

  return useMutation<void, ApiError, { id: string; dto: UpdateRoleDto }>({
    mutationFn: ({ id, dto }) => userRepository.updateRole(id, dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('toasts.updateRoleSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useActivateUser() {
  const { locale, t, invalidate } = useUserMutationBase()

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => userRepository.activate(id),
    onSuccess: () => {
      invalidate()
      toast.success(t('toasts.activateSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeactivateUser() {
  const { locale, t, invalidate } = useUserMutationBase()

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => userRepository.deactivate(id),
    onSuccess: () => {
      invalidate()
      toast.success(t('toasts.deactivateSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useResetPassword() {
  const { locale, t } = useUserMutationBase()

  return useMutation<void, ApiError, { id: string; dto: ResetPasswordDto }>({
    mutationFn: ({ id, dto }) => userRepository.resetPassword(id, dto),
    onSuccess: () => toast.success(t('toasts.resetPasswordSuccess')),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useAssignCounter() {
  const { locale, t, invalidate } = useUserMutationBase()

  return useMutation<void, ApiError, { id: string; dto: AssignCounterDto }>({
    mutationFn: ({ id, dto }) => userRepository.assignCounter(id, dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('toasts.assignCounterSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
