# API — Đổi Ngoại Tệ (ExchangeCurrency)

> Tài liệu tích hợp API cho FE: request/response, 3 chiều đổi tiền, công thức tính, sổ quỹ, hủy phiếu.
> Cập nhật: 2026-06-16 — `foreignAmount` nay được lưu thẳng vào DB và trả về trong response (không cần tính ngược từ `totalAmount / exchangeRate` nữa).
> Cập nhật: 2026-06-12 (commit `f1786cd` — hỗ trợ 3 chiều: ngoại tệ↔LAK, cross-rate)

---

## 1. Tổng quan thay đổi

Từ commit `f1786cd`, ExchangeCurrency hỗ trợ **3 chiều đổi tiền**:

| Chiều | Ví dụ | `currency` | `targetCurrency` |
|---|---|---|---|
| Ngoại tệ → LAK | 100 USD → LAK | `"USD"` | `"LAK"` (mặc định) |
| LAK → Ngoại tệ | 2,150,000 ₭ → USD | `"LAK"` | `"USD"` |
| Ngoại tệ → Ngoại tệ | 100 USD → THB | `"USD"` | `"THB"` |

**Các fields mới trong request:**
- `targetCurrency` — loại tiền **trả khách** (mặc định `"LAK"`)
- `targetRateToLak` — tỷ giá tiền đích → LAK (**bắt buộc khi `targetCurrency ≠ LAK`**)

**Các fields mới trong response transaction:**
- `targetCurrency` — loại tiền trả khách
- `targetRateToLak` — tỷ giá tiền đích
- `targetAmount` — số tiền trả khách (đã tính, 4 chữ số thập phân)
- `foreignAmount` — số tiền nguồn khách đưa (snapshot, lưu trực tiếp, không cần tính ngược)

---

## 2. API Tỷ giá — Lấy trước khi mở form

```
GET /api/config/exchange-rates
Authorization: Bearer <token>
```

Response `200 OK`:
```json
[
  { "currencyCode": "USD", "rateToLak": 21400, "adjustment": 100, "effectiveRate": 21500 },
  { "currencyCode": "THB", "rateToLak": 595,   "adjustment": 5,   "effectiveRate": 600   }
]
```

> Luôn dùng `effectiveRate` (= `rateToLak + adjustment`) để tính và điền vào request.
> Gọi endpoint này khi mount màn hình FX để lấy tỷ giá hiện hành.

---

## 3. API Tạo giao dịch FX

```
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json
```

### 3.1 Chiều 1 — Ngoại tệ → LAK (phổ biến nhất)

Khách đưa 100 USD, nhận LAK.

```json
{
  "type": "ExchangeCurrency",
  "paymentMethod": "CASH",
  "currency": "USD",
  "exchangeRate": 21500,
  "foreignAmount": 100,
  "targetCurrency": "LAK",
  "targetRateToLak": null,
  "items": []
}
```

**Backend tính:**
```
totalAmount  = round(100 × 21500) = 2,150,000 ₭
targetAmount = 2,150,000 / 1      = 2,150,000 LAK
```

### 3.2 Chiều 2 — LAK → Ngoại tệ

Khách đưa 2,150,000 ₭, nhận USD.

```json
{
  "type": "ExchangeCurrency",
  "paymentMethod": "CASH",
  "currency": "LAK",
  "exchangeRate": 1,
  "foreignAmount": 2150000,
  "targetCurrency": "USD",
  "targetRateToLak": 21500,
  "items": []
}
```

**Backend tính:**
```
totalAmount  = round(2,150,000 × 1) = 2,150,000 ₭
targetAmount = 2,150,000 / 21500    = 100.0000 USD
```

### 3.3 Chiều 3 — Ngoại tệ → Ngoại tệ (cross-rate)

Khách đưa 100 USD, nhận THB.

```json
{
  "type": "ExchangeCurrency",
  "paymentMethod": "CASH",
  "currency": "USD",
  "exchangeRate": 21500,
  "foreignAmount": 100,
  "targetCurrency": "THB",
  "targetRateToLak": 600,
  "items": []
}
```

