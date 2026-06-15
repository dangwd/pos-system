// ─── Danh mục sản phẩm ───────────────────────────────────────────────────────

export interface ProductCategory {
  id: string
  code: string
  name: string
  sortOrder: number
}

// ─── Enum ─────────────────────────────────────────────────────────────────────

export type ProductType = 'NguyenKhoi' | 'CanThucTe'

// ─── Sản phẩm (GET /api/products) ─────────────────────────────────────────────

export interface Product {
  id: string
  productCode: string
  productName: string
  category: ProductCategory
  goldPurityId: string | null
  purity: string | null
  weightGram: number
  weightUnitId: string | null
  productType: ProductType
  isActive: boolean
  hasTransactions: boolean   // true = đã phát sinh giao dịch → khóa sửa hàm lượng/đơn vị
}

// ─── Sản phẩm kèm tồn kho (GET /api/products/with-stock) ─────────────────────
// Cấu trúc flat (không có category nested), dùng cho POS chọn hàng.

export interface ProductWithStock {
  id: string
  productCode: string
  productName: string
  categoryId: string
  categoryCode: string
  categoryName: string
  goldPurityId: string | null
  purity: string | null
  weightGram: number
  weightUnitId: string | null
  productType: ProductType
  isActive: boolean
  stockQuantity: number
  stockWeightGram: number
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** GET /api/products/check-duplicate?name=&excludeId= → { exists } */
export interface CheckDuplicateResponse {
  exists: boolean
}

export interface CreateProductDto {
  productCode?: string
  productName: string
  productCategoryId: string
  goldPurityId: string | null
  weightGram?: number
  weightUnitId?: string
  productType?: ProductType
}

export interface UpdateProductDto {
  productName: string
  productCategoryId: string
  goldPurityId: string | null
  weightGram?: number
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
