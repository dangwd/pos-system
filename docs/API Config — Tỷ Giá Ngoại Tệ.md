# API Config — Tỷ Giá Ngoại Tệ

> Base URL: `https://<host>/api/config`  
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`  
> Content-Type: `application/json`

---

## Tổng quan

Hệ thống quản lý tỷ giá ngoại tệ theo **hai lớp độc lập**:

| Lớp | Bảng DB | Mục đích |
|-----|---------|---------|
| **Tỷ giá LAK** | `exchange_rates` | Lưu `1 ngoại tệ = X LAK` — dùng để tính tiền thu/trả trong giao dịch POS |
| **Rate Graph** | `exchange_rate_pairs` | Lưu tỷ giá theo từng cặp bất kỳ (USD↔THB, LAK↔USD, ...) — dùng để hiển thị tỷ giá chéo và hỗ trợ màn hình cấu hình |
| **Lịch sử Rate Graph** | `exchange_rate_pair_logs` | Append-only, ghi lại mỗi lần cập nhật cặp tỷ giá kèm `session_id` để gom nhóm theo phiên |

### Thiết kế Rate Graph (Hướng B)

Rate Graph lưu tỷ giá như một đồ thị có hướng: mỗi bản ghi là một cạnh `from → to` với `rate`.

```
from  │ to   │ rate
──────┼──────┼───────────
LAK   │ USD  │ 0.00004785
USD   │ LAK  │ 20,900
LAK   │ THB  │ 0.00125
THB   │ LAK  │ 800
USD   │ THB  │ 26.125     ← rate thực thị trường, độc lập với LAK
THB   │ USD  │ 0.03828
```

**Khi truy vấn với `?from=USD`:** trả về tất cả cặp bắt đầu từ USD. Với cặp chưa tồn tại trong DB, hệ thống **tự tính cross-rate qua LAK** và đánh dấu `isComputed: true`.

**Seed mặc định:** 6 cặp THB↔LAK, USD↔LAK, USD↔THB (tính từ tỷ giá khởi tạo).

---

## Danh sách Endpoint

### Tỷ giá LAK (`exchange_rates`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/config/exchange-rates` | Đăng nhập | Tỷ giá hiện tại của mỗi loại ngoại tệ |
| `GET` | `/api/config/exchange-rates/history` | Đăng nhập | Lịch sử theo phiên — phân trang, lọc ngày, lọc tiền tệ |
| `POST` | `/api/config/exchange-rates` | `ConfigPrice` | Cập nhật tỷ giá một loại ngoại tệ |
| `POST` | `/api/config/exchange-rates/bulk` | `ConfigPrice` | Cập nhật hàng loạt nhiều ngoại tệ |

### Rate Graph (`exchange_rate_pairs`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/config/exchange-rate-pairs` | Đăng nhập | Toàn bộ cặp tỷ giá đã lưu |
| `GET` | `/api/config/exchange-rate-pairs?from={code}` | Đăng nhập | Cặp tỷ giá theo base currency (có fallback cross-rate) |
| `GET` | `/api/config/exchange-rate-pairs/history` | Đăng nhập | Lịch sử thay đổi cặp tỷ giá theo phiên — phân trang, lọc ngày, lọc tiền tệ |
| `PUT` | `/api/config/exchange-rate-pairs/{from}/{to}` | `ConfigPrice` | Tạo mới hoặc cập nhật một cặp tỷ giá |
| `POST` | `/api/config/exchange-rate-pairs/bulk` | `ConfigPrice` | Upsert hàng loạt nhiều cặp |

> **Policy `ConfigPrice`:** áp dụng cho Manager và SystemAdmin.

---

## Tỷ giá LAK

### `GET /api/config/exchange-rates`

Lấy tỷ giá đang hiệu lực mới nhất của mỗi loại ngoại tệ (một bản ghi mỗi currency).

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Response `200 OK`:**

```json
[
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "currencyCode": "THB",
    "rateToLak": 800.0000,
    "adjustment": 0.0000,
    "effectiveRate": 800.0000,
    "updatedBy": "11111111-0000-0000-0000-000000000001",
    "updatedAt": "2026-06-19T10:00:00Z",
    "effectiveFrom": "2026-06-19T10:00:00Z"
  },
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000002",
    "currencyCode": "USD",
    "rateToLak": 20900.0000,
    "adjustment": 0.0000,
    "effectiveRate": 20900.0000,
    "updatedBy": "11111111-0000-0000-0000-000000000001",
    "updatedAt": "2026-06-19T10:00:00Z",
    "effectiveFrom": "2026-06-19T10:00:00Z"
  }
]
```

