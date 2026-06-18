# API Currencies — Ngoại Tệ

> Base URL: `https://<host>/api/currencies`
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`
> Content-Type: `application/json`

---

## Tổng quan

Quản lý danh mục các loại tiền tệ được hỗ trợ trong hệ thống (LAK, USD, THB, ...).

**Mục đích chính:**
- Cung cấp danh sách tiền tệ cho **dropdown chọn ngoại tệ khi mở ca bán hàng** (`POST /api/sales-shifts/open`)
- Quản lý `foreignCurrencyBalances` — số dư ngoại tệ đầu/cuối ca
- Lưu **danh sách mệnh giá** (`denominations`) của từng tiền tệ — dùng ở **2 nơi**:
  1. **Ca bán hàng** (`POST /api/sales-shifts/open` và `POST /api/sales-shifts/{id}/close`) — nhập chi tiết số tờ từng mệnh giá lúc mở và chốt ca
  2. **Bảng kê đếm tiền** (`PUT /api/cash-ledger/cash-count`) — kiểm đếm mệnh giá cuối ngày

**Nơi sử dụng `denominations` và trường tiền:**

| Nghiệp vụ | API | Trường tiền LAK | Trường tiền ngoại tệ |
|---|---|---|---|
| Mở ca | `POST /api/sales-shifts/open` | `openingCashLak` (tiền mặt) · `openingBankLak` (chuyển khoản) | `foreignCurrencyBalances[].openingAmount` |
| Mở ca — mệnh giá | `POST /api/sales-shifts/open` | `lakDenominations[].value` | `foreignCurrencyBalances[].denominations[].value` |
| Chốt ca | `POST /api/sales-shifts/{id}/close` | `closingCashLak` (tiền mặt) · `closingBankLak` (chuyển khoản) | `foreignCurrencyBalances[].closingAmount` |
| Chốt ca — mệnh giá | `POST /api/sales-shifts/{id}/close` | `lakDenominations[].value` | `foreignCurrencyBalances[].denominations[].value` |
| Xem ca | `GET /api/sales-shifts/{id}` | `openingCashLak` · `openingBankLak` · `closingCashLak` · `closingBankLak` | `currencyBalances[].openingAmount` · `closingAmount` + `denominations[]` |
| Kiểm đếm tiền | `GET/PUT /api/cash-ledger/cash-count` | — | `items[].denomination` · `items[].currency` |

> **LAK tách cash/bank:** `openingCashLak` = tiền mặt thực đếm, `openingBankLak` = số dư tài khoản ngân hàng. Hai trường này **đều bắt buộc** khi mở/chốt ca.
> **Ngoại tệ không tách cash/bank:** `openingAmount` / `closingAmount` là tổng số lượng ngoại tệ — không phân biệt tiền mặt hay chuyển khoản.
> **LAK denomination** lấy từ `GET /api/currencies` — `currencies[code=LAK].denominations`. Frontend dùng cùng nguồn data cho cả LAK và ngoại tệ.

**Seed mặc định:**

| Code | Tên | Ký hiệu | Flag | SortOrder |
|---|---|---|---|---|
| `LAK` | Lao Kip | ₭ | 🇱🇦 | 1 |
| `THB` | Thai Baht | ฿ | 🇹🇭 | 2 |
| `USD` | US Dollar | $ | 🇺🇸 | 3 |

> LAK là đơn vị tiền tệ chính của hệ thống. Số dư LAK trong ca bán hàng được lưu riêng ở `openingCashLak` / `closingCashLak` — không dùng `currencyBalances`. Các entry trong `currencyBalances` chỉ dành cho ngoại tệ (USD, THB, ...).

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/currencies` | Đăng nhập | Danh sách tất cả tiền tệ (kèm mệnh giá) |
| `GET` | `/api/currencies/{id}` | Đăng nhập | Chi tiết một tiền tệ (kèm mệnh giá) |
| `POST` | `/api/currencies` | `ConfigPrice` | Thêm tiền tệ mới (có thể kèm mệnh giá) |
| `PUT` | `/api/currencies/{id}` | `ConfigPrice` | Cập nhật thông tin và mệnh giá tiền tệ |
| `DELETE` | `/api/currencies/{id}` | `ConfigPrice` | Xóa tiền tệ |

> **Policy `ConfigPrice`:** áp dụng cho Manager và SystemAdmin.

