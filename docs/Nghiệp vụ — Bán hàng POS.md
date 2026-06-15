# Nghiệp vụ — Bán hàng POS

> Tài liệu này mô tả toàn bộ luồng nghiệp vụ màn hình POS dành cho frontend.  
> Dựa trực tiếp vào `TransactionCommands.cs`, `TransactionQueries.cs`, `Transaction.cs`, `CreateTransactionValidator.cs`.

---

## 1. Tổng quan luồng POS

```
[1] Load dữ liệu init           [2] Cashier lập đơn           [3] Gọi API tạo đơn
─────────────────────           ──────────────────────         ──────────────────────
GET /api/config/prices     →    Chọn sản phẩm + đơn vị  →    POST /api/transactions
GET /api/config/weight-units    Nhập số lượng / cân              → 201: invoiceId
GET /api/inventory              Tính tổng (client-side)
GET /api/customers (opt)        Chọn phương thức TT

[4] Sau khi thành công
──────────────────────
GET /api/transactions/{id}   ← lấy full invoice để in
POST /api/transactions/{id}/cancel  ← hủy nếu cần
```

---

## 2. Dữ liệu Init khi mở màn hình POS

Gọi song song 3 API trước khi cashier thao tác:

```
GET /api/config/prices
GET /api/config/weight-units
GET /api/inventory?counterId=<counterId-của-user>
```

### 2.1 `GET /api/config/prices` — Bảng giá vàng hiện tại

```json
{
  "id": "...",
  "effectiveFrom": "2026-06-11T07:00:00Z",
  "items": [
    {
      "goldPurityId": "...",
      "purityCode": "9999",
      "hamLuong": "Vàng 9999",
      "category": "VANG",
      "weightUnitId": "61573924-f174-428f-be44-34778d69a65b",
      "weightUnitCode": "chi",
      "gramPerUnit": 3.75,
      "buyPrice": 5500000,
      "sellPrice": 5700000
    }
  ]
}
```

> `buyPrice` / `sellPrice` là **giá / đơn vị** (ví dụ: giá / 1 Chỉ). Dùng để hiển thị tham chiếu và tính `unitPriceLak` mặc định.  
> **Mỗi dòng** là một cặp `(goldPurityId, weightUnitId)` — tức một loại vàng × một đơn vị cân.

### 2.2 `GET /api/config/weight-units` — Danh sách đơn vị

```json
[
  { "id": "...", "tenDonVi": "Chỉ",   "maTocDoc": "chi",   "gramPerUnit": 3.75,  "isSystem": true },
  { "id": "...", "tenDonVi": "Lượng", "maTocDoc": "luong", "gramPerUnit": 37.5,  "isSystem": true },
  { "id": "...", "tenDonVi": "Cây",   "maTocDoc": "cay",   "gramPerUnit": 375.0, "isSystem": true }
]
```

### 2.3 `GET /api/inventory?counterId=<id>` — Kho tại quầy

Dùng để gợi ý sản phẩm đang có tồn tại quầy khi cashier chọn hàng bán.

---

## 3. Các loại giao dịch (`type`)

| `type` | Tiền tệ | Mã HĐ | Kho | Luồng tiền |
|---|---|---|---|---|
| `SellGold` | LAK | `BV-...` | OUT | Khách trả tiền → cửa hàng nhận |
| `SellSilver` | LAK | `BB-...` | OUT | Khách trả tiền → cửa hàng nhận |
| `BuyGold` | LAK | `MV-...` | IN | Cửa hàng trả tiền → khách nhận |
| `ExchangeGold` | LAK | `DV-...` | IN (cũ) + OUT (mới) | Khách bù thêm tiền (nếu có) |
| `ExchangeCurrency` | THB/USD | `NT-...` | Không đổi kho | Khách đưa ngoại tệ → nhận LAK |
| `BuyMoreGold` | LAK | `MT-...` | IN | Cửa hàng trả tiền → khách nhận |
| `ExchangeFree` | LAK | `DMF-...` | IN (cũ) + OUT (mới) | Không thu phí (≤ 30 ngày) |
| `ExchangeToMoney` | LAK | `DTT-...` | IN | Cửa hàng trả tiền → khách nhận |

