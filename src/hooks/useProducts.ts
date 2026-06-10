import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { productRepository } from '@/lib/repositories/product.repository'
import { getErrorMessage } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type { AppLocale } from '@/lib/errors'
import type {
  CreateProductDto,
  UpdateProductDto,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '@/types/product'

const PRODUCTS_KEY = ['products'] as const
const CATEGORIES_KEY = ['product-categories'] as const

function useProductMutationBase() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('admin.products.toasts')
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
    qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
  }
  return { locale, t, invalidate, invalidateAll }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () => productRepository.getAll(),
    staleTime: 300_000,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => productRepository.getById(id),
    staleTime: 300_000,
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => productRepository.getCategories(),
    staleTime: 600_000,
  })
}

// ─── Product mutations ────────────────────────────────────────────────────────

export function useCreateProduct() {
  const { locale, t, invalidate } = useProductMutationBase()
  return useMutation<{ id: string }, ApiError, CreateProductDto>({
    mutationFn: (dto) => productRepository.create(dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('createSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateProduct() {
  const { locale, t, invalidate } = useProductMutationBase()
  return useMutation<{ id: string }, ApiError, { id: string; dto: UpdateProductDto }>({
    mutationFn: ({ id, dto }) => productRepository.update(id, dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('updateSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeactivateProduct() {
  const { locale, t, invalidate } = useProductMutationBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => productRepository.deactivate(id),
    onSuccess: () => {
      invalidate()
      toast.success(t('deactivateSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Category mutations ───────────────────────────────────────────────────────

export function useCreateCategory() {
  const { locale, invalidateAll } = useProductMutationBase()
  return useMutation<{ id: string }, ApiError, CreateProductCategoryDto>({
    mutationFn: (dto) => productRepository.createCategory(dto),
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateCategory() {
  const { locale, invalidateAll } = useProductMutationBase()
  return useMutation<{ id: string }, ApiError, { id: string; dto: UpdateProductCategoryDto }>({
    mutationFn: ({ id, dto }) => productRepository.updateCategory(id, dto),
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteCategory() {
  const { locale, invalidateAll } = useProductMutationBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => productRepository.deleteCategory(id),
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
