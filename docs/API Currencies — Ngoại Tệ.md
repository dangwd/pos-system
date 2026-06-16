# API Currencies — Ngoại Tệ

> Base URL: `https://<host>/api/currencies`
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`
> Content-Type: `application/json`

---

## Tổng


Quản lý danh mục các loại tiền tệ được hỗ trợ trong hệ thống (LAK, USD, THB, ...).

**Mục đích chính:**
- Cung cấp danh sách tiền tệ cho **dropdown chọn ngoại tệ khi mở ca bán hàng** (`POST /api/sales-shifts/open`)
- Quản lý `foreignCurrencyBalances` — số dư ngoại tệ đầu/cuối ca

**Seed mặc định:**

| Code | Tên | Ký hiệu | SortOrder |
|---|---|---|---|
| `LAK` | Lao Kip | ₭ | 1 |
| `USD` | US Dollar | $ | 2 |
| `THB` | Thai Baht | ฿ | 3 |

> LAK là đơn vị tiền tệ chính của hệ thống. Số dư LAK trong ca bán hàng được lưu riêng ở `openingCashLak` / `closingCashLak` — không dùng `currencyBalances`. Các entry trong `currencyBalances` chỉ dành cho ngoại tệ (USD, THB, ...).

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/currencies` | Đăng nhập | Danh sách tất cả tiền tệ |
| `GET` | `/api/currencies/{id}` | Đăng nhập | Chi tiết một tiền tệ |
| `POST` | `/api/currencies` | `ConfigPrice` | Thêm tiền tệ mới |
| `PUT` | `/api/currencies/{id}` | `ConfigPrice` | Cập nhật thông tin tiền tệ |
| `DELETE` | `/api/currencies/{id}` | `ConfigPrice` | Xóa tiền tệ |

> **Policy `ConfigPrice`:** áp dụng cho Manager và SystemAdmin.

---

## `GET /api/currencies`

Lấy danh sách tất cả loại tiền tệ, sắp xếp theo `SortOrder` tăng dần.
Dùng để nạp dropdown chọn ngoại tệ trên màn hình mở ca.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Response `200 OK`:**

```json
[
  {
    "id": "44444444-0000-0000-0000-000000000001",
    "code": "LAK",
    "name": "Lao Kip",
    "symbol": "₭",
    "isActive": true,
    "sortOrder": 1
  },
  {
    "id": "44444444-0000-0000-0000-000000000002",
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$",
    "isActive": true,
    "sortOrder": 2
  },
  {
    "id": "44444444-0000-0000-0000-000000000003",
    "code": "THB",
    "name": "Thai Baht",
    "symbol": "฿",
    "isActive": true,
    "sortOrder": 3
  }
]
```

> Trả về **tất cả** tiền tệ (kể cả `isActive: false`). Frontend tự lọc nếu cần chỉ hiện tiền tệ đang hoạt động.

---

## `GET /api/currencies/{id}`

Lấy chi tiết một loại tiền tệ theo UUID.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Path param:** `id` (Guid) — UUID của tiền tệ.