---

## 4. Cấu trúc Request (`POST /api/transactions`)

```
POST /api/transactions
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "type": "SellGold",
  "paymentMethod": "CASH",
  "cashAmount": null,
  "bankAmount": null,
  "currency": null,
  "exchangeRate": null,
  "customerId": null,
  "note": null,
  "referenceInvoiceCode": null,
  "items": [
    {
      "productId": "dea821cd-8382-470c-8ff9-fe707ca45901",
      "productName": "Nhẫn Vàng 24K Trơn",
      "quantity": 2,
      "weightUnitId": "61573924-f174-428f-be44-34778d69a65b",
      "weightGramOverride": null,
      "unitPriceLak": 5700000,
      "itemRole": "Normal",
      "laborFee": 50000,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

### Ràng buộc field-by-field

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `type` | ✔ | Xem §3 |
| `paymentMethod` | ✔ | `CASH` \| `BANK` \| `COMBINED` |
| `cashAmount` | Khi `COMBINED` | Số tiền mặt (LAK) ≥ 0 |
| `bankAmount` | Khi `COMBINED` | Số chuyển khoản (LAK) ≥ 0 |
| `currency` | Khi `ExchangeCurrency` | `"THB"` \| `"USD"` |
| `exchangeRate` | Khi `currency ≠ null` | Tỷ giá > 0 |
| `referenceInvoiceCode` | **Bắt buộc khi `ExchangeFree`** | Mã HĐ gốc ≤ 30 ngày. Tùy chọn cho `ExchangeGold` |
| `items[].productId` | ✔ | GUID sản phẩm |
| `items[].productName` | ✔ | Snapshot tên, tối đa 200 ký tự |
| `items[].quantity` | ✔ | Số nguyên > 0 |
| `items[].weightUnitId` | ✔ (trừ `ExchangeCurrency`) | ID đơn vị từ `GET /api/config/weight-units` |
| `items[].weightGramOverride` | Khi sản phẩm `CanThucTe` | Trọng lượng thực đo (grams). Null cho `NguyenKhoi` |
| `items[].unitPriceLak` | ✔ | Giá tại thời điểm tạo đơn (≥ 0). **Frontend tự điền từ bảng giá** |
| `items[].itemRole` | — | `"Normal"` (mặc định) \| `"ExchangeIn"` |
| `items[].laborFee` | — | Phí gia công (LAK, mặc định 0) |
| `items[].stoneFee` | — | Phí đá (LAK, mặc định 0) |
| `items[].haoHutGram` | — | Trọng lượng hao hụt (grams, mặc định 0) |
| `items[].phiHuHai` | — | Phí hủy hoại (LAK, mặc định 0) |

> ⚠️ **`branchId`, `staffId`, `counterId` KHÔNG truyền trong body** — backend tự lấy từ JWT.  
> ⚠️ Nếu user chưa được gán quầy (`CounterId = null`) → `422 COUNTER_NOT_FOUND`.

---

## 5. Công thức tính tiền (client-side, hiển thị preview trước khi submit)

### 5.1 Trọng lượng mỗi item

```
weightGram = weightGramOverride ?? (quantity × unit.gramPerUnit)
```

### 5.2 Tổng tiền mỗi dòng

```
lineTotal = quantity × unitPriceLak
```

> Backend tính theo công thức này (`TransactionItem.Create`). Frontend tính trước để hiển thị preview.

### 5.3 Tổng hóa đơn

```
subtotalAmount  = Σ lineTotal  (chỉ items có itemRole = "Normal")
exchangeCredit  = Σ lineTotal  (chỉ items có itemRole = "ExchangeIn")
laborFee        = Σ items[].laborFee
stoneFee        = Σ items[].stoneFee