**Backend tính:**
```
totalAmount  = round(100 × 21500) = 2,150,000 ₭
targetAmount = 2,150,000 / 600    = 3583.3333 THB
```

---

## 4. Bảng tất cả fields request

| Trường | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `type` | ✔ | `"ExchangeCurrency"` | Loại giao dịch |
| `currency` | ✔ | `string` | Loại tiền **nguồn** (khách đưa): `"USD"`, `"THB"`, `"LAK"`, ... |
| `exchangeRate` | ✔ | `decimal > 0` | Tỷ giá tiền nguồn → LAK. Điền `1` khi nguồn là `LAK` |
| `foreignAmount` | ✔ | `decimal > 0` | Số tiền nguồn khách đưa |
| `targetCurrency` | — | `string` | Loại tiền **đích** (trả khách). Mặc định `"LAK"` nếu bỏ trống |
| `targetRateToLak` | ✔ khi đích ≠ LAK | `decimal > 0` | Tỷ giá tiền đích → LAK. `null` hoặc bỏ khi đích = `"LAK"` |
| `paymentMethod` | ✔ | `"CASH"` \| `"BANK"` | Phương thức thanh toán |
| `items` | — | `[]` | Luôn rỗng — ExchangeCurrency không có sản phẩm |
| `customerId` | — | `uuid` | Khách hàng (tùy chọn) |
| `note` | — | `string` | Ghi chú |

---

## 5. Công thức tính (FE preview trước khi submit)

```typescript
// rates lấy từ GET /api/config/exchange-rates
function getRateLak(currency: string, rates: ExchangeRate[]): number {
  if (currency === "LAK") return 1;
  return rates.find(r => r.currencyCode === currency)?.effectiveRate ?? 0;
}

const sourceRateLak = getRateLak(sourceCurrency, rates);
const targetRateLak = getRateLak(targetCurrency, rates);

// Tổng quy LAK (= totalAmount backend sẽ lưu)
const totalAmountLak = Math.round(foreignAmount * sourceRateLak);

// Số tiền trả khách (= targetAmount backend sẽ lưu)
const targetAmount = targetRateLak > 0
  ? Math.round((totalAmountLak / targetRateLak) * 10000) / 10000
  : 0;
```

**Ví dụ:**

| sourceCurrency | targetCurrency | foreignAmount | totalAmountLak | targetAmount |
|---|---|---|---|---|
| `USD` | `LAK` | 100 | 2,150,000 | 2,150,000 |
| `LAK` | `USD` | 2,150,000 | 2,150,000 | 100.0000 |
| `USD` | `THB` | 100 | 2,150,000 | 3,583.3333 |
| `THB` | `LAK` | 500 | 300,000 | 300,000 |
| `THB` | `USD` | 500 | 300,000 | 13.9535 |

---

## 6. Response sau khi tạo

`POST /api/transactions` → `201 Created` — trả về **ID giao dịch** (GUID string).

Sau đó gọi `GET /api/transactions/{id}` để lấy đầy đủ:

```json
{
  "id": "uuid...",
  "invoiceCode": "NT-20260612-ABCD1234",
  "type": "ExchangeCurrency",
  "status": "Completed",
  "branchId": "uuid...",
  "counterId": "uuid...",
  "currency": "USD",
  "exchangeRate": 21500,
  "foreignAmount": 100,
  "targetCurrency": "THB",
  "targetRateToLak": 600,
  "targetAmount": 3583.3333,
  "totalAmount": 2150000,
  "paymentMethod": "CASH",
  "transactedAt": "2026-06-12T09:30:00Z",
  "items": []
}
```

> `foreignAmount` là số tiền nguồn khách đưa, được lưu trực tiếp vào DB từ phiên bản này — FE đọc thẳng, không cần tính ngược `totalAmount / exchangeRate`.

**Hiển thị trên phiếu từ response:**
```typescript
// Số tiền nguồn — đọc trực tiếp từ foreignAmount (đã lưu vào DB)
const sourceAmount = tx.foreignAmount;

// Dòng hiển thị chính
const displayLine = tx.targetCurrency === "LAK"
  ? `${sourceAmount} ${tx.currency} → ${formatLak(tx.totalAmount)} ₭`
  : `${sourceAmount} ${tx.currency} → ${tx.targetAmount} ${tx.targetCurrency}`;
// "100 USD → 3,583.3333 THB"
// "100 USD → 2,150,000 ₭"
```

