/**
 * types/product.ts
 *
 * Khớp với response của:
 *   GET  /api/products/categories
 *   GET  /api/products
 *   GET  /api/products/{id}
 *   POST /api/products
 */

// ─── Danh mục sản phẩm ───────────────────────────────────────────────────────

export interface ProductCategory {
  id: string
  code: string       // Ví dụ: "VANG_24K", "BAC_925"
  name: string       // Ví dụ: "Vàng 24K", "Bạc 925"
  sortOrder: number
}

// ─── Sản phẩm ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  productCode: string         // Ví dụ: "V24K-NHAN-001"
  productName: string         // Ví dụ: "Nhẫn Vàng 24K Trơn"
  category: ProductCategory
  purity: string              // Tuổi vàng: "9999", "24K", "18K", ...
  weightPerUnitMg: number     // Trọng lượng mỗi đơn vị tính bằng milligram
  isActive: boolean
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** POST /api/products — Tạo sản phẩm mới */
export interface CreateProductDto {
  productCode: string
  productName: string
  productCategoryId: string
  purity: string
  weightPerUnitMg: number
}

/** POST /api/products/categories — Tạo danh mục */
export interface CreateProductCategoryDto {
  code: string
  name: string
  sortOrder?: number
}
