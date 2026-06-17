# API — Cấu hình Tỉ Giá Ngoại Tệ

> **Tạo:** 2026-06-16 | **Cập nhật:** 2026-06-17
> Tài liệu này mô tả các API quản lý tỉ giá ngoại tệ (THB, USD, CNY, EUR, VND → LAK) dùng cho màn hình **Cấu hình → Tỉ giá** và màn hình **Đổi Ngoại Tệ**.

Base URL: `https://<host>/api`
Auth: `Authorization: Bearer <accessToken>`
Quyền cần có để ghi: `config:price` (Manager / SystemAdmin)

---

## Mục lục

1. [Lấy tỉ giá hiện tại — GET /api/config/exchange-rates](#1-lấy-tỉ-giá-hiện-tại)
2. [Lịch sử thay đổi tỉ giá — GET /api/config/exchange-rates/history](#2-lịch-sử-thay-đổi-tỉ-giá)
3. [Cập nhật một tỉ giá — POST /api/config/exchange-rates](#3-cập-nhật-một-tỉ-giá)
4. [Cập nhật hàng loạt — POST /api/config/exchange-rates/bulk](#4-cập-nhật-hàng-loạt)
5. [Cấu trúc tỉ giá hiệu lực](#5-cấu-trúc-tỉ-giá-hiệu-lực)
6. [Mã lỗi liên quan](#6-mã-lỗi-liên-quan)
7. [Gợi ý tích hợp FE](#7-gợi-ý-tích-hợp-fe)

---

## 1. Lấy tỉ giá hiện tại

Trả về danh sách tỉ giá **đang hiệu lực** — mỗi loại ngoại tệ chỉ có 1 bản ghi mới nhất.

```
GET /api/config/exchange-rates
Authorization: Bearer <accessToken>
```

### Response — 200 OK

```jsonc
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "currencyCode": "THB",
    "rateToLak": 820.0,      // 1 THB = 820 LAK (giá gốc nhập vào)
    "adjustment": 5.0,       // biên độ điều chỉnh
    "effectiveRate": 825.0,  // tỉ giá thực dùng = rateToLak + adjustment
    "updatedBy": "uuid-của-người-cập-nhật",
    "updatedAt": "2026-06-17T08:30:00Z",
    "effectiveFrom": "2026-06-17T08:30:00Z"
  },
  {
    "id": "...",
    "currencyCode": "USD",
    "rateToLak": 20500.0,
    "adjustment": 100.0,
    "effectiveRate": 20600.0,
    "updatedBy": "...",
    "updatedAt": "2026-06-16T14:00:00Z",
    "effectiveFrom": "2026-06-16T14:00:00Z"
  }
]
```

> `effectiveRate = rateToLak + adjustment`. Đây là con số dùng khi tính tiền quy đổi — **không tự cộng lại**.

---

## 2. Lịch sử thay đổi tỉ giá

Trả về toàn bộ lịch sử các lần cập nhật tỉ giá, tất cả các loại ngoại tệ, sắp xếp từ mới nhất đến cũ nhất.

```
GET /api/config/exchange-rates/history?limit=50
Authorization: Bearer <accessToken>
```

### Query Parameters

| Tham số | Kiểu | Mặc định | Ghi chú |
|---------|------|----------|---------|
| `limit` | `int` | `50` | Số bản ghi tối đa trả về |

### Response — 200 OK

```jsonc
[
  {
    "id": "uuid-mới-nhất",
    "currencyCode": "THB",
    "rateToLak": 822.0,
    "adjustment": 3.0,
    "effectiveRate": 825.0,
    "updatedBy": "uuid-manager",
    "updatedAt": "2026-06-17T09:00:00Z",
    "effectiveFrom": "2026-06-17T09:00:00Z"
  },
  {
    "id": "uuid-cũ-hơn",
    "currencyCode": "USD",
    "rateToLak": 20500.0,
    "adjustment": 100.0,
    "effectiveRate": 20600.0,
    "updatedBy": "uuid-manager",
    "updatedAt": "2026-06-17T08:30:00Z",
    "effectiveFrom": "2026-06-17T08:30:00Z"
  },
  // ... các bản ghi cũ hơn
]
```

> Khác với `GET /api/config/exchange-rates` (chỉ trả bản mới nhất per currency), endpoint này trả **tất cả** bản ghi, kể cả nhiều bản cùng loại tiền từ các thời điểm khác nhau. FE dùng để hiển thị bảng lịch sử.

---

## 3. Cập nhật một tỉ giá

Cập nhật tỉ giá cho **một loại ngoại tệ**. Mỗi lần gọi tạo **bản ghi mới** (không ghi đè bản cũ), tỉ giá có hiệu lực ngay lập tức.

```
POST /api/config/exchange-rates
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Body

```jsonc
{
  "currencyCode": "THB",   // mã ngoại tệ: "THB" | "USD" | "CNY" | "EUR" | "VND"
  "rateToLak": 820.0,      // 1 đơn vị ngoại tệ = X LAK
  "adjustment": 5.0        // biên độ điều chỉnh (có thể âm hoặc 0)
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| `currencyCode` | `string` | ✅ | Backend tự chuyển sang chữ hoa |
| `rateToLak` | `decimal` | ✅ | Giá gốc: 1 ngoại tệ = X LAK |
| `adjustment` | `decimal` | ✅ | Truyền `0` nếu không điều chỉnh |

### Response — 200 OK

Trả về bản ghi tỉ giá vừa tạo:

```jsonc
{
  "id": "new-uuid",
  "currencyCode": "THB",
  "rateToLak": 820.0,
  "adjustment": 5.0,
  "effectiveRate": 825.0,
  "updatedBy": "uuid-của-người-cập-nhật",
  "updatedAt": "2026-06-17T09:00:00Z",
  "effectiveFrom": "2026-06-17T09:00:00Z"
}
```

---

## 4. Cập nhật hàng loạt

Cập nhật tỉ giá cho **nhiều loại ngoại tệ cùng lúc** trong một request duy nhất. Mỗi currency trong danh sách tạo một bản ghi mới; tất cả được lưu trong cùng một transaction DB.

```
POST /api/config/exchange-rates/bulk
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Body

```jsonc
{
  "items": [
    {
      "currencyCode": "THB",
      "rateToLak": 820.0,
      "adjustment": 5.0
    },
    {
      "currencyCode": "USD",
      "rateToLak": 20500.0,
      "adjustment": 100.0
    },
    {
      "currencyCode": "CNY",
      "rateToLak": 2800.0,
      "adjustment": 0.0
    },
    {
      "currencyCode": "EUR",
      "rateToLak": 22000.0,
      "adjustment": 200.0
    },
    {
      "currencyCode": "VND",
      "rateToLak": 0.8,
      "adjustment": 0.0
    }
  ]
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| `items` | `array` | ✅ | Tối thiểu 1 phần tử; mỗi phần tử là một tỉ giá |
| `items[].currencyCode` | `string` | ✅ | Backend tự chuyển sang chữ hoa |
| `items[].rateToLak` | `decimal` | ✅ | Giá gốc |
| `items[].adjustment` | `decimal` | ✅ | Truyền `0` nếu không điều chỉnh |

### Response — 200 OK

Trả về danh sách các bản ghi tỉ giá vừa tạo, cùng thứ tự với `items` trong request:

```jsonc
[
  {
    "id": "uuid-thb",
    "currencyCode": "THB",
    "rateToLak": 820.0,
    "adjustment": 5.0,
    "effectiveRate": 825.0,
    "updatedBy": "uuid-manager",
    "updatedAt": "2026-06-17T09:00:00Z",
    "effectiveFrom": "2026-06-17T09:00:00Z"
  },
  {
    "id": "uuid-usd",
    "currencyCode": "USD",
    "rateToLak": 20500.0,
    "adjustment": 100.0,
    "effectiveRate": 20600.0,
    "updatedBy": "uuid-manager",
    "updatedAt": "2026-06-17T09:00:00Z",
    "effectiveFrom": "2026-06-17T09:00:00Z"
  }
  // ...
]
```

> Tất cả các bản ghi có cùng `effectiveFrom` (thời điểm gọi request), dùng để nhận biết đây là một "phiên cập nhật hàng loạt".

### Lỗi — 422 Unprocessable Entity

```jsonc
{ "status": 422, "errorCode": "CONFIG_EXCHANGE_RATE_ITEMS_EMPTY" }
```

Xảy ra khi `items` là mảng rỗng `[]`.

---

## 5. Cấu trúc tỉ giá hiệu lực

```
rateToLak     = giá gốc tham chiếu (ví dụ: 820 LAK/THB)
adjustment    = biên độ điều chỉnh  (ví dụ: +5 hoặc -10)
effectiveRate = rateToLak + adjustment  ← dùng con số này khi tính tiền
```

### Ví dụ tính tiền đổi ngoại tệ

```
Khách đổi 1,000 THB → LAK
effectiveRate = 820 + 5 = 825
Số LAK nhận  = 1,000 × 825 = 825,000 ₭
```

### Vòng đời bản ghi

- Mỗi lần POST (đơn hoặc bulk) tạo **bản ghi mới** — không xóa/ghi đè bản cũ.
- `GET /api/config/exchange-rates` luôn trả về **bản mới nhất** của mỗi loại tiền.
- `GET /api/config/exchange-rates/history` trả **toàn bộ lịch sử** không lọc.
- Backend group by `currencyCode`, lấy `MAX(effectiveFrom)` cho endpoint hiện tại.

---

## 6. Mã lỗi liên quan

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|-------------|
| `CONFIG_EXCHANGE_RATE_ITEMS_EMPTY` | 422 | Gọi `/bulk` với `items: []` |
| `AUTH_FORBIDDEN` | 403 | Không có quyền `config:price` (chỉ Manager / SystemAdmin) |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn, cần refresh |
| `SYSTEM_INTERNAL_ERROR` | 500 | Lỗi server không xác định |

---

## 7. Gợi ý tích hợp FE

### Màn hình Cấu hình → Tỉ giá (luồng mới — dialog hàng loạt)

```
1. Mount: gọi GET /api/config/exchange-rates → hiển thị bảng tỉ giá hiện tại
2. User nhấn "Thiết lập tỉ giá" → mở dialog
3. Dialog pre-fill tất cả currencies với giá hiện tại từ bước 1
4. User chỉnh sửa một hoặc nhiều currencies trong dialog
5. Submit: gọi POST /api/config/exchange-rates/bulk với toàn bộ danh sách
6. Sau khi thành công → gọi lại GET /api/config/exchange-rates để refresh state
```

### Màn hình Cấu hình → Tỉ giá (hiển thị lịch sử — lazy load)

```
1. Lần đầu mở tab / accordion lịch sử:
   GET /api/config/exchange-rates/history?limit=50
2. Hiển thị bảng lịch sử, phân trang phía FE (10 bản/trang)
3. Không cần reload sau mỗi lần cập nhật — đặt historyLoaded = false để trigger load lại
```

### Màn hình Đổi Ngoại Tệ — lấy tỉ giá để tính tiền

```
1. Khi mở màn hình: gọi GET /api/config/exchange-rates → lưu vào store/state
2. Khi tính tiền: dùng effectiveRate (đã có trong response — KHÔNG tự cộng lại)
3. Khi tạo giao dịch: truyền exchangeRate = effectiveRate vào body POST /api/transactions
```

### TypeScript types

```typescript
interface ExchangeRateDto {
  id: string;
  currencyCode: string;       // "THB" | "USD" | "CNY" | "EUR" | "VND"
  rateToLak: number;
  adjustment: number;
  effectiveRate: number;      // = rateToLak + adjustment — dùng con số này
  updatedBy: string;
  updatedAt: string;          // ISO 8601
  effectiveFrom: string;      // ISO 8601
}

interface UpdateExchangeRateRequest {
  currencyCode: string;
  rateToLak: number;
  adjustment: number;
}

interface BulkUpdateExchangeRatesRequest {
  items: UpdateExchangeRateRequest[];
}
```
