// ─── Danh mục sản phẩm ───────────────────────────────────────────────────────

export interface ProductCategory {
  id: string
  code: string
  name: string
  sortOrder: number
}

// ─── Enum ─────────────────────────────────────────────────────────────────────

export type ProductType = 'NguyenKhoi' | 'CanThucTe'

// ─── Sản phẩm ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  productCode: string
  productName: string
  category: ProductCategory
  purity: string
  weightGram: number
  weightUnitId: string | null
  productType: ProductType
  isActive: boolean
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateProductDto {
  productCode: string
  productName: string
  productCategoryId: string
  purity: string
  weightGram: number
  weightUnitId?: string
  productType?: ProductType
}

export interface UpdateProductDto {
  productName: string
  productCategoryId: string
  purity: string
  weightGram: number
  weightUnitId?: string
  productType?: ProductType
}

export interface CreateProductCategoryDto {
  code: string
  name: string
  sortOrder: number
}

export interface UpdateProductCategoryDto {
  name: string
  sortOrder: number
}
