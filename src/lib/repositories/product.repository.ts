/**
 * repositories/product.repository.ts
 *
 * Khớp với endpoints:
 *   GET  /api/products             → danh sách sản phẩm (filter by categoryCode)
 *   GET  /api/products/{id}        → chi tiết sản phẩm
 *   POST /api/products             → tạo sản phẩm mới
 *   GET  /api/product-categories   → danh sách danh mục
 */

import api from '@/lib/axios'
import type { Product, ProductCategory, CreateProductDto } from '@/types/product'

export interface ProductListParams {
  categoryCode?: string
  search?: string
  isActive?: boolean
}

export class ProductRepository {
  private readonly base = '/api/products'
  private readonly catBase = '/api/product-categories'

  async getAll(params?: ProductListParams): Promise<Product[]> {
    const { data } = await api.get<Product[]>(this.base, { params })
    return data
  }

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`${this.base}/${id}`)
    return data
  }

  async create(payload: CreateProductDto): Promise<Product> {
    const { data } = await api.post<Product>(this.base, payload)
    return data
  }

  async getCategories(): Promise<ProductCategory[]> {
    const { data } = await api.get<ProductCategory[]>(this.catBase)
    return data
  }
}

export const productRepository = new ProductRepository()