**Response `200 OK`:** [`CurrencyDto`](#schema-currencydto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_NOT_FOUND` | 404 | Không tìm thấy tiền tệ với ID đã cho |

---

## `POST /api/currencies`

Thêm một loại tiền tệ mới vào danh mục.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Request body:**

```json
{
  "code": "CNY",
  "name": "Chinese Yuan",
  "symbol": "¥",
  "sortOrder": 4,
  "isActive": true
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `code` | ✅ | string | Mã ISO 4217, viết hoa, tối đa 10 ký tự (ví dụ: `USD`, `CNY`) |
| `name` | ✅ | string | Tên đầy đủ của tiền tệ, tối đa 100 ký tự |
| `symbol` | ✅ | string | Ký hiệu hiển thị, tối đa 10 ký tự (ví dụ: `$`, `¥`) |
| `sortOrder` | ✅ | int | Thứ tự sắp xếp trong danh sách dropdown |
| `isActive` | ❌ | bool | Mặc định `true` — tiền tệ đang hoạt động |

> `code` phải **duy nhất** trong toàn hệ thống (unique index). Sau khi tạo, mã không thể đổi.

**Response `201 Created`:** [`CurrencyDto`](#schema-currencydto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_CODE_DUPLICATE` | 422 | Mã tiền tệ (`code`) đã tồn tại trong hệ thống |

---

## `PUT /api/currencies/{id}`

Cập nhật thông tin của một tiền tệ. **Không cho phép đổi `code`** — mã là định danh cố định.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Path param:** `id` (Guid) — UUID của tiền tệ.

**Request body:**

```json
{
  "name": "US Dollar (updated)",
  "symbol": "$",
  "isActive": true,
  "sortOrder": 2
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `name` | ✅ | string | Tên đầy đủ mới, tối đa 100 ký tự |
| `symbol` | ✅ | string | Ký hiệu mới, tối đa 10 ký tự |
| `isActive` | ✅ | bool | `true` = đang hoạt động / `false` = tạm ẩn khỏi dropdown |
| `sortOrder` | ✅ | int | Thứ tự sắp xếp mới |

**Response `200 OK`:** [`CurrencyDto`](#schema-currencydto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_NOT_FOUND` | 404 | Không tìm thấy tiền tệ với ID đã cho |

---

## `DELETE /api/currencies/{id}`

Xóa vĩnh viễn một loại tiền tệ khỏi danh mục.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Path param:** `id` (Guid) — UUID của tiền tệ.

**Response `204 No Content`** — xóa thành công, không có body.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_NOT_FOUND` | 404 | Không tìm thấy tiền tệ với ID đã cho |
| `CURRENCY_IN_USE` | 422 | Tiền tệ đang được sử dụng trong `sales_shift_currency_balances` — không thể xóa |

> Để vô hiệu hóa tiền tệ mà không xóa (giữ lịch sử), dùng `PUT` với `isActive: false`.

---

## Schema: `CurrencyDto`

```json
{
  "id": "44444444-0000-0000-0000-000000000002",
  "code": "USD",
  "name": "US Dollar",
  "symbol": "$",
  "isActive": true,
  "sortOrder": 2
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | Guid | UUID của tiền tệ |
| `code` | string | Mã ISO viết hoa — định danh cố định (không đổi sau khi tạo) |
| `name` | string | Tên đầy đủ |
| `symbol` | string | Ký hiệu hiển thị trên UI |
| `isActive` | bool | `true` = đang hoạt động |
| `sortOrder` | int | Thứ tự sắp xếp trong dropdown (nhỏ hơn = hiện trước) |

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_NOT_FOUND` | 404 | Không tìm thấy tiền tệ với ID đã cho |
| `CURRENCY_CODE_DUPLICATE` | 422 | Mã tiền tệ đã tồn tại — không được phép trùng |
| `CURRENCY_IN_USE` | 422 | Tiền tệ đang được dùng trong ca bán hàng — không thể xóa |

---

## Luồng sử dụng điển hình

```
1. Manager thêm ngoại tệ  → POST /api/currencies
                             body: { code: "CNY", name: "Chinese Yuan", symbol: "¥", sortOrder: 4 }
                             → 201: CurrencyDto { id: "...", code: "CNY", ... }

2. Cashier mở màn hình    → GET  /api/currencies
   "Mở ca bán hàng"         → [ LAK, USD, THB, CNY ]  (sắp xếp theo sortOrder)

3. Cashier chọn ngoại tệ  → POST /api/sales-shifts/open
   đầu ca                   body: {
                               openingCashLak: 5000000,
                               foreignCurrencyBalances: [
                                 { currency: "USD", openingAmount: 200 },
                                 { currency: "THB", openingAmount: 5000 }
                               ]
                             }
                             → 201: SalesShiftDetailDto { currencyBalances: [...] }

4. Manager vô hiệu hóa   → PUT  /api/currencies/{id}
   tiền tệ ít dùng          body: { ..., isActive: false }
                             → 200: CurrencyDto { isActive: false }

5. Manager xóa tiền tệ   → DELETE /api/currencies/{id}
   (chưa dùng bao giờ)      → 204 No Content

6. Xóa tiền tệ đang dùng → DELETE /api/currencies/{id}
                             → 422: { errorCode: "CURRENCY_IN_USE" }
```

---

## Liên quan

- [API Sales Shifts — Ca Bán Hàng](./API%20Sales%20Shifts%20—%20Ca%20Bán%20Hàng.md) — sử dụng `currencyBalances` khi mở/chốt ca
- Bảng DB: `currencies`, `sales_shift_currency_balances`
