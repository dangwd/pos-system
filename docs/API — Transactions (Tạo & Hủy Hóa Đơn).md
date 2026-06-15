# API — Transactions: Tạo & Hủy Hóa Đơn

> **Cập nhật mới nhất (2026-06-14)**: Bổ sung mục [Phí gia công & Phí đá](#2-phí-gia-công--phí-đá) mô tả chi tiết `laborFee` / `stoneFee` cho mặt hàng vàng, bạc.
> **2026-06-13**: `customerId` là **bắt buộc** khi tạo hóa đơn.

Base URL: `https://<host>/api`
Auth: `Authorization: Bearer <accessToken>`

---

## Mục lục

1. [Tạo hóa đơn — POST /api/transactions](#1-tạo-hóa-đơn)
2. [Phí gia công & Phí đá (laborFee / stoneFee)](#2-phí-gia-công--phí-đá)
3. [Hủy hóa đơn — POST /api/transactions/:id/cancel](#3-hủy-hóa-đơn)
4. [Lấy chi tiết — GET /api/transactions/:id](#4-lấy-chi-tiết-hóa-đơn)
5. [Danh sách — GET /api/transactions](#5-danh-sách-hóa-đơn)
6. [Tìm kiếm khách hàng để chọn tại POS — GET /api/customers](#6-tìm-kiếm-khách-hàng-tại-pos)
7. [Luồng UI yêu cầu chọn khách hàng](#7-luồng-ui-yêu-cầu-chọn-khách-hàng)
8. [Mã lỗi liên quan](#8-mã-lỗi-liên-quan)

---

## 1. Tạo hóa đơn

```
POST /api/transactions
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Body

```jsonc
{
  // ── THAY ĐỔI MỚI: customerId BẮT BUỘC ──────────────────────────────
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", // ✅ bắt buộc, không được null/rỗng

  // ── Loại giao dịch ──────────────────────────────────────────────────
  // Giá trị hợp lệ:
  //   0 = SellGold       — Bán vàng
  //   1 = SellSilver     — Bán bạc
  //   2 = BuyGold        — Mua vàng vào
  //   3 = BuyMoreGold    — Mua thêm vàng (khách mua thêm từ đơn cũ)
  //   4 = ExchangeGold   — Đổi vàng (kèm phụ thu)
  //   5 = ExchangeFree   — Đổi vàng miễn phí (trong 30 ngày)
  //   6 = ExchangeToMoney— Thu đổi vàng lấy tiền
  //   7 = ExchangeCurrency — Đổi ngoại tệ
  "type": 0,

  // ── Danh sách sản phẩm (KHÔNG dùng cho ExchangeCurrency) ────────────
  "items": [
    {
      "productId": "uuid",
      "productName": "Nhẫn vàng 9999 1 chỉ", // tên snapshot, FE tự điền
      "quantity": 2,
      "weightUnitId": "uuid", // lấy từ API /api/config/weight-units
      "weightGramOverride": null, // null = tự tính (qty × unit.gramPerUnit); số thực = cân thực tế (CanThucTe)
      "unitPriceLak": 1914000, // giá nhân viên đã xác nhận trên màn hình (snapshot)
      "itemRole": 0, // 0=Normal | 1=ExchangeIn (vàng đổi vào)
      "laborFee": 50000, // phí gia công (0 nếu không có)
      "stoneFee": 0, // phí đá
      "haoHutGram": 0, // hao hụt (gram)
      "phiHuHai": 0, // phí hủy hại
    },
  ],

  // ── Thanh toán ───────────────────────────────────────────────────────
  "paymentMethod": "CASH", // "CASH" | "BANK" | "COMBINED"
  "cashAmount": null, // bắt buộc khi paymentMethod = "COMBINED"
  "bankAmount": null, // bắt buộc khi paymentMethod = "COMBINED"

  // ── Ngoại tệ (tuỳ chọn, dùng khi khách trả bằng ngoại tệ) ──────────
  "currency": null, // "USD" | "THB" | "LAK" (null = LAK)
  "exchangeRate": null, // tỷ giá ngoại tệ → LAK; bắt buộc khi currency != null

  // ── ExchangeCurrency riêng (chỉ dùng khi type=7) ────────────────────
  // Xem doc riêng: "API — Đổi Ngoại Tệ (ExchangeCurrency).md"
  "foreignAmount": null,
  "targetCurrency": null,
  "targetRateToLak": null,

  // ── Tùy chọn ─────────────────────────────────────────────────────────
  "note": "Ghi chú tùy ý",
  "referenceInvoiceCode": null, // bắt buộc khi type = ExchangeFree (5)
}
```

### Các trường bắt buộc theo từng loại giao dịch

| Trường                      | SellGold/Silver  | BuyGold          | ExchangeGold     | ExchangeFree     | ExchangeCurrency |
| --------------------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| `customerId`                | **bắt buộc**     | **bắt buộc**     | **bắt buộc**     | **bắt buộc**     | **bắt buộc**     |
| `items`                     | bắt buộc         | bắt buộc         | bắt buộc         | bắt buộc         | **không dùng**   |
| `paymentMethod`             | bắt buộc         | bắt buộc         | bắt buộc         | bắt buộc         | bắt buộc         |
| `cashAmount` + `bankAmount` | chỉ khi COMBINED | chỉ khi COMBINED | chỉ khi COMBINED | chỉ khi COMBINED | chỉ khi COMBINED |
| `currency` + `exchangeRate` | tùy chọn         | tùy chọn         | tùy chọn         | tùy chọn         | —                |
| `referenceInvoiceCode`      | —                | —                | —                | **bắt buộc**     | —                |
| `foreignAmount`             | —                | —                | —                | —                | **bắt buộc**     |
| `currency` (nguồn)          | —                | —                | —                | —                | **bắt buộc**     |
| `exchangeRate`              | —                | —                | —                | —                | **bắt buộc**     |

### Response thành công

```
HTTP 201 Created
```

```json
"3fa85f64-5717-4562-b3fc-2c963f66afa6"
```

> Body là UUID của hóa đơn vừa tạo. Dùng UUID này để gọi `GET /api/transactions/:id` lấy chi tiết hiển thị biên lai.

---

## 2. Phí gia công & Phí đá

> Áp dụng cho giao dịch **SellGold (0)**, **SellSilver (1)**, **BuyGold (2)**, **ExchangeGold (4)**, **ExchangeFree (5)**
> **Không áp dụng** cho ExchangeCurrency (7).

### Hai trường per-item trong request

| Trường     | Kiểu            | Bắt buộc            | Mô tả                                                         |
| ---------- | --------------- | ------------------- | ------------------------------------------------------------- |
| `laborFee` | `decimal` (LAK) | Không, mặc định `0` | Phí gia công thợ kim hoàn (tiền công chế tác, đánh bóng, ...) |
| `stoneFee` | `decimal` (LAK) | Không, mặc định `0` | Phí đá (đá quý, đá trang trí đính kèm sản phẩm)               |

**Ràng buộc**: cả hai phải `>= 0` — nếu âm server trả `VALIDATION_FAILED`.

### Công thức tính tổng tiền

```
SubtotalAmount = Σ (quantity × unitPriceLak)   [chỉ các dòng Normal]
ExchangeCredit = Σ (quantity × unitPriceLak)   [chỉ các dòng ExchangeIn]

LaborFee (transaction) = Σ item.laborFee       [tất cả các dòng]
StoneFee (transaction) = Σ item.stoneFee       [tất cả các dòng]

TotalAmount = SubtotalAmount - ExchangeCredit + LaborFee + StoneFee
```

**Ví dụ**: Bán 2 nhẫn vàng, mỗi nhẫn giá 1.914.000 ₭, phí gia công 50.000/nhẫn, không có phí đá:

```
SubtotalAmount = 2 × 1.914.000 = 3.828.000 ₭
LaborFee       = 50.000 + 50.000 = 100.000 ₭
StoneFee       = 0
TotalAmount    = 3.828.000 + 100.000 = 3.928.000 ₭
```

### Request — ví dụ có phí gia công và phí đá

```jsonc
POST /api/transactions
{
  "customerId": "3fa85f64-...",
  "type": 0,          // SellGold
  "items": [
    {
      "productId": "uuid-nhan-vang-9999",
      "productName": "Nhẫn vàng 9999 đính đá 1 chỉ",
      "quantity": 1,
      "weightUnitId": "uuid-chi",
      "weightGramOverride": null,
      "unitPriceLak": 1914000,
      "itemRole": 0,
      "laborFee": 80000,    // ← phí gia công: 80.000 ₭
      "stoneFee": 200000,   // ← phí đá: 200.000 ₭
      "haoHutGram": 0,
      "phiHuHai": 0
    },
    {
      "productId": "uuid-day-chuyen",
      "productName": "Dây chuyền vàng 18K 2 chỉ",
      "quantity": 1,
      "weightUnitId": "uuid-chi",
      "weightGramOverride": null,
      "unitPriceLak": 3200000,
      "itemRole": 0,
      "laborFee": 120000,   // ← phí gia công: 120.000 ₭
      "stoneFee": 0,        // ← không có đá
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ],
  "paymentMethod": "CASH"
}

// Kết quả tính:
// SubtotalAmount = 1.914.000 + 3.200.000 = 5.114.000 ₭
// LaborFee       = 80.000 + 120.000      =   200.000 ₭
// StoneFee       = 200.000 + 0           =   200.000 ₭
// TotalAmount    = 5.114.000 + 200.000 + 200.000 = 5.514.000 ₭
```

### Response — phí gia công & đá xuất hiện ở 2 cấp

**Cấp hóa đơn** (tổng hợp từ tất cả items):

```jsonc
{
  "subtotalAmount": 5114000,  // tổng tiền hàng (không gồm phí)
  "laborFee": 200000,         // tổng phí gia công
  "stoneFee": 200000,         // tổng phí đá
  "totalAmount": 5514000,     // = subtotal + laborFee + stoneFee
  ...
}
```

**Cấp từng item** (chi tiết):

```jsonc
{
  "items": [
    {
      "productSnapshotName": "Nhẫn vàng 9999 đính đá 1 chỉ",
      "lineTotal": 1914000,   // chỉ tiền hàng của item này
      "laborFee": 80000,      // phí gia công của item này
      "stoneFee": 200000,     // phí đá của item này
      ...
    },
    {
      "productSnapshotName": "Dây chuyền vàng 18K 2 chỉ",
      "lineTotal": 3200000,
      "laborFee": 120000,
      "stoneFee": 0,
      ...
    }
  ]
}
```

### Gợi ý UI cho màn hình POS

```
┌───────────────────────────────────────────────────────────┐
│  Nhẫn vàng 9999 đính đá 1 chỉ          × 1               │
│  Đơn giá: 1.914.000 ₭                                     │
│  ┌─────────────────────┐  ┌────────────────────────────┐  │
│  │ Phí gia công (₭)    │  │ Phí đá (₭)                 │  │
│  │  [     80,000     ] │  │ [    200,000             ] │  │
│  └─────────────────────┘  └────────────────────────────┘  │
│  Thành tiền item: 1.914.000 + 80.000 + 200.000           │
│                 = 2.194.000 ₭                             │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  TỔNG HÓA ĐƠN                                            │
│  Tiền hàng:      5.114.000 ₭                             │
│  Phí gia công:     200.000 ₭                             │
│  Phí đá:           200.000 ₭                             │
│  ─────────────────────────────                           │
│  Tổng cộng:      5.514.000 ₭                             │
└───────────────────────────────────────────────────────────┘
```

**Lưu ý UI**:

- Mặc định `laborFee = 0` và `stoneFee = 0` — nhân viên chỉ nhập khi có phụ thu
- Hiển thị dòng phí gia công / phí đá trong bảng tổng kết **chỉ khi > 0** để tránh rối
- Phí gia công và phí đá **không được âm** — validate tại FE trước khi submit
- `lineTotal` trong response **không bao gồm** `laborFee` và `stoneFee` của item đó — chỉ là `quantity × unitPriceLak`

---

## 3. Hủy hóa đơn

```
POST /api/transactions/:id/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Body

```jsonc
{
  "reason": "Khách đổi ý", // tùy chọn, có thể null
}
```

### Response thành công

```
HTTP 204 No Content
```

> Hủy hóa đơn sẽ tự động đảo kho và tạo bút toán hoàn tiền trong sổ quỹ.
> Chỉ hủy được hóa đơn chưa hủy (`Completed` → `Cancelled`).

---

## 4. Lấy chi tiết hóa đơn

```
GET /api/transactions/:id
Authorization: Bearer <accessToken>
```

### Response

```jsonc
{
  "id": "uuid",
  "invoiceCode": "HD-20260613-0042",
  "type": 0, // enum TransactionType
  "status": 2, // 0=Draft | 1=Pending | 2=Completed | 3=Cancelled
  "branchId": "uuid",
  "counterId": "uuid",
  "subtotalAmount": 3828000,
  "laborFee": 100000,
  "stoneFee": 0,
  "totalAmount": 3928000,
  "currency": "LAK",
  "paymentMethod": "CASH",
  "cashAmount": 3928000,
  "bankAmount": null,
  "transactedAt": "2026-06-13T08:30:00Z",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productSnapshotName": "Nhẫn vàng 9999 1 chỉ",
      "quantity": 2,
      "weightUnitName": "Chỉ",
      "weightGram": 7.5,
      "unitPriceLak": 1914000,
      "tableUnitPriceLak": 1914000, // giá bảng tại thời điểm giao dịch
      "lineTotal": 3828000,
      "itemRole": 0,
      "laborFee": 50000,
      "stoneFee": 0,
    },
  ],
}
```

> `GET /api/transactions/:id` trả về entity `Transaction` trực tiếp (không qua DTO mapping). Các field `customer` không nằm trong response này — dùng `GET /api/transactions` (danh sách) nếu cần thông tin khách hàng kèm theo.

---

## 5. Danh sách hóa đơn

```
GET /api/transactions
Authorization: Bearer <accessToken>
```

### Query Parameters

| Tham số       | Kiểu       | Mô tả                                              |
| ------------- | ---------- | -------------------------------------------------- |
| `branchId`    | `guid`     | Lọc theo chi nhánh                                 |
| `status`      | `int`      | 0=Draft \| 1=Pending \| 2=Completed \| 3=Cancelled |
| `type`        | `int`      | Loại giao dịch (0–7)                               |
| `from`        | `datetime` | Từ ngày (ISO 8601)                                 |
| `to`          | `datetime` | Đến ngày (ISO 8601)                                |
| `invoiceCode` | `string`   | Tìm theo mã hóa đơn                                |
| `q`           | `string`   | Tìm theo tên/SĐT khách hoặc tên sản phẩm           |
| `page`        | `int`      | Số trang (có → phân trang; không → dùng `limit`)   |
| `pageSize`    | `int`      | Mặc định `20`                                      |
| `limit`       | `int`      | Lấy N bản ghi gần nhất (dùng thay cho phân trang)  |

### Response — phân trang (có `page`)

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "invoiceCode": "HD-20260613-0042",
      "type": 0,
      "status": 2,
      "branchName": "Chi nhánh Trung tâm",
      "counterName": "Quầy 1",
      "cashierName": "Nguyễn Văn A",
      "subtotalAmount": 3828000,
      "laborFee": 100000,
      "stoneFee": 0,
      "totalAmount": 3928000,
      "currency": "LAK",
      "paymentMethod": "CASH",
      "cashAmount": 3928000,
      "bankAmount": null,
      "note": null,
      "transactedAt": "2026-06-13T08:30:00Z",
      "customer": {              // null nếu không có khách hàng (legacy)
        "id": "uuid",
        "name": "Somphanh Khamphouvong",
        "phoneNumber": "020-1234-5678"
      },
      "items": [...],
      "referenceInvoiceCode": null,
      "cancelReason": null,
      "cancelledAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 152,
    "totalPages": 8
  }
}
```

### Response — không phân trang (dùng `limit`)

```json
[...mảng TransactionListItemDto...]
```

---

## 6. Tìm kiếm khách hàng tại POS

Dùng để hiển thị dropdown/search chọn khách hàng trước khi tạo hóa đơn.

```
GET /api/customers?search=<tên hoặc SĐT>&isActive=true&limit=10
Authorization: Bearer <accessToken>
```

### Query Parameters

| Tham số           | Mô tả                                                     |
| ----------------- | --------------------------------------------------------- |
| `search` hoặc `q` | Tìm theo tên hoặc số điện thoại                           |
| `isActive`        | `true` = chỉ KH đang hoạt động (khuyến nghị dùng tại POS) |
| `limit`           | Số lượng kết quả tối đa (mặc định `10`)                   |

### Response

```jsonc
[
  {
    "id": "uuid",
    "name": "Somphanh Khamphouvong",
    "phoneNumber": "020-1234-5678",
    "email": null,
    "loyaltyTier": "Gold",
    "accumulatedPoints": 1500,
    "isActive": true,
    "createdAt": "2025-01-15T00:00:00Z",
  },
]
```

### Tạo khách hàng nhanh tại POS

```
POST /api/customers
```

```jsonc
{
  "name": "Tên khách hàng", // bắt buộc
  "phoneNumber": "020-5678-9012", // khuyến nghị, dùng để tra cứu sau
  "loyaltyTier": null,
  "email": null,
  "address": null,
  "dateOfBirth": null,
}
```

---

## 7. Luồng UI yêu cầu chọn khách hàng

### Trạng thái UI tại màn hình POS

```
┌─────────────────────────────────────────────────────────────────┐
│  [🔍 Tìm khách hàng...]              [+ Tạo khách hàng mới]    │
│  ──────────────────────────────────────────────────────────────  │
│  ⚠️ Vui lòng chọn khách hàng trước khi lập hóa đơn            │
│                                                                   │
│  [Thêm sản phẩm]    [Thanh toán ← disabled khi chưa chọn KH]   │
└─────────────────────────────────────────────────────────────────┘
```

### Logic xử lý tại FE

```typescript
// Validate trước khi submit
function canSubmit(state: POSState): boolean {
  // customerId BẮT BUỘC kể từ commit a51c38b
  if (!state.customerId) return false;
  if (
    state.type !== TransactionType.ExchangeCurrency &&
    state.items.length === 0
  )
    return false;
  return true;
}

// Tạo request
const payload: CreateTransactionRequest = {
  customerId: state.customerId, // ← KHÔNG được bỏ qua
  type: state.type,
  items: state.items,
  paymentMethod: state.paymentMethod,
  // ...
};
```

### Khi người dùng chưa chọn khách hàng

- Nút **"Thanh toán"** / **"Hoàn tất"** phải bị `disabled`
- Hiển thị tooltip hoặc thông báo: _"Vui lòng chọn khách hàng"_
- Nếu FE submit thiếu `customerId`, server trả:

```json
HTTP 422
{ "status": 422, "errorCode": "CUSTOMER_REQUIRED" }
```

---

## 8. Mã lỗi liên quan

| Mã lỗi                              | HTTP | Nguyên nhân                                                                        |
| ----------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `CUSTOMER_REQUIRED`                 | 422  | `customerId` null hoặc rỗng khi tạo hóa đơn                                        |
| `CUSTOMER_NOT_FOUND`                | 404  | `customerId` không tồn tại trong DB                                                |
| `VALIDATION_FAILED`                 | 422  | Các trường khác không hợp lệ (FluentValidation); xem field `errors` trong response |
| `TRANSACTION_NOT_FOUND`             | 404  | UUID hóa đơn không tồn tại                                                         |
| `TRANSACTION_ALREADY_CANCELLED`     | 422  | Hóa đơn đã bị hủy, không hủy lại được                                              |
| `COUNTER_NOT_FOUND`                 | 422  | Nhân viên chưa được gán quầy                                                       |
| `USER_NOT_FOUND`                    | 404  | Token hợp lệ nhưng user không còn trong DB                                         |
| `PRODUCT_NOT_FOUND`                 | 404  | `productId` không tồn tại                                                          |
| `PRODUCT_WEIGHT_UNIT_REQUIRED`      | 422  | Sản phẩm vàng cần `weightUnitId`                                                   |
| `PRODUCT_PRICE_NOT_CONFIGURED`      | 422  | Chưa có giá cho độ tinh khiết của sản phẩm                                         |
| `CONFIG_PRICE_NOT_FOUND`            | 422  | Chưa cấu hình bảng giá vàng                                                        |
| `CONFIG_WEIGHT_UNIT_NOT_FOUND`      | 404  | Đơn vị trọng lượng không tồn tại                                                   |
| `INVENTORY_NOT_FOUND`               | 422  | Quầy không có sản phẩm trong kho để bán                                            |
| `INVENTORY_INSUFFICIENT_STOCK`      | 422  | Số lượng tồn kho không đủ                                                          |
| `EXCHANGE_FREE_REFERENCE_REQUIRED`  | 422  | Đổi miễn phí cần `referenceInvoiceCode`                                            |
| `EXCHANGE_FREE_REFERENCE_NOT_FOUND` | 422  | Mã hóa đơn gốc không tồn tại                                                       |
| `EXCHANGE_FREE_REFERENCE_EXPIRED`   | 422  | Hóa đơn gốc quá 30 ngày                                                            |

### Cấu trúc response lỗi (VALIDATION_FAILED)

```jsonc
{
  "status": 422,
  "errorCode": "VALIDATION_FAILED",
  "errors": {
    "items": ["Giao dịch phải có ít nhất 1 mặt hàng."],
    "paymentMethod": [
      "Phương thức thanh toán phải là CASH, BANK hoặc COMBINED.",
    ],
  },
}
```

---

## Ví dụ đầy đủ — Bán vàng, thanh toán tiền mặt

```jsonc
// Request
POST /api/transactions
{
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "type": 0,
  "items": [
    {
      "productId": "aaaa-...",
      "productName": "Nhẫn vàng 9999 1 chỉ",
      "quantity": 1,
      "weightUnitId": "bbbb-...",
      "weightGramOverride": null,
      "unitPriceLak": 1914000,
      "itemRole": 0,
      "laborFee": 50000,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ],
  "paymentMethod": "CASH",
  "cashAmount": null,
  "bankAmount": null,
  "currency": null,
  "exchangeRate": null,
  "note": null,
  "referenceInvoiceCode": null
}

// Response 201
"3fa85f64-5717-4562-b3fc-2c963f66afa6"
```

## Ví dụ — Thanh toán kết hợp (COMBINED)

```jsonc
{
  "customerId": "uuid",
  "type": 0,
  "items": [...],
  "paymentMethod": "COMBINED",
  "cashAmount": 1000000,   // ← bắt buộc khi COMBINED
  "bankAmount": 914000,    // ← bắt buộc khi COMBINED
  "currency": null,
  "exchangeRate": null
}
```

## Ví dụ — Khách trả bằng USD

```jsonc
{
  "customerId": "uuid",
  "type": 0,
  "items": [...],
  "paymentMethod": "CASH",
  "currency": "USD",
  "exchangeRate": 21500   // ← bắt buộc khi currency != null
}
```