---

## `GET /api/currencies`

Lấy danh sách tất cả loại tiền tệ, sắp xếp theo `SortOrder` tăng dần. Mỗi tiền tệ kèm theo danh sách mệnh giá sắp xếp tăng dần.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Response `200 OK`:**

```json
[
  {
    "id": "44444444-0000-0000-0000-000000000001",
    "code": "LAK",
    "name": "Lao Kip",
    "symbol": "₭",
    "flag": "🇱🇦",
    "isActive": true,
    "sortOrder": 1,
    "denominations": [
      { "value": 1000 },
      { "value": 2000 },
      { "value": 5000 },
      { "value": 10000 },
      { "value": 20000 },
      { "value": 50000 },
      { "value": 100000 },
      { "value": 200000 },
      { "value": 500000 },
      { "value": 1000000 },
      { "value": 2000000 },
      { "value": 5000000 },
      { "value": 10000000 },
      { "value": 20000000 },
      { "value": 50000000 },
      { "value": 100000000 }
    ]
  },
  {
    "id": "44444444-0000-0000-0000-000000000002",
    "code": "THB",
    "name": "Thai Baht",
    "symbol": "฿",
    "flag": "🇹🇭",
    "isActive": true,
    "sortOrder": 2,
    "denominations": [
      { "value": 20 },
      { "value": 50 },
      { "value": 100 },
      { "value": 500 },
      { "value": 1000 }
    ]
  },
  {
    "id": "44444444-0000-0000-0000-000000000003",
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$",
    "flag": "🇺🇸",
    "isActive": true,
    "sortOrder": 3,
    "denominations": [
      { "value": 1 },
      { "value": 5 },
      { "value": 10 },
      { "value": 20 },
      { "value": 50 },
      { "value": 100 }
    ]
  }
]
```

> Trả về **tất cả** tiền tệ (kể cả `isActive: false`). Frontend tự lọc nếu cần chỉ hiện tiền tệ đang hoạt động.
> `denominations` là mảng rỗng `[]` nếu tiền tệ chưa cấu hình mệnh giá.
> **Lưu ý:** Seed ban đầu chỉ tạo 3 tiền tệ (LAK, THB, USD) với `denominations: []` — Manager phải dùng `PUT /api/currencies/{id}` để cấu hình mệnh giá. Ví dụ response trên là sau khi đã cấu hình.

---

## `GET /api/currencies/{id}`

Lấy chi tiết một loại tiền tệ theo UUID, kèm danh sách mệnh giá.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Path param:** `id` (Guid) — UUID của tiền tệ.