totalAmount = subtotalAmount - exchangeCredit + laborFee + stoneFee
```

### 5.4 Ràng buộc thanh toán COMBINED

```
cashAmount + bankAmount === totalAmount   // phải bằng chính xác
cashAmount >= 0
bankAmount >= 0
```

---

## 6. Luồng từng loại giao dịch

### 6.1 Bán Vàng / Bán Bạc (`SellGold` / `SellSilver`)

```
Tất cả items: itemRole = "Normal"
unitPriceLak  = sellPrice từ bảng giá (theo goldPurityId + weightUnitId)
totalAmount   = Σ(quantity × unitPriceLak) + laborFee + stoneFee
```

**Ví dụ:** Bán 2 Nhẫn 24K, giá 5,700,000₭/Chỉ, phí GC 50,000₭/cái

```json
{
  "type": "SellGold",
  "paymentMethod": "CASH",
  "items": [{
    "quantity": 2,
    "weightUnitId": "<id-chi>",
    "unitPriceLak": 5700000,
    "itemRole": "Normal",
    "laborFee": 50000
  }]
}
```

`totalAmount = 2 × 5,700,000 + 2 × 50,000 = 11,500,000₭`

---

### 6.2 Mua Vàng (`BuyGold`) / Mua Thêm (`BuyMoreGold`)

```
Tất cả items: itemRole = "Normal"
unitPriceLak  = buyPrice từ bảng giá
totalAmount   = Σ(quantity × unitPriceLak)
```

Cửa hàng chi tiền cho khách → khi hủy, cửa hàng thu tiền lại.

---

### 6.3 Thu Đổi Vàng (`ExchangeGold`)

Khách mang vàng cũ đổi lấy vàng mới. Vàng cũ cấn trừ vào tổng thanh toán.

```
items gồm 2 loại:
  itemRole = "ExchangeIn"  → hàng khách mang vào (vàng cũ)
  itemRole = "Normal"      → hàng khách nhận về (vàng mới)

unitPriceLak(ExchangeIn) = buyPrice  (cửa hàng định giá thu mua)
unitPriceLak(Normal)     = sellPrice (cửa hàng bán ra)

