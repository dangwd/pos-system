/**
 * types/trade.ts
 *
 * Khớp với response của:
 *   POST /api/trade
 *   GET  /api/trade
 *   GET  /api/trade/{id}
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TradeType =
  | 'DoiHang'      // Đổi hàng: đem hàng cũ lấy hàng mới + tính chênh lệch
  | 'MuaThem'      // Mua thêm: giống DoiHang (alias)
  | 'DoiMienPhi'   // Đổi miễn phí: trong vòng 31 ngày, giá trị chênh ≤ 1%
  | 'DoiThanhTien' // Đổi thành tiền mặt: khách nhận tiền, không cần hàng mới

// ─── Entities (response từ API) ───────────────────────────────────────────────

/** Giao dịch đổi hàng / mua vào (POST/GET /api/trade response) */
export interface TradeTransaction {
  id: string
  txnCode: string              // Mã giao dịch (ví dụ: "TRADE-0001")
  loai: TradeType
  branchId: string
  employeeId: string
  customerId: string | null
  itemCuId: string
  itemCuName: string           // Tên hàng cũ (snapshot)
  itemCuWeightGram: number     // Trọng lượng hàng cũ (gram)
  itemMoiId: string | null     // null khi DoiThanhTien
  itemMoiName: string | null   // Tên hàng mới (snapshot)
  itemMoiWeightGram: number | null
  phiHuHai: number             // Phí hư hại (LAK)
  tienHaoHut: number           // Tiền tính cho hao hụt (LAK)
  tienCong: number             // Phí gia công (LAK)
  chenhLech: number            // > 0: khách trả thêm | < 0: cửa hàng hoàn tiền (LAK)
  note: string | null
  ngayGio: string              // ISO 8601
}

// ─── DTOs (gửi lên API) ───────────────────────────────────────────────────────

/** POST /api/trade — Tạo giao dịch đổi hàng */
export interface CreateTradeDto {
  loai: TradeType
  branchId: string
  employeeId: string
  itemCuId: string             // ID mục kho hàng cũ
  itemMoiId?: string | null    // Bắt buộc khi DoiHang/MuaThem/DoiMienPhi
  phiHuHai?: number            // Phí hư hại (LAK), mặc định 0
  haoHutGram?: number          // Trọng lượng hao hụt (gram), mặc định 0
  tienCong?: number            // Phí gia công (LAK), mặc định 0
  customerId?: string
  ngayMuaCu?: string | null    // Bắt buộc khi DoiMienPhi (ISO 8601)
  note?: string
}

// ─── Phân trang ───────────────────────────────────────────────────────────────

export interface TradeListParams {
  branchId?: string
  loai?: TradeType
  from?: string  // ISO 8601
  to?: string    // ISO 8601
  page?: number
  limit?: number
}

export interface TradePage {
  total: number
  page: number
  pageSize: number
  data: TradeTransaction[]
}
