import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type PagedResult, type RawPagedResult } from '@/types/common'
import type {
  Product,
  ProductWithStock,
  ProductCategory,
  CreateProductDto,
  UpdateProductDto,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  CheckDuplicateResponse,
} from '@/types/product'

export interface ProductListParams {
  categoryCode?: string
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface WithStockParams {
  counterId?: string
  categoryCode?: string
  search?: string
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

  async getWithStock(params?: WithStockParams): Promise<ProductWithStock[]> {
    try {
      const { data } = await api.get<ProductWithStock[]>(`${this.base}/with-stock`, { params })
      return data
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

  async activate(id: string): Promise<void> {
    try {
      await api.patch(`${this.base}/${id}/activate`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async deactivate(id: string): Promise<void> {
    try {
      await api.patch(`${this.base}/${id}/deactivate`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  // TODO: thay endpoint thực tế nếu BE dùng tên khác
  async checkDuplicate(productName: string, categoryId?: string): Promise<CheckDuplicateResponse> {
    try {
      const { data } = await api.get<CheckDuplicateResponse>(`${this.base}/check-duplicate`, {
        params: { productName, categoryId },
      })
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const { data } = await api.get<ProductCategory[]>(`${this.base}/categories`)
      return data
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