totalAmount = Σ lineTotal(Normal) - Σ lineTotal(ExchangeIn) + laborFee + stoneFee
```

**Ví dụ:** Khách đổi 1 Chỉ vàng cũ (5,500,000₭) lấy 1 Chỉ vàng mới (5,700,000₭) + phí GC 80,000₭

```json
{
  "type": "ExchangeGold",
  "paymentMethod": "CASH",
  "items": [
    {
      "quantity": 1, "unitPriceLak": 5500000,
      "itemRole": "ExchangeIn", "laborFee": 0
    },
    {
      "quantity": 1, "unitPriceLak": 5700000,
      "itemRole": "Normal", "laborFee": 80000
    }
  ]
}
```

`totalAmount = 5,700,000 - 5,500,000 + 80,000 = 280,000₭`

---

### 6.4 Đổi Miễn Phí (`ExchangeFree`)

Giống `ExchangeGold` nhưng:
- `referenceInvoiceCode` **bắt buộc** — mã HĐ gốc lúc mua (trong vòng 30 ngày)
- Backend kiểm tra `(UtcNow - refTxn.TransactedAt).TotalDays <= 30`

```json
{
  "type": "ExchangeFree",
  "referenceInvoiceCode": "BV-20260512-ABCD1234",
  "paymentMethod": "CASH",
  "items": [
    { "itemRole": "ExchangeIn", "unitPriceLak": 5500000, ... },
    { "itemRole": "Normal",     "unitPriceLak": 5700000, ... }
  ]
}
```

**Lỗi đặc thù:**

| Lỗi | Nguyên nhân |
|---|---|
| `EXCHANGE_FREE_REFERENCE_REQUIRED` | Không truyền `referenceInvoiceCode` |
| `EXCHANGE_FREE_REFERENCE_NOT_FOUND` | Mã HĐ gốc không tồn tại |
| `EXCHANGE_FREE_REFERENCE_EXPIRED` | HĐ gốc > 30 ngày |

---

### 6.5 Thu Đổi Ngoại Tệ (`ExchangeCurrency`)

```
Không có kho (backend bỏ qua inventory cho loại này)
Bắt buộc: currency + exchangeRate
items[].weightUnitId = null (không cân vàng)
items[].weightGramOverride = null
items[].unitPriceLak = số tiền ngoại tệ (VD: 1000 THB)
```

**Ví dụ:** Đổi 1,000 THB, tỷ giá 1 THB = 410₭

```json
{
  "type": "ExchangeCurrency",
  "paymentMethod": "CASH",
  "currency": "THB",
  "exchangeRate": 410,
  "items": [{
    "productId": "<id-thb-product>",
    "productName": "THB",
    "quantity": 1,
    "weightUnitId": null,
    "unitPriceLak": 410000,
    "itemRole": "Normal"
  }]
}
```

`totalAmount = 410,000₭`

---

### 6.6 Đổi Thành Tiền (`ExchangeToMoney`)

Khách mang vàng đến, cửa hàng trả tiền mặt. Tất cả items: `itemRole = "Normal"`, `unitPriceLak = buyPrice`.

---

## 7. Phương thức thanh toán

| `paymentMethod` | `cashAmount` | `bankAmount` | Ghi chú |
|---|---|---|---|
| `"CASH"` | `null` | `null` | Toàn bộ tiền mặt |
| `"BANK"` | `null` | `null` | Toàn bộ chuyển khoản |
| `"COMBINED"` | **bắt buộc** | **bắt buộc** | `cashAmount + bankAmount = totalAmount` |

---

## 8. Response `201 Created`

```
Body: "3fa85f64-5717-4562-b3fc-2c963f66afa6"   ← invoiceId (GUID thuần)
```

Sau khi nhận 201, gọi tiếp `GET /api/transactions/{id}` để lấy full invoice in hoá đơn.

---

## 9. Chi tiết hóa đơn (`GET /api/transactions/{id}`)

Response trả `Transaction` entity đầy đủ. Dùng để in receipt.

```json
{
  "id": "...",
  "invoiceCode": "BV-20260612-ABCD1234",
  "type": "SellGold",
  "status": "Completed",
  "branchId": "...",
  "counterId": "...",
  "cashierId": "...",
  "subtotalAmount": 11400000,
  "laborFee": 100000,
  "stoneFee": 0,
  "totalAmount": 11500000,
  "currency": "LAK",
  "paymentMethod": "CASH",
  "cashAmount": null,
  "bankAmount": null,
  "transactedAt": "2026-06-12T08:30:00Z",
  "referenceInvoiceCode": null,
  "cancelReason": null,
  "cancelledAt": null,
  "customer": {
    "id": "...",
    "name": "Somchai Phommavong",
    "phoneNumber": "020-55551234"
  },
  "items": [
    {
      "id": "...",
      "productId": "...",
      "productSnapshotName": "Nhẫn Vàng 24K Trơn",
      "quantity": 2,
      "weightUnitName": "Chỉ",
      "weightGram": 7.5,
      "unitPriceLak": 5700000,
      "tableUnitPriceLak": 5700000,
      "lineTotal": 11400000,
      "itemRole": "Normal",
      "laborFee": 50000,
      "stoneFee": 0
    }
  ]
}
```

> `tableUnitPriceLak` = giá bảng tham chiếu lúc tạo đơn. Dùng để so sánh với `unitPriceLak` cashier đã nhập, hiển thị cảnh báo nếu lệch.

---

## 10. Hủy hóa đơn (`POST /api/transactions/{id}/cancel`)

```json
{ "reason": "Khách đổi ý" }   // reason là tuỳ chọn
```

- Response: `204 No Content`
- Backend tự động **đảo kho** và **tạo bút toán hoàn tiền** vào sổ quỹ.
- Sau khi hủy, `status` chuyển thành `"Cancelled"`, `cancelledAt` và `cancelReason` được điền.
- **Không thể khôi phục** sau khi hủy.

**Hướng hoàn tiền tự động:**

| Loại GD | Khi hủy |
|---|---|
| SellGold, SellSilver, ExchangeGold, ExchangeFree, ExchangeCurrency | Cửa hàng **trả lại tiền** khách (OUT) |
| BuyGold, BuyMoreGold, ExchangeToMoney | Cửa hàng **thu tiền lại** (IN) |
| COMBINED | Tạo 2 bút toán: 1 CASH + 1 BANK |

---

## 11. Danh sách & tìm kiếm (`GET /api/transactions`)

```
GET /api/transactions
  ?branchId=...          // lọc chi nhánh
  &status=Completed      // Completed | Cancelled
  &type=SellGold         // loại GD
  &from=2026-06-01       // từ ngày
  &to=2026-06-12         // đến ngày
  &invoiceCode=BV-...    // tìm chính xác
  &q=Somchai             // tìm chung (tên khách, mã HĐ, ...)
  &page=1
  &pageSize=20
