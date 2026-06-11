import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type PagedResult, type RawPagedResult } from '@/types/common'
import type {
  Product,
  ProductCategory,
  CreateProductDto,
  UpdateProductDto,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '@/types/product'

export interface ProductListParams {
  categoryCode?: string
  search?: string
  page?: number
  pageSize?: number
}

export class ProductRepository {
  private readonly base = '/api/products'

  // ─── Products ───────────────────────────────────────────────────────────────

  async getAll(params?: ProductListParams): Promise<Product[]> {
    try {
      const { data } = await api.get<Product[] | RawPagedResult<Product>>(this.base, { params })
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Danh sách sản phẩm có phân trang (server-side).
   * Luôn truyền page (mặc định 1) để backend trả PagedResult thay vì mảng phẳng.
   */
  async getPaged(params?: ProductListParams): Promise<PagedResult<Product>> {
    try {
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawPagedResult<Product>>(this.base, { params: queryParams })
      return normalizePaged(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async getById(id: string): Promise<Product> {
    try {
      const { data } = await api.get<Product>(`${this.base}/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async create(payload: CreateProductDto): Promise<{ id: string; productCode: string }> {
    try {
      const { data } = await api.post<{ id: string; productCode: string }>(this.base, payload)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async update(id: string, payload: UpdateProductDto): Promise<Product> {
    try {
      const { data } = await api.put<Product>(`${this.base}/${id}`, payload)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async deactivate(id: string): Promise<void> {
    try {
      await api.delete(`${this.base}/${id}`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const { data } = await api.get<ProductCategory[] | RawPagedResult<ProductCategory>>(`${this.base}/categories`)
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async createCategory(payload: CreateProductCategoryDto): Promise<ProductCategory> {
    try {
      const { data } = await api.post<ProductCategory>(`${this.base}/categories`, payload)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async updateCategory(id: string, payload: UpdateProductCategoryDto): Promise<ProductCategory> {
    try {
      const { data } = await api.put<ProductCategory>(`${this.base}/categories/${id}`, payload)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete(`${this.base}/categories/${id}`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const productRepository = new ProductRepository()
