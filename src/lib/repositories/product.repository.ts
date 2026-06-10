import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
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
  isActive?: boolean
}

export class ProductRepository {
  private readonly base = '/api/products'

  // ─── Products ───────────────────────────────────────────────────────────────

  async getAll(params?: ProductListParams): Promise<Product[]> {
    try {
      const { data } = await api.get<Product[]>(this.base, { params })
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async getById(id: string): Promise<Product> {
    try {
      const { data } = await api.get<Product>(`${this.base}/${id}`)
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async create(payload: CreateProductDto): Promise<Product> {
    try {
      const { data } = await api.post<Product>(this.base, payload)
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async update(id: string, payload: UpdateProductDto): Promise<Product> {
    try {
      const { data } = await api.put<Product>(`${this.base}/${id}`, payload)
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async deactivate(id: string): Promise<void> {
    try {
      await api.delete(`${this.base}/${id}`)
    } catch (err) { handleAxiosError(err) }
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const { data } = await api.get<ProductCategory[]>(`${this.base}/categories`)
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async createCategory(payload: CreateProductCategoryDto): Promise<ProductCategory> {
    try {
      const { data } = await api.post<ProductCategory>(`${this.base}/categories`, payload)
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async updateCategory(id: string, payload: UpdateProductCategoryDto): Promise<ProductCategory> {
    try {
      const { data } = await api.put<ProductCategory>(`${this.base}/categories/${id}`, payload)
      return data
    } catch (err) { handleAxiosError(err) }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete(`${this.base}/categories/${id}`)
    } catch (err) { handleAxiosError(err) }
  }
}

export const productRepository = new ProductRepository()