> `effectiveRate = rateToLak + adjustment` — đây là tỷ giá thực tế áp dụng trong giao dịch.

---

### `GET /api/config/exchange-rates/history`

Lấy lịch sử thay đổi tỷ giá LAK **theo phiên** — có phân trang và lọc. Mỗi phiên gom tất cả loại ngoại tệ được cập nhật cùng lúc trong một lần gọi. Sắp xếp phiên mới nhất trước.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Query params:**

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|---------|-------|
| `page` | int | `1` | Trang hiện tại (bắt đầu từ 1) |
| `pageSize` | int | `20` | Số **phiên** trên mỗi trang |
| `fromDate` | datetime | — | Lọc phiên có `effectiveFrom ≥ fromDate` |
| `toDate` | datetime | — | Lọc phiên có `effectiveFrom ≤ toDate` |
| `currency` | string | — | Lọc theo mã tiền tệ (ví dụ: `USD`). Khi có filter này, trả về **toàn bộ** các loại ngoại tệ trong phiên chứa currency đó (không cắt bỏ currency khác cùng phiên) |

**Response `200 OK`:** [`PagedResult<ExchangeRateSessionDto>`](#schema-pagedresult)

```json
{
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "sessionId": "bbbbbbbb-0000-0000-0000-000000000001",
      "updatedBy": "11111111-0000-0000-0000-000000000001",
      "updatedAt": "2026-06-22T10:57:00Z",
      "items": [
        { "currencyCode": "CNY", "rateToLak": 1000.0000, "adjustment": 0.0, "effectiveRate": 1000.0000 },
        { "currencyCode": "THB", "rateToLak": 27000.0000, "adjustment": 0.0, "effectiveRate": 27000.0000 },
        { "currencyCode": "USD", "rateToLak": 27500.0000, "adjustment": 0.0, "effectiveRate": 27500.0000 }
      ]
    },
    {
      "sessionId": "bbbbbbbb-0000-0000-0000-000000000002",
      "updatedBy": "11111111-0000-0000-0000-000000000001",
      "updatedAt": "2026-06-22T11:35:00Z",
      "items": [
        { "currencyCode": "USD", "rateToLak": 88938.0000, "adjustment": 0.0, "effectiveRate": 88938.0000 }
      ]
    }
  ]
}
```

> `items` trong mỗi phiên được sắp xếp theo `currencyCode` tăng dần (alphabetical).  
> `sessionId = null` có thể xuất hiện ở dữ liệu cũ tạo trước khi tính năng phiên được triển khai — mỗi bản ghi đó hiển thị như một phiên độc lập.

---

### `POST /api/config/exchange-rates`

Tạo bản ghi tỷ giá mới cho một loại ngoại tệ. **Không ghi đè bản cũ** — mỗi lần gọi tạo một entry mới với `effectiveFrom = UtcNow`. Bản ghi được gán một `sessionId` riêng, hiển thị trong lịch sử như một phiên đơn.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Request body:**

```json
{
  "currencyCode": "THB",
  "rateToLak": 810.0,
  "adjustment": 5.0
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|-------|---------|------|-------|
| `currencyCode` | ✅ | string | Mã tiền tệ viết hoa (ví dụ: `THB`, `USD`) |
| `rateToLak` | ✅ | decimal | `1 ngoại tệ = X LAK` (giá tham chiếu) |
| `adjustment` | ✅ | decimal | Điều chỉnh thêm vào rate (dương hoặc âm). `effectiveRate = rateToLak + adjustment` |

**Response `200 OK`:** [`ExchangeRateDto`](#schema-exchangeratedto)

---

### `POST /api/config/exchange-rates/bulk`

Cập nhật tỷ giá của nhiều loại ngoại tệ cùng lúc trong một request. Tất cả item trong cùng request **chia sẻ một `sessionId`** — lịch sử sẽ hiển thị chúng gộp thành một phiên duy nhất.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Request body:**

```json
{
  "items": [
    { "currencyCode": "THB", "rateToLak": 810.0, "adjustment": 5.0 },
    { "currencyCode": "USD", "rateToLak": 21000.0, "adjustment": 0.0 }
  ]
}
```

**Response `200 OK`:** Mảng [`ExchangeRateDto`](#schema-exchangeratedto).

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_EXCHANGE_RATE_ITEMS_EMPTY` | 422 | Mảng `items` rỗng |

---

## Rate Graph

### `GET /api/config/exchange-rate-pairs`

Lấy toàn bộ cặp tỷ giá đã được lưu trực tiếp trong DB, không bổ sung cross-rate tính toán.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Response `200 OK`:**

```json
[
  { "from": "LAK", "to": "THB", "rate": 0.00125000, "isComputed": false, "updatedBy": "...", "updatedAt": "2026-06-22T08:00:00Z" },
  { "from": "LAK", "to": "USD", "rate": 0.00004785, "isComputed": false, "updatedBy": "...", "updatedAt": "2026-06-22T08:00:00Z" },
  { "from": "THB", "to": "LAK", "rate": 800.00000000, "isComputed": false, "updatedBy": "...", "updatedAt": "2026-06-22T08:00:00Z" },
  { "from": "THB", "to": "USD", "rate": 0.03828000, "isComputed": false, "updatedBy": "...", "updatedAt": "2026-06-22T08:00:00Z" },
  { "from": "USD", "to": "LAK", "rate": 20900.00000000, "isComputed": false, "updatedBy": "...", "updatedAt": "2026-06-22T08:00:00Z" },
  { "from": "USD", "to": "THB", "rate": 26.12500000, "isComputed": false, "updatedBy": "...", "updatedAt": "2026-06-22T08:00:00Z" }
]
```

---

### `GET /api/config/exchange-rate-pairs?from={code}`

Lấy tất cả tỷ giá có **tiền gốc = `from`**. Với mỗi ngoại tệ đã biết trong hệ thống (`exchange_rates`) mà chưa có cặp lưu trực tiếp, backend **tự tính cross-rate qua LAK** và đánh dấu `isComputed: true`.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Query params:**

| Param | Kiểu | Bắt buộc | Mô tả |
|-------|------|---------|-------|
| `from` | string | ✅ | Mã tiền gốc (ví dụ: `USD`, `THB`, `LAK`) |

**Response `200 OK` (ví dụ `?from=USD`):**

```json
[
  {
    "from": "USD",
    "to": "LAK",
    "rate": 20900.00000000,
    "isComputed": false,
    "updatedBy": "11111111-0000-0000-0000-000000000001",
    "updatedAt": "2026-06-22T08:00:00Z"
  },
  {
    "from": "USD",
    "to": "THB",
    "rate": 26.12500000,
    "isComputed": false,
    "updatedBy": "11111111-0000-0000-0000-000000000001",
    "updatedAt": "2026-06-22T08:00:00Z"
  },
  {
    "from": "USD",
    "to": "CNY",
    "rate": 5.50000000,
    "isComputed": true,
    "updatedBy": null,
    "updatedAt": null
  }
]
```

**Cách tính cross-rate qua LAK:**

```
1 USD = 20,900 LAK
1 CNY = 3,800 LAK

→ 1 USD = 20,900 / 3,800 CNY = 5.5 CNY  (isComputed: true)
```

> Nếu `from` là một mã tiền tệ không có tỷ giá LAK (không có trong `exchange_rates` và không phải `LAK`), backend chỉ trả về các cặp đã lưu trực tiếp, không tính cross-rate.

**Kết quả được sắp xếp theo `to` tăng dần (alphabetical).**

---

### `PUT /api/config/exchange-rate-pairs/{from}/{to}`

Tạo mới hoặc cập nhật tỷ giá cho một cặp tiền tệ cụ thể (**upsert**). Nếu cặp `(from, to)` đã tồn tại → cập nhật `rate` và `updatedAt`. Nếu chưa tồn tại → tạo mới.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Path params:**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `from` | string | Mã tiền gốc, ví dụ: `USD` |
| `to` | string | Mã tiền đích, ví dụ: `THB` |

**Request body:**

```json
{
  "rate": 35.5
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|-------|---------|------|-------|
| `rate` | ✅ | decimal | Tỷ giá: `1 from = rate to`. Phải lớn hơn 0 |

**Response `200 OK`:** [`ExchangeRatePairDto`](#schema-exchangeratepairdto) với `isComputed: false`.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_EXCHANGE_RATE_PAIR_SAME_CURRENCY` | 422 | `from` và `to` là cùng một loại tiền tệ |
| `CONFIG_EXCHANGE_RATE_PAIR_INVALID_RATE` | 422 | `rate` ≤ 0 |

**Ví dụ:** Lưu tỷ giá thực tế USD→THB từ thị trường:

```
PUT /api/config/exchange-rate-pairs/USD/THB
Body: { "rate": 35.5 }

→ 200: { "from": "USD", "to": "THB", "rate": 35.5, "isComputed": false, ... }
```

---

### `POST /api/config/exchange-rate-pairs/bulk`

Upsert nhiều cặp tỷ giá cùng lúc trong một request. Với mỗi item, nếu cặp đã tồn tại → cập nhật, chưa tồn tại → tạo mới.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Request body:**

```json
{
  "items": [
    { "from": "USD", "to": "THB", "rate": 35.5 },
    { "from": "THB", "to": "USD", "rate": 0.02817 },
    { "from": "USD", "to": "LAK", "rate": 20900.0 },
    { "from": "LAK", "to": "USD", "rate": 0.00004785 }
  ]
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|-------|---------|------|-------|
| `items` | ✅ | array | Danh sách cặp tỷ giá cần upsert. Tối thiểu 1 item |
| `items[].from` | ✅ | string | Mã tiền gốc |
| `items[].to` | ✅ | string | Mã tiền đích |
| `items[].rate` | ✅ | decimal | Tỷ giá. Phải lớn hơn 0 |

**Response `200 OK`:** Mảng [`ExchangeRatePairDto`](#schema-exchangeratepairdto), tất cả có `isComputed: false`.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_EXCHANGE_RATE_PAIR_ITEMS_EMPTY` | 422 | Mảng `items` rỗng |
| `CONFIG_EXCHANGE_RATE_PAIR_SAME_CURRENCY` | 422 | Có item mà `from` và `to` trùng nhau |
| `CONFIG_EXCHANGE_RATE_PAIR_INVALID_RATE` | 422 | Có item có `rate` ≤ 0 |

---

### `GET /api/config/exchange-rate-pairs/history`

Lấy lịch sử thay đổi cặp tỷ giá (Rate Graph) **theo phiên** — có phân trang và lọc. Mỗi lần gọi `PUT` hoặc `POST /bulk` đều tạo một phiên mới trong bảng `exchange_rate_pair_logs`. Sắp xếp phiên mới nhất trước.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Query params:**

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|---------|-------|
| `page` | int | `1` | Trang hiện tại (bắt đầu từ 1) |
| `pageSize` | int | `20` | Số **phiên** trên mỗi trang |
| `fromDate` | datetime | — | Lọc phiên có `updatedAt ≥ fromDate` |
| `toDate` | datetime | — | Lọc phiên có `updatedAt ≤ toDate` |
| `currency` | string | — | Lọc theo mã tiền tệ (ví dụ: `USD`). Khớp nếu currency xuất hiện ở **`from` hoặc `to`** trong bất kỳ cặp nào của phiên. Khi có filter này, trả về **toàn bộ** các cặp trong phiên đó (không cắt bỏ cặp khác cùng phiên) |

**Response `200 OK`:** [`PagedResult<ExchangeRatePairSessionDto>`](#schema-pagedresult)

```json
{
  "total": 12,
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "sessionId": "cccccccc-0000-0000-0000-000000000001",
      "updatedBy": "11111111-0000-0000-0000-000000000001",
      "updatedAt": "2026-06-22T10:32:00Z",
      "items": [
        { "from": "USD", "to": "THB", "rate": 32.94 },
        { "from": "USD", "to": "YEN", "rate": 161.68 }
      ]
    },
    {
      "sessionId": "cccccccc-0000-0000-0000-000000000002",
      "updatedBy": "11111111-0000-0000-0000-000000000001",
      "updatedAt": "2026-06-22T09:00:00Z",
      "items": [
        { "from": "USD", "to": "LAK", "rate": 20900.0 }
      ]
    }
  ]
}
```

> `items` trong mỗi phiên được sắp xếp theo `from` rồi `to` tăng dần (alphabetical).  
> Chỉ ghi nhận lịch sử từ sau khi tính năng này được triển khai — các thay đổi pair trước đó không có trong bảng `exchange_rate_pair_logs`.

---

## Schema

### Schema: `ExchangeRateDto`

Dùng bởi `GET /exchange-rates` và response của `POST /exchange-rates`, `POST /exchange-rates/bulk`.

```json
{
  "id": "aaaaaaaa-0000-0000-0000-000000000001",
  "currencyCode": "THB",
  "rateToLak": 800.0000,
  "adjustment": 0.0000,
  "effectiveRate": 800.0000,
  "updatedBy": "11111111-0000-0000-0000-000000000001",
  "updatedAt": "2026-06-22T08:00:00Z",
  "effectiveFrom": "2026-06-22T08:00:00Z"
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `id` | Guid | UUID của bản ghi tỷ giá |
| `currencyCode` | string | Mã tiền tệ viết hoa |
| `rateToLak` | decimal | `1 ngoại tệ = X LAK` (tỷ giá tham chiếu) |
| `adjustment` | decimal | Biên độ điều chỉnh thêm |
| `effectiveRate` | decimal | `= rateToLak + adjustment` — tỷ giá thực tế áp dụng |
| `updatedBy` | Guid | UUID của người cập nhật |
| `updatedAt` | datetime | Thời điểm cập nhật (UTC) |
| `effectiveFrom` | datetime | Thời điểm tỷ giá bắt đầu hiệu lực (= `updatedAt`) |

> Mỗi lần cập nhật tạo một bản ghi mới — **không ghi đè bản cũ**. `effectiveFrom` dùng để tra cứu tỷ giá tại một thời điểm lịch sử.

---

### Schema: `PagedResult<T>`

Wrapper phân trang dùng cho tất cả endpoint history.

```json
{
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "items": [ /* mảng T */ ]
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `total` | int | Tổng số **phiên** phù hợp với filter (không phải tổng số bản ghi DB) |
| `page` | int | Trang hiện tại |
| `pageSize` | int | Số phiên tối đa trên trang này |
| `items` | `T[]` | Danh sách phiên của trang hiện tại |

---

### Schema: `ExchangeRateSessionDto`

Phần tử trong `items[]` của `GET /exchange-rates/history`.

```json
{
  "sessionId": "bbbbbbbb-0000-0000-0000-000000000001",
  "updatedBy": "11111111-0000-0000-0000-000000000001",
  "updatedAt": "2026-06-22T10:57:00Z",
  "items": [
    { "currencyCode": "CNY", "rateToLak": 1000.0, "adjustment": 0.0, "effectiveRate": 1000.0 },
    { "currencyCode": "THB", "rateToLak": 27000.0, "adjustment": 0.0, "effectiveRate": 27000.0 },
    { "currencyCode": "USD", "rateToLak": 27500.0, "adjustment": 0.0, "effectiveRate": 27500.0 }
  ]
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `sessionId` | Guid\|null | UUID định danh phiên. `null` = bản ghi cũ trước khi tính năng phiên được triển khai |
| `updatedBy` | Guid | UUID người thực hiện cập nhật |
| `updatedAt` | datetime | Thời điểm cập nhật (UTC) — lấy từ bản ghi mới nhất trong phiên |
| `items` | `ExchangeRateItemDto[]` | Danh sách loại ngoại tệ trong phiên, sắp xếp theo `currencyCode` tăng dần |

### Schema: `ExchangeRateItemDto`

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `currencyCode` | string | Mã tiền tệ viết hoa |
| `rateToLak` | decimal | `1 ngoại tệ = X LAK` |
| `adjustment` | decimal | Biên độ điều chỉnh |
| `effectiveRate` | decimal | `= rateToLak + adjustment` |

---

### Schema: `ExchangeRatePairSessionDto`

Phần tử trong `items[]` của `GET /exchange-rate-pairs/history`.

```json
{
  "sessionId": "cccccccc-0000-0000-0000-000000000001",
  "updatedBy": "11111111-0000-0000-0000-000000000001",
  "updatedAt": "2026-06-22T10:32:00Z",
  "items": [
    { "from": "USD", "to": "THB", "rate": 32.94 },
    { "from": "USD", "to": "YEN", "rate": 161.68 }
  ]
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `sessionId` | Guid\|null | UUID định danh phiên. Bulk upsert → tất cả cặp trong cùng request chia sẻ 1 `sessionId`. Single upsert → mỗi lần gọi có `sessionId` riêng |
| `updatedBy` | Guid | UUID người thực hiện cập nhật |
| `updatedAt` | datetime | Thời điểm cập nhật (UTC) |
| `items` | `ExchangeRatePairLogItemDto[]` | Các cặp được cập nhật trong phiên, sắp xếp theo `from` rồi `to` tăng dần |

### Schema: `ExchangeRatePairLogItemDto`

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `from` | string | Mã tiền gốc (luôn viết hoa) |
| `to` | string | Mã tiền đích (luôn viết hoa) |
| `rate` | decimal(20,8) | `1 from = rate to` tại thời điểm cập nhật |

---

### Schema: `ExchangeRatePairDto`

```json
{
  "from": "USD",
  "to": "THB",
  "rate": 35.50000000,
  "isComputed": false,
  "updatedBy": "11111111-0000-0000-0000-000000000001",
  "updatedAt": "2026-06-22T08:00:00Z"
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `from` | string | Mã tiền gốc (luôn viết hoa) |
| `to` | string | Mã tiền đích (luôn viết hoa) |
| `rate` | decimal(20,8) | `1 from = rate to` |
| `isComputed` | bool | `false` = lưu trực tiếp \| `true` = tính cross-rate qua LAK |
| `updatedBy` | Guid\|null | UUID người cập nhật. `null` nếu `isComputed: true` |
| `updatedAt` | datetime\|null | Thời điểm cập nhật (UTC). `null` nếu `isComputed: true` |

> Không có `id` — khóa chính của bảng là tổng hợp `(from, to)`.

---

## Bảng DB liên quan

| Bảng | Mô tả |
|------|-------|
| `exchange_rates` | Lịch sử tỷ giá LAK — append-only, mỗi cập nhật tạo bản ghi mới, có `effective_from` và `session_id` |
| `exchange_rate_pairs` | Rate Graph — PK tổng hợp `(from_currency, to_currency)`, chỉ lưu trạng thái hiện tại (upsert) |
| `exchange_rate_pair_logs` | Lịch sử Rate Graph — append-only, ghi kèm `session_id` mỗi lần upsert pair |

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_EXCHANGE_RATE_ITEMS_EMPTY` | 422 | Gửi `items: []` cho endpoint bulk tỷ giá LAK |
| `CONFIG_EXCHANGE_RATE_PAIR_ITEMS_EMPTY` | 422 | Gửi `items: []` cho endpoint bulk Rate Graph |
| `CONFIG_EXCHANGE_RATE_PAIR_SAME_CURRENCY` | 422 | `from` và `to` là cùng một loại tiền tệ |
| `CONFIG_EXCHANGE_RATE_PAIR_INVALID_RATE` | 422 | `rate` ≤ 0 |

---

## Luồng sử dụng điển hình

```
── Cập nhật tỷ giá hàng ngày ─────────────────────────────────────────────────

1. Manager mở màn hình cấu hình tỷ giá
   → GET /api/config/exchange-rates
     ← [{ currencyCode: "THB", effectiveRate: 800 }, { currencyCode: "USD", effectiveRate: 20900 }]

2. Manager cập nhật tỷ giá LAK (bắt buộc để POS tính tiền đúng)
   → POST /api/config/exchange-rates/bulk
     body: { items: [
       { currencyCode: "THB", rateToLak: 810, adjustment: 0 },
       { currencyCode: "USD", rateToLak: 21000, adjustment: 0 },
       { currencyCode: "CNY", rateToLak: 3900, adjustment: 0 }
     ]}
     ← [{ currencyCode: "THB", effectiveRate: 810 }, ...]
     (3 currency → cùng sessionId → hiển thị 1 phiên trong lịch sử)

── Xem lịch sử thay đổi tỷ giá LAK ─────────────────────────────────────────

3. Manager mở tab "Lịch sử thay đổi"
   → GET /api/config/exchange-rates/history?page=1&pageSize=10
     ← {
         total: 3, page: 1, pageSize: 10,
         items: [
           {
             sessionId: "abc...",
             updatedAt: "2026-06-22T10:57:00Z",
             updatedBy: "uuid-manager",
             items: [                              ← 3 loại trong cùng một lần bulk
               { currencyCode: "CNY", effectiveRate: 3900 },
               { currencyCode: "THB", effectiveRate: 810 },
               { currencyCode: "USD", effectiveRate: 21000 }
             ]
           }
         ]
       }

   Lọc theo ngày và tiền tệ:
   → GET /api/config/exchange-rates/history?fromDate=2026-06-22&currency=USD
     ← Chỉ trả về các phiên ngày 22/06 có liên quan đến USD,
       kèm đầy đủ các loại tiền khác trong cùng phiên đó

── Cập nhật Rate Graph (tùy chọn) ───────────────────────────────────────────

4. Manager muốn thiết lập tỷ giá thực tế USD↔THB từ thị trường
   → POST /api/config/exchange-rate-pairs/bulk
     body: { items: [
       { from: "USD", to: "THB", rate: 26.5 },
       { from: "THB", to: "USD", rate: 0.03774 }
     ]}
     ← [{ from: "USD", to: "THB", rate: 26.5, isComputed: false }, ...]
     (2 cặp → cùng sessionId → hiển thị 1 phiên trong lịch sử pairs)

── Xem lịch sử thay đổi Rate Graph ──────────────────────────────────────────

5. Manager xem lịch sử thay đổi cặp tỷ giá
   → GET /api/config/exchange-rate-pairs/history?page=1&pageSize=10
     ← {
         total: 5, page: 1, pageSize: 10,
         items: [
           {
             sessionId: "ccc...",
             updatedAt: "2026-06-22T11:00:00Z",
             updatedBy: "uuid-manager",
             items: [
               { from: "THB", to: "USD", rate: 0.03774 },
               { from: "USD", to: "THB", rate: 26.5 }
             ]
           }
         ]
       }

   Lọc theo tiền tệ:
   → GET /api/config/exchange-rate-pairs/history?currency=THB
     ← Chỉ trả về các phiên có cặp chứa THB (from hoặc to),
       kèm đầy đủ các cặp khác trong cùng phiên đó

── Màn hình thiết lập tỷ giá (base = USD) ───────────────────────────────────

6. Frontend lấy tỷ giá để hiển thị với tiền gốc = USD
   → GET /api/config/exchange-rate-pairs?from=USD
     ← [
         { from: "USD", to: "LAK", rate: 21000, isComputed: false },  ← lưu trực tiếp
         { from: "USD", to: "THB", rate: 26.5,  isComputed: false },  ← lưu trực tiếp
         { from: "USD", to: "CNY", rate: 5.385, isComputed: true  }   ← tính qua LAK (21000/3900)
       ]

   UI hiển thị:
   • 1 USD = 21,000 ₭      [Đã lưu]
   • 1 USD = 26.5 THB       [Đã lưu]
   • 1 USD ≈ 5.385 CNY      [Tính từ LAK]
```

---

## Ghi chú thiết kế

**Tại sao có hai lớp?**

- `exchange_rates` (LAK-based) là **nguồn sự thật duy nhất** cho giao dịch POS: tất cả tiền thu/trả đều quy về LAK.
- `exchange_rate_pairs` (Rate Graph) phục vụ **hiển thị và cấu hình**: cho phép lưu tỷ giá thực tế giữa hai ngoại tệ (không qua LAK) khi thị trường có chênh lệch với cross-rate tính toán.

**Cảnh báo triangular arbitrage:**

Rate Graph cho phép lưu `USD→THB = 26.5` trong khi cross-rate tính từ LAK ra `USD→THB = 21000/810 ≈ 25.93`. Backend **không ngăn** sự chênh lệch này — frontend nên hiển thị cảnh báo khi phát hiện chênh lệch đáng kể (> 2%) giữa rate lưu và cross-rate tính từ LAK.

---

## Liên quan

- [Thiết kế hệ thống Tỷ giá](./Thiết%20kế%20hệ%20thống%20Tỷ%20giá.md) — phân tích 3 hướng thiết kế, lý do chọn Rate Graph
- [API Currencies — Ngoại Tệ](./API%20Currencies%20—%20Ngoại%20Tệ.md) — quản lý danh mục loại tiền tệ
- Bảng DB: `exchange_rates`, `exchange_rate_pairs`
