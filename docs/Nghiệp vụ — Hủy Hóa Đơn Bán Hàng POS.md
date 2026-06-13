# Nghiệp vụ — Hủy Hóa Đơn Bán Hàng POS

> Tài liệu mô tả luồng hủy hóa đơn: API, điều kiện hủy, đảo kho, bút toán hoàn tiền.  
> Cập nhật: 2026-06-12

---

## 1. Tổng quan

Hủy hóa đơn (cancel) là thao tác **không thể hoàn tác**: khi một hóa đơn đã ở trạng thái `Completed` bị hủy, hệ thống:

1. Chuyển trạng thái hóa đơn → `Cancelled`
2. **Đảo kho** (reverse inventory): hoàn lại / trừ đi số lượng hàng tương ứng
3. **Tạo bút toán sổ quỹ** hoàn tiền (nếu hóa đơn có giá trị > 0)

### State machine

```
POST /api/transactions          → COMPLETED
COMPLETED ──POST /{id}/cancel──► CANCELLED  (không khôi phục được)
```

---

## 2. API Endpoint

### `POST /api/transactions/{id}/cancel`

| Trường       | Giá trị |
|---|---|
| Method       | `POST` |
| URL          | `/api/transactions/{id}/cancel` |
| Auth         | Bearer JWT (mọi user đã đăng nhập) |
| Content-Type | `application/json` |
| Response OK  | `204 No Content` |

#### Path parameter

| Tên | Kiểu   | Mô tả |
|---|---|---|
| `id` | `uuid` | ID hóa đơn cần hủy |

#### Request body

```json
{
  "reason": "Khách đổi ý"
}
```

| Trường   | Kiểu     | Bắt buộc | Mô tả |
|---|---|---|---|
| `reason` | `string` | Không     | Lý do hủy hóa đơn (tối đa 500 ký tự). Lưu vào `CancelReason`. |

#### Response thành công

```
HTTP 204 No Content
(body rỗng)
```

#### Response lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `TRANSACTION_NOT_FOUND` | Không tìm thấy hóa đơn với ID đã cho |
| `422` | `TRANSACTION_ALREADY_CANCELLED` | Hóa đơn đã ở trạng thái `Cancelled` |
| `401` | `AUTH_TOKEN_EXPIRED` / `AUTH_MISSING` | Token hết hạn hoặc không có token |

---

## 3. Luồng xử lý chi tiết

```
FE gửi POST /api/transactions/{id}/cancel
           │
           ▼
[1] Lấy hóa đơn theo ID (bao gồm items + counter)
    → 404 TRANSACTION_NOT_FOUND nếu không tồn tại
           │
           ▼
[2] Kiểm tra trạng thái ≠ Cancelled
    → 422 TRANSACTION_ALREADY_CANCELLED nếu đã hủy rồi
           │
           ▼
[3] Gọi transaction.Cancel(cancelledBy, reason)
    → Status = Cancelled
    → CancelledBy = userId người thực hiện
    → CancelledAt = DateTime.UtcNow (UTC)
    → CancelReason = reason (có thể null)
           │
           ▼
[4] Đảo kho (ReverseInventoryChanges)
    → Bỏ qua nếu loại GD là ExchangeCurrency
    → Với mỗi item trong hóa đơn:
        • Tính chiều gốc (direction ban đầu)
        • Đảo ngược: IN ↔ OUT
        • Tìm InventoryItem theo (productId, counterId)
        • Nếu không tìm thấy → bỏ qua item đó (không lỗi)
        • Nếu tìm thấy → Increase / Decrease số lượng
        • Ghi InventoryAdjustmentLog "Hủy hóa đơn {InvoiceCode}"
           │
           ▼
[5] Tạo bút toán sổ quỹ (CreateCancellationLedgerEntry)
    → Bỏ qua nếu TotalAmount ≤ 0 hoặc PaymentMethod = null
    → Xác định chiều hoàn tiền (cancelDirection):
        • Loại GD cửa hàng "nhận tiền" (bán hàng, đổi hàng, ngoại tệ) → OUT (hoàn tiền ra)
        • Loại GD cửa hàng "chi tiền" (mua vàng, mua thêm, thu tiền đổi) → IN (thu tiền lại)
    → Với paymentMethod = CASH hoặc BANK: tạo 1 bút toán
    → Với paymentMethod = COMBINED: tạo 2 bút toán riêng (CASH + BANK)
           │
           ▼
[6] SaveAsync → lưu tất cả thay đổi vào DB
           │
           ▼
HTTP 204 No Content
```

---

## 4. Logic đảo kho theo loại giao dịch

### Chiều kho gốc (khi tạo hóa đơn)

| Loại GD | `itemRole` | Chiều gốc |
|---|---|---|
| `SellGold` | `Normal` | OUT (hàng ra) |
| `SellSilver` | `Normal` | OUT (hàng ra) |
| `BuyGold` | bất kỳ | IN (hàng vào) |
| `BuyMoreGold` | bất kỳ | IN (hàng vào) |
| `ExchangeGold` | `ExchangeIn` | IN (hàng vào — khách mang đến) |
| `ExchangeGold` | `Normal` | OUT (hàng ra — cửa hàng giao) |
| `ExchangeFree` | `ExchangeIn` | IN |
| `ExchangeFree` | `Normal` | OUT |
| `ExchangeToMoney` | bất kỳ | IN (mua lại toàn bộ) |
| `ExchangeCurrency` | — | **Bỏ qua** (không ảnh hưởng kho) |