---

## 7. Sổ quỹ — 2 bút toán tự động

Mỗi giao dịch ExchangeCurrency tự động tạo **2 bút toán** trong sổ quỹ:

| # | `direction` | `currency` | `amount` | Ý nghĩa |
|---|---|---|---|---|
| 1 | `IN` | tiền nguồn (`currency`) | `sourceAmount` | Cửa hàng **nhận** tiền nguồn từ khách |
| 2 | `OUT` | tiền đích (`targetCurrency`) | `targetAmount` | Cửa hàng **trả** tiền đích cho khách |

**Ví dụ USD → THB (`foreignAmount=100, exchangeRate=21500, targetRateToLak=600`):**

```
Bút toán 1: IN  | USD | 100.0000    | nhận 100 USD từ khách
Bút toán 2: OUT | THB | 3583.3333   | trả 3,583.3333 THB cho khách
```

---

## 8. Hủy hóa đơn FX

```
POST /api/transactions/{id}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{ "reason": "Nhập sai số tiền" }
```

Response: `204 No Content`

**Khi hủy, hệ thống tạo 2 bút toán đảo chiều:**

| # | `direction` | `currency` | `amount` | Ý nghĩa |
|---|---|---|---|---|
| 1 | `OUT` | tiền nguồn | `sourceAmount` | Hoàn trả tiền nguồn cho khách |
| 2 | `IN` | tiền đích | `targetAmount` | Thu lại tiền đích từ khách |

**Kho hàng:** không thay đổi (ExchangeCurrency không có sản phẩm vật lý).

---

## 9. Validation và mã lỗi

### Validation rules (FluentValidation)

| Điều kiện | Lỗi trả về |
|---|---|
| `currency` rỗng | `VALIDATION_FAILED` + `errors.Currency` |
| `exchangeRate ≤ 0` | `VALIDATION_FAILED` + `errors.ExchangeRate` |
| `foreignAmount ≤ 0` | `VALIDATION_FAILED` + `errors.ForeignAmount` |
| `targetCurrency ≠ LAK` và `targetRateToLak ≤ 0` hoặc null | `VALIDATION_FAILED` + `errors.TargetRateToLak` |

```json
{
  "status": 422,
  "errorCode": "VALIDATION_FAILED",
  "errors": {
    "TargetRateToLak": ["TargetRateToLak phải > 0 khi TargetCurrency khác LAK."]
  }
}
```

### Các mã lỗi khác

| `errorCode` | HTTP | Nguyên nhân |
|---|---|---|
| `COUNTER_NOT_FOUND` | 422 | Cashier chưa được phân công quầy |
| `USER_NOT_FOUND` | 404 | JWT `sub` không tồn tại |
| `TRANSACTION_NOT_FOUND` | 404 | Hủy: ID không tồn tại |
| `TRANSACTION_ALREADY_CANCELLED` | 422 | Hủy: đã hủy trước đó |

---

## 10. Checklist tích hợp FE

- [ ] Gọi `GET /api/config/exchange-rates` khi mount màn hình FX — lưu vào state
- [ ] Dùng `effectiveRate` (không phải `rateToLak`) để tính và điền `exchangeRate`, `targetRateToLak`
- [ ] Khi `targetCurrency = "LAK"`: không gửi `targetRateToLak` (hoặc gửi `null`)
- [ ] Khi `targetCurrency ≠ "LAK"`: bắt buộc gửi `targetRateToLak > 0`
- [ ] Luôn gửi `items: []`
- [ ] Preview `targetAmount` trên UI trước khi submit: `round(foreignAmount × sourceRate / targetRate, 4)`
- [ ] Sau `201`: lấy `id` → `GET /api/transactions/{id}` → đọc `targetAmount`, `targetCurrency` để in phiếu
- [ ] Phiếu in: hiển thị `sourceAmount → targetAmount targetCurrency` (không chỉ LAK)