**Response `200 OK`:** [`CurrencyDto`](#schema-currencydto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_NOT_FOUND` | 404 | Không tìm thấy tiền tệ với ID đã cho |

---

## `POST /api/currencies`

Thêm một loại tiền tệ mới vào danh mục, có thể kèm theo danh sách mệnh giá ngay khi tạo.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Request body:**

```json
{
  "code": "VND",
  "name": "Việt Nam Đồng",
  "symbol": "₫",
  "flag": "🇻🇳",
  "sortOrder": 4,
  "isActive": true,
  "denominations": [10000, 20000, 50000, 100000, 200000, 500000]
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `code` | ✅ | string | Mã ISO 4217, viết hoa, tối đa 10 ký tự (ví dụ: `USD`, `CNY`) |
| `name` | ✅ | string | Tên đầy đủ của tiền tệ, tối đa 100 ký tự |
| `symbol` | ✅ | string | Ký hiệu hiển thị, tối đa 10 ký tự (ví dụ: `$`, `¥`) |
| `sortOrder` | ✅ | int | Thứ tự sắp xếp trong danh sách dropdown |
| `flag` | ❌ | string\|null | Emoji hoặc icon cờ quốc gia (ví dụ: `🇺🇸`), tối đa 50 ký tự |
| `isActive` | ❌ | bool | Mặc định `true` — tiền tệ đang hoạt động |
| `denominations` | ❌ | number[] | Danh sách mệnh giá (số nguyên hoặc thập phân). Mặc định `[]` nếu bỏ qua. Tự động dedup và sắp xếp tăng dần khi lưu |

> `code` phải **duy nhất** trong toàn hệ thống (unique index). Sau khi tạo, mã không thể đổi.

**Response `201 Created`:** [`CurrencyDto`](#schema-currencydto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_CODE_DUPLICATE` | 422 | Mã tiền tệ (`code`) đã tồn tại trong hệ thống |

---

## `PUT /api/currencies/{id}`

Cập nhật thông tin của một tiền tệ và **thay thế toàn bộ danh sách mệnh giá**. **Không cho phép đổi `code`** — mã là định danh cố định.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Path param:** `id` (Guid) — UUID của tiền tệ.

**Request body:**

```json
{
  "name": "Việt Nam Đồng",
  "symbol": "₫",
  "flag": "🇻🇳",
  "isActive": true,
  "sortOrder": 4,
  "denominations": [10000, 20000, 50000, 100000, 200000, 500000]
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `name` | ✅ | string | Tên đầy đủ mới, tối đa 100 ký tự |
| `symbol` | ✅ | string | Ký hiệu mới, tối đa 10 ký tự |
| `flag` | ✅ | string\|null | Emoji cờ quốc gia, hoặc `null` để xóa |
| `isActive` | ✅ | bool | `true` = đang hoạt động / `false` = tạm ẩn khỏi dropdown |
| `sortOrder` | ✅ | int | Thứ tự sắp xếp mới |
| `denominations` | ❌ | number[] | **Thay thế toàn bộ** danh sách mệnh giá cũ. Gửi `[]` để xóa hết mệnh giá. Mặc định `[]` nếu bỏ qua |

> **Lưu ý `denominations`:** Mỗi lần PUT đều **xóa toàn bộ mệnh giá cũ và lưu lại danh sách mới** (replace strategy). Nếu muốn giữ nguyên mệnh giá, phải gửi lại toàn bộ danh sách cũ trong request.

**Response `200 OK`:** [`CurrencyDto`](#schema-currencydto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CURRENCY_NOT_FOUND` | 404 | Không tìm thấy tiền tệ với ID đã cho |

---

## `DELETE /api/currencies/{id}`

Xóa vĩnh viễn một loại tiền tệ khỏi danh mục. Mệnh giá của tiền tệ được xóa tự động theo (cascade delete).

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
  "flag": "🇺🇸",
  "isActive": true,
  "sortOrder": 2,
  "denominations": [
    { "value": 1 },
    { "value": 5 },
    { "value": 10 },
    { "value": 20 },
    { "value": 50 },
    { "value": 100 }
  ]
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | Guid | UUID của tiền tệ |
| `code` | string | Mã ISO viết hoa — định danh cố định (không đổi sau khi tạo) |
| `name` | string | Tên đầy đủ |
| `symbol` | string | Ký hiệu hiển thị trên UI |
| `flag` | string\|null | Emoji cờ quốc gia, `null` nếu chưa cấu hình |
| `isActive` | bool | `true` = đang hoạt động |
| `sortOrder` | int | Thứ tự sắp xếp trong dropdown (nhỏ hơn = hiện trước) |
| `denominations` | `CurrencyDenominationDto[]` | Danh sách mệnh giá sắp xếp tăng dần, `[]` nếu chưa cấu hình |

### Schema: `CurrencyDenominationDto`

```json
{ "value": 50000 }
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `value` | decimal | Giá trị mệnh giá, lưu với độ chính xác 2 chữ số thập phân |

---

## Bảng DB liên quan

| Bảng | Mô tả |
|---|---|
| `currencies` | Thông tin tiền tệ (code, name, symbol, flag, isActive, sortOrder) |
| `currency_denominations` | Mệnh giá — FK `currency_id` → `currencies.id`, cascade delete |

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
1. Manager thêm ngoại tệ    → POST /api/currencies
   kèm mệnh giá               body: {
                                 code: "VND", name: "Việt Nam Đồng",
                                 symbol: "₫", flag: "🇻🇳", sortOrder: 4,
                                 denominations: [10000, 20000, 50000, 100000, 200000, 500000]
                               }
                               → 201: CurrencyDto { id: "...", denominations: [...] }

2. Manager bổ sung mệnh giá → PUT /api/currencies/{id}
   cho USD                    body: {
                                 name: "US Dollar", symbol: "$", flag: "🇺🇸",
                                 isActive: true, sortOrder: 2,
                                 denominations: [1, 5, 10, 20, 50, 100]
                               }
                               → 200: CurrencyDto { denominations: [{ value: 1 }, ..., { value: 100 }] }

3. Manager xóa hết mệnh giá → PUT /api/currencies/{id}
   của một tiền tệ             body: { ..., denominations: [] }
                               → 200: CurrencyDto { denominations: [] }

4. Cashier mở ca             → GET /api/currencies
   (lấy mệnh giá render UI)    → currencies[LAK].denominations → bàn phím mệnh giá LAK
                                  currencies[USD].denominations → bàn phím mệnh giá USD
                                  currencies[THB].denominations → bàn phím mệnh giá THB

5. Cashier mở ca (có kèm   → POST /api/sales-shifts/open
   mệnh giá đầu ca)            body: {
                                 openingCashLak: 5000000,
                                 openingBankLak: 10000000,
                                 lakDenominations: [
                                   { value: 100000, quantity: 30 },
                                   { value: 50000,  quantity: 20 }
                                 ],
                                 foreignCurrencyBalances: [
                                   {
                                     currency: "USD", openingAmount: 200,
                                     denominations: [
                                       { value: 100, quantity: 1 },
                                       { value: 50,  quantity: 2 }
                                     ]
                                   }
                                 ]
                               }
                               → 201: SalesShiftDetailDto {
                                   openingCashLak: 5000000,
                                   openingBankLak: 10000000,
                                   closingCashLak: null,
                                   closingBankLak: null,
                                   lakDenominations: [
                                     { value: 100000, openingQuantity: 30, closingQuantity: null }
                                   ],
                                   currencyBalances: [
                                     { currency: "USD", openingAmount: 200,
                                       denominations: [
                                         { value: 100, openingQuantity: 1, closingQuantity: null }
                                       ]
                                     }
                                   ]
                                 }

6. Cashier chốt ca (có kèm → POST /api/sales-shifts/{id}/close
   mệnh giá cuối ca)           body: {
                                 closingCashLak: 4850000,
                                 closingBankLak: 10500000,
                                 lakDenominations: [
                                   { value: 100000, quantity: 28 }
                                 ],
                                 foreignCurrencyBalances: [
                                   {
                                     currency: "USD", closingAmount: 180,
                                     denominations: [
                                       { value: 100, quantity: 1 },
                                       { value: 50,  quantity: 1 }
                                     ]
                                   }
                                 ]
                               }
                               → 200: SalesShiftDetailDto {
                                   openingCashLak: 5000000,
                                   openingBankLak: 10000000,
                                   closingCashLak: 4850000,
                                   closingBankLak: 10500000,
                                   lakDenominations: [
                                     { value: 100000, openingQuantity: 30, closingQuantity: 28 }
                                   ],
                                   currencyBalances: [
                                     { currency: "USD", openingAmount: 200, closingAmount: 180,
                                       denominations: [
                                         { value: 100, openingQuantity: 1, closingQuantity: 1 },
                                         { value: 50,  openingQuantity: 2, closingQuantity: 1 }
                                       ]
                                     }
                                   ]
                                 }

7. Cashier kiểm đếm tiền   → GET /api/currencies
   cuối ngày (cash-count)      → Dùng denominations[] render bàn phím mệnh giá
                               → PUT /api/cash-ledger/cash-count
                                  items: [
                                    { currency: "LAK", denomination: 100000, quantity: 30 },
                                    { currency: "USD", denomination: 100,    quantity: 2 }
                                  ]

8. Manager xóa tiền tệ      → DELETE /api/currencies/{id}
   (chưa dùng bao giờ)        → 204 No Content (mệnh giá bị xóa theo cascade)

9. Xóa tiền tệ đang dùng   → DELETE /api/currencies/{id}
                               → 422: { errorCode: "CURRENCY_IN_USE" }
```

---

## Liên quan

- [API Sales Shifts — Ca Bán Hàng](./API%20Sales%20Shifts%20—%20Ca%20Bán%20Hàng.md) — `lakDenominations` và `currencyBalances[].denominations` khi mở/chốt ca
- [API Sổ Quỹ — Ngoại Tệ](./API%20Sổ%20Quỹ%20—%20Ngoại%20Tệ%20(Foreign%20Currency).md) — `items[].denomination` trong cash-count
- Bảng DB: `currencies`, `currency_denominations`, `sales_shift_denomination_entries`