### Khi hủy: chiều đảo ngược

| Chiều gốc | Chiều đảo |
|---|---|
| OUT | IN (hàng về kho) |
| IN | OUT (hàng ra khỏi kho) |

> **Lưu ý**: Nếu `InventoryItem` cho sản phẩm + quầy không tồn tại tại thời điểm hủy, item đó được **bỏ qua** — không lỗi, không tạo log.

---

## 5. Logic bút toán sổ quỹ khi hủy

### Phân loại loại giao dịch theo chiều tiền

| Loại GD | Khi tạo: cửa hàng | Khi hủy: chiều bút toán |
|---|---|---|
| `SellGold` | Nhận tiền vào | OUT (hoàn tiền cho khách) |
| `SellSilver` | Nhận tiền vào | OUT |
| `ExchangeGold` | Nhận tiền vào (tiền lẻ) | OUT |
| `ExchangeFree` | Nhận tiền vào (tiền lẻ) | OUT |
| `ExchangeCurrency` | Nhận tiền vào | OUT |
| `BuyGold` | Chi tiền ra | IN (thu tiền lại) |
| `BuyMoreGold` | Chi tiền ra | IN |
| `ExchangeToMoney` | Chi tiền ra | IN |

### Theo phương thức thanh toán

**CASH / BANK (đơn lẻ)**:

```json
{
  "direction": "OUT",           // hoặc "IN" theo bảng trên
  "paymentMethod": "CASH",      // hoặc "BANK"
  "currency": "LAK",
  "amount": 5700000,            // = TotalAmount (đã quy đổi nếu cần)
  "exchangeRate": 1.0
}
```

Nếu `currency ≠ LAK`:
- `amount = TotalAmount / ExchangeRate` (làm tròn 4 chữ số thập phân)
- `exchangeRate = ExchangeRate` của hóa đơn gốc

**COMBINED (tiền mặt + chuyển khoản)**:

Tạo **2 bút toán riêng biệt**:

```json
// Bút toán 1 — tiền mặt
{
  "direction": "OUT",
  "paymentMethod": "CASH",
  "currency": "LAK",
  "amount": 3000000,    // = CashAmount của hóa đơn gốc
  "exchangeRate": 1.0,
  "description": "Hoàn tiền mặt – hủy hóa đơn BV-20260612-ABCD1234"
}

// Bút toán 2 — chuyển khoản
{
  "direction": "OUT",
  "paymentMethod": "BANK",
  "currency": "LAK",
  "amount": 2700000,    // = BankAmount của hóa đơn gốc
  "exchangeRate": 1.0,
  "description": "Hoàn chuyển khoản – hủy hóa đơn BV-20260612-ABCD1234"
}
```

> Bút toán chỉ được tạo khi `CashAmount > 0` hoặc `BankAmount > 0` (bỏ qua nếu bằng 0).

---

## 6. Ví dụ thực tế

### Hủy hóa đơn bán vàng — thanh toán tiền mặt

```bash
curl -X POST http://localhost:5000/api/transactions/3f7a1c2d-xxxx-xxxx-xxxx-xxxxxxxxxxxx/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Khách đổi ý, trả lại hàng"}'
```

**Kết quả:**
- Trạng thái hóa đơn: `Completed` → `Cancelled`
- Kho: item bán (SellGold/Normal, chiều gốc OUT) → đảo IN, số lượng hoàn về kho
- Sổ quỹ: 1 bút toán CASH/OUT/LAK, mô tả `Hoàn tiền – hủy hóa đơn BV-...`
- HTTP: `204 No Content`

### Hủy hóa đơn đã hủy rồi

```json
HTTP 422
{
  "status": 422,
  "errorCode": "TRANSACTION_ALREADY_CANCELLED"
}
```

### Hủy hóa đơn không tồn tại

```json
HTTP 404
{
  "status": 404,
  "errorCode": "TRANSACTION_NOT_FOUND"
}
```

---

## 7. Dữ liệu trên hóa đơn sau khi hủy

Khi FE gọi `GET /api/transactions/{id}` sau khi hủy, response sẽ có thêm:

| Trường | Giá trị |
|---|---|
| `status` | `"Cancelled"` |
| `cancelledAt` | ISO 8601 UTC, ví dụ `"2026-06-12T08:30:00Z"` |
| `cancelledBy` | UUID của người thực hiện hủy |
| `cancelReason` | Lý do hủy (hoặc `null` nếu không nhập) |

---

## 8. Lưu ý tích hợp Frontend

1. **Nút hủy**: chỉ hiển thị khi `status === "Completed"` — ẩn khi `status === "Cancelled"`
2. **Xác nhận trước khi hủy**: show modal confirm với lý do hủy (optional) vì thao tác không hoàn tác
3. **Sau khi hủy thành công (204)**: refresh lại dữ liệu hóa đơn để hiển thị trạng thái `Cancelled`
4. **Phân quyền**: endpoint không yêu cầu permission đặc biệt — mọi user có JWT hợp lệ đều có thể gọi. Nếu cần giới hạn chỉ `Manager`/`SystemAdmin` mới được hủy, kiểm tra role ở FE hoặc liên hệ BE để thêm `[Authorize(Policy)]`
5. **Hóa đơn ExchangeCurrency**: khi hủy sẽ **không đảo kho** (vì ngoại tệ không quản lý qua `inventory_items`) nhưng **vẫn tạo bút toán** sổ quỹ bình thường