```

**2 chế độ response:**

| Chế độ | Cách dùng | Response |
|---|---|---|
| Phân trang | Không truyền `limit` | `{ data: [...], pagination: { page, pageSize, totalItems, totalPages } }` |
| Flat list | Truyền `?limit=10` | Mảng phẳng `[...]` — dùng cho lookup nhanh tại POS |

---

## 12. Mã lỗi đặc thù cho POS

| Mã lỗi | HTTP | Nguyên nhân | Cách xử lý FE |
|---|---|---|---|
| `COUNTER_NOT_FOUND` | 422 | User chưa được gán quầy | Báo admin gán quầy cho tài khoản |
| `USER_NOT_FOUND` | 404 | JWT sub không tìm thấy | Logout, đăng nhập lại |
| `CONFIG_PRICE_NOT_FOUND` | 422 | Chưa có bảng giá | Báo Manager cập nhật giá |
| `PRODUCT_NOT_FOUND` | 404 | Sản phẩm không tồn tại | Làm mới danh sách sản phẩm |
| `PRODUCT_PRICE_NOT_CONFIGURED` | 422 | Sản phẩm chưa có giá đúng hàm lượng + đơn vị | Chọn đúng đơn vị cân, hoặc báo Manager cập nhật bảng giá |
| `INVENTORY_NOT_FOUND` | 404 | Không có item kho tại quầy này | Kiểm tra lại kho quầy |
| `INVENTORY_INSUFFICIENT_STOCK` | 422 | Không đủ số lượng | Báo số lượng còn lại, không cho submit |
| `EXCHANGE_FREE_REFERENCE_REQUIRED` | 422 | Quên điền mã HĐ gốc | Hiển thị field nhập mã HĐ gốc |
| `EXCHANGE_FREE_REFERENCE_NOT_FOUND` | 422 | Mã HĐ gốc sai | Kiểm tra lại mã hóa đơn |
| `EXCHANGE_FREE_REFERENCE_EXPIRED` | 422 | Quá 30 ngày | Chuyển sang luồng `ExchangeGold` |
| `PAYMENT_COMBINED_AMOUNTS_MISMATCH` | 422 | Tổng tiền không khớp | Hiển thị lỗi inline tại form thanh toán |
| `TRANSACTION_ALREADY_CANCELLED` | 422 | Hủy lại đơn đã hủy | Reload trạng thái hóa đơn |
| `VALIDATION_FAILED` | 422 | Dữ liệu không hợp lệ | Hiển thị `errors{}` từ response |
