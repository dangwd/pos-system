# API Tài liệu — Module Config (`/api/config`)

> **Base URL**: `/api/config`  
> **Phiên bản**: v1  
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Config quản lý toàn bộ cấu hình định giá và phân quyền của hệ thống: bảng giá vàng/bạc (đa hàm lượng), tỷ giá ngoại tệ, bảng giá đá, đơn vị trọng lượng, hàm lượng vàng, và role/permission.

**Phân quyền theo nhóm**:

| Nhóm | Quyền cần có |
|---|---|
| Đọc giá, đơn vị, đá, hàm lượng | `[Authorize]` (mọi user) |
| Cập nhật giá vàng/bạc, tỷ giá | `CONFIG_PRICE` |
| Quản lý đơn vị trọng lượng | `CONFIG_WEIGHT_UNIT` |
| Quản lý bảng giá đá | `CONFIG_STONE_PRICE` |
| Quản lý hàm lượng vàng | `CONFIG_GOLD_PURITY` |
| Roles & Permissions | `USER_MANAGE` |

---

## Endpoints — Bảng giá vàng / bạc

### 1. Lấy giá hiện hành

```
GET /api/config/prices
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
{
  "id": "price-uuid-xxxx",
  "effectiveFrom": "2026-06-10T07:00:00Z",
  "updatedBy": "3fa85f64-...",
  "updatedAt": "2026-06-10T07:00:00Z",
  "items": [
    {
      "goldPurityId": "purity-uuid-0001",
      "purityCode": "9999",
      "hamLuong": 99.99,
      "category": "Gold",
      "buyPricePerChi": 1870000000,
      "sellPricePerChi": 1920000000,
      "buyPricePerGram": 0,
      "sellPricePerGram": 0
    },
    {
      "goldPurityId": "purity-uuid-0002",
      "purityCode": "925",
      "hamLuong": 92.5,
      "category": "Silver",
      "buyPricePerChi": 0,
      "sellPricePerChi": 0,
      "buyPricePerGram": 82000,
      "sellPricePerGram": 87000
    }
  ]
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `effectiveFrom` | `ISO 8601` | Thời điểm bảng giá có hiệu lực (UTC) |
| `updatedBy` | `GUID` | ID người cập nhật |
| `items[]` | `array` | Danh sách giá theo từng hàm lượng |
| `items[].category` | `string` | `Gold` hoặc `Silver` |
| `items[].buyPricePerChi` | `decimal` | Giá mua vàng (LAK/chỉ) — chỉ dùng cho `Gold` |
| `items[].sellPricePerChi` | `decimal` | Giá bán vàng (LAK/chỉ) — chỉ dùng cho `Gold` |
| `items[].buyPricePerGram` | `decimal` | Giá mua bạc (LAK/gram) — chỉ dùng cho `Silver` |
| `items[].sellPricePerGram` | `decimal` | Giá bán bạc (LAK/gram) — chỉ dùng cho `Silver` |

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_PRICE_NOT_FOUND` | Chưa có bảng giá nào trong hệ thống |

---

### 2. Lịch sử bảng giá

```
GET /api/config/prices/history
```

**Quyền**: Mọi user đã đăng nhập

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `limit` | `int` | Không | Số bản ghi trả về (mặc định `20`) |

#### Response — 200 OK

Mảng các bảng giá, mới nhất trước. Mỗi phần tử cùng cấu trúc với response của `GET /prices`.

---

### 3. Cập nhật bảng giá

```
POST /api/config/prices
```

**Quyền**: `CONFIG_PRICE`

> Tạo bản ghi **mới** trong `price_configs` với `effectiveFrom = now` — không ghi đè lịch sử cũ.  
> Phải truyền **đầy đủ** tất cả hàm lượng muốn có giá — bảng giá mới thay thế hoàn toàn bảng giá cũ.

#### Request Body

```json
{
  "items": [
    {
      "goldPurityId": "purity-uuid-0001",
      "buyPricePerChi": 1870000000,
      "sellPricePerChi": 1920000000,
      "buyPricePerGram": 0,
      "sellPricePerGram": 0
    },
    {
      "goldPurityId": "purity-uuid-0002",
      "buyPricePerChi": 0,
      "sellPricePerChi": 0,
      "buyPricePerGram": 82000,
      "sellPricePerGram": 87000
    }
  ]
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `items` | `PriceItemDto[]` | Có | Danh sách giá theo hàm lượng (không được rỗng) |
| `items[].goldPurityId` | `GUID` | Có | ID hàm lượng vàng/bạc |
| `items[].buyPricePerChi` | `decimal` | Không | Giá mua vàng (LAK/chỉ) — dùng khi `category = Gold` |
| `items[].sellPricePerChi` | `decimal` | Không | Giá bán vàng (LAK/chỉ) — dùng khi `category = Gold` |
| `items[].buyPricePerGram` | `decimal` | Không | Giá mua bạc (LAK/gram) — dùng khi `category = Silver` |
| `items[].sellPricePerGram` | `decimal` | Không | Giá bán bạc (LAK/gram) — dùng khi `category = Silver` |

> Backend tự xác định `Gold` hay `Silver` dựa vào `GoldPurity.Category` — client không cần truyền.

#### Response — 200 OK

Trả về bảng giá vừa tạo (cùng cấu trúc với `GET /prices`).

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `422` | `CONFIG_PRICE_ITEMS_EMPTY` | `items` rỗng |
| `404` | `CONFIG_GOLD_PURITY_NOT_FOUND` | Một `goldPurityId` không tồn tại |

---

## Endpoints — Tỷ giá ngoại tệ

### 4. Lấy tỷ giá hiện hành

```
GET /api/config/exchange-rates
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  {
    "id": "rate-uuid-xxxx",
    "currencyCode": "THB",
    "rateToLak": 820,
    "adjustment": 5,
    "effectiveFrom": "2026-06-10T07:00:00Z"
  },
  {
    "id": "rate-uuid-yyyy",
    "currencyCode": "USD",
    "rateToLak": 21500,
    "adjustment": 100,
    "effectiveFrom": "2026-06-10T07:00:00Z"
  }
]
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `currencyCode` | `string` | Mã tiền tệ: `THB`, `USD` |
| `rateToLak` | `decimal` | Tỷ giá cơ sở (1 đơn vị ngoại tệ = X LAK) |
| `adjustment` | `decimal` | Biên độ điều chỉnh |

---

### 5. Cập nhật tỷ giá

```
POST /api/config/exchange-rates
```

**Quyền**: `CONFIG_PRICE`

> Tạo bản ghi mới với `effectiveFrom = now` — lưu lịch sử đầy đủ.

#### Request Body

```json
{
  "currencyCode": "THB",
  "rateToLak": 825,
  "adjustment": 5
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `currencyCode` | `string` | Có | Mã tiền tệ: `THB`, `USD` |
| `rateToLak` | `decimal` | Có | Tỷ giá cơ sở mới |
| `adjustment` | `decimal` | Có | Biên độ điều chỉnh |

#### Response — 200 OK

Trả về bản ghi tỷ giá vừa tạo.

---

## Endpoints — Bảng giá đá (Stone Price Rules)

### 6. Danh sách quy tắc giá đá

```
GET /api/config/stone-price-rules
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  { "id": "rule-uuid-0001", "tuSoChi": 0.0, "denSoChi": 1.0, "giaDa": 500000 },
  { "id": "rule-uuid-0002", "tuSoChi": 1.0, "denSoChi": 3.0, "giaDa": 1200000 }
]
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `tuSoChi` | `decimal` | Từ trọng lượng (chỉ) — inclusive |
| `denSoChi` | `decimal` | Đến trọng lượng (chỉ) — exclusive |
| `giaDa` | `decimal` | Giá đá áp dụng (LAK) trong khoảng này |

---

### 7. Tạo quy tắc giá đá

```
POST /api/config/stone-price-rules
```

**Quyền**: `CONFIG_STONE_PRICE`

#### Request Body

```json
{ "tuSoChi": 3.0, "denSoChi": 5.0, "giaDa": 2500000 }
```

#### Response — 200 OK

Trả về StonePriceRule vừa tạo.

---

### 8. Cập nhật quy tắc giá đá

```
PUT /api/config/stone-price-rules/{id}
```

**Quyền**: `CONFIG_STONE_PRICE`

#### Request Body

```json
{ "tuSoChi": 3.0, "denSoChi": 6.0, "giaDa": 3000000 }
```

#### Response — 200 OK

Trả về StonePriceRule đã cập nhật.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_STONE_RULE_NOT_FOUND` | Không tìm thấy quy tắc |

---

### 9. Xóa quy tắc giá đá

```
DELETE /api/config/stone-price-rules/{id}
```

**Quyền**: `CONFIG_STONE_PRICE`

#### Response — 204 No Content

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_STONE_RULE_NOT_FOUND` | Không tìm thấy quy tắc |

---

## Endpoints — Đơn vị trọng lượng (Weight Units)

### 10. Danh sách đơn vị trọng lượng

```
GET /api/config/weight-units
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  { "id": "...", "tenDonVi": "Chỉ",   "maTocDoc": "chi",   "gramPerUnit": 3.75,  "isSystem": true },
  { "id": "...", "tenDonVi": "Lượng", "maTocDoc": "luong", "gramPerUnit": 37.5,  "isSystem": true },
  { "id": "...", "tenDonVi": "Cây",   "maTocDoc": "cay",   "gramPerUnit": 375.0, "isSystem": true }
]
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `maTocDoc` | `string` | Mã tốc độ đọc: `chi`, `luong`, `cay` (hoặc tự định nghĩa) |
| `gramPerUnit` | `decimal` | Gram trên một đơn vị |
| `isSystem` | `bool` | `true` = đơn vị hệ thống, không được xóa |

---

### 11. Tạo đơn vị trọng lượng mới

```
POST /api/config/weight-units
```

**Quyền**: `CONFIG_WEIGHT_UNIT`

#### Request Body

```json
{
  "tenDonVi": "Tael",
  "maTocDoc": "tael",
  "gramPerUnit": 37.799
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `tenDonVi` | `string` | Có | Tên hiển thị |
| `maTocDoc` | `string` | Có | Mã tốc độ đọc — duy nhất, lowercase |
| `gramPerUnit` | `decimal` | Có | Gram tương đương |

#### Response — 200 OK

Trả về WeightUnit vừa tạo.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `422` | `CONFIG_WEIGHT_UNIT_CODE_DUPLICATE` | `maTocDoc` đã tồn tại |

---

### 12. Cập nhật đơn vị trọng lượng

```
PUT /api/config/weight-units/{id}
```

**Quyền**: `CONFIG_WEIGHT_UNIT`

> Cập nhật theo `id` (GUID), không dùng `maTocDoc` như phiên bản cũ.

#### Request Body

```json
{
  "tenDonVi": "Chỉ (cập nhật)",
  "gramPerUnit": 3.75
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `tenDonVi` | `string` | Có | Tên hiển thị mới |
| `gramPerUnit` | `decimal` | Có | Gram mới |

#### Response — 200 OK

Trả về WeightUnit đã cập nhật.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_WEIGHT_UNIT_NOT_FOUND` | Không tìm thấy đơn vị |

---

### 13. Xóa đơn vị trọng lượng

```
DELETE /api/config/weight-units/{id}
```

**Quyền**: `CONFIG_WEIGHT_UNIT`

#### Response — 204 No Content

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_WEIGHT_UNIT_NOT_FOUND` | Không tìm thấy đơn vị |
| `422` | `CONFIG_WEIGHT_UNIT_SYSTEM_PROTECTED` | Đơn vị hệ thống (`isSystem = true`), không được xóa |

---

## Endpoints — Hàm lượng vàng / bạc (Gold Purities)

### 14. Danh sách hàm lượng

```
GET /api/config/gold-purities
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  { "id": "...", "ma": "9999", "hamLuong": 99.99, "category": "Gold"   },
  { "id": "...", "ma": "24K",  "hamLuong": 99.0,  "category": "Gold"   },
  { "id": "...", "ma": "18K",  "hamLuong": 75.0,  "category": "Gold"   },
  { "id": "...", "ma": "925",  "hamLuong": 92.5,  "category": "Silver" }
]
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `ma` | `string` | Mã hàm lượng (ví dụ: `9999`, `24K`, `925`) |
| `hamLuong` | `decimal` | Phần trăm vàng/bạc nguyên chất |
| `category` | `string` | `Gold` hoặc `Silver` — quyết định cách tính giá trong bảng giá |

---

### 15. Tạo hàm lượng

```
POST /api/config/gold-purities
```

**Quyền**: `CONFIG_GOLD_PURITY`

#### Request Body

```json
{
  "ma": "14K",
  "hamLuong": 58.5,
  "category": "Gold"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `ma` | `string` | Có | Mã hàm lượng — duy nhất |
| `hamLuong` | `decimal` | Có | Phần trăm nguyên chất |
| `category` | `string` | Không | `Gold` (mặc định) hoặc `Silver` |

#### Response — 200 OK

Trả về GoldPurity vừa tạo.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `422` | `CONFIG_GOLD_PURITY_CODE_DUPLICATE` | `ma` đã tồn tại |

---

### 16. Cập nhật hàm lượng

```
PUT /api/config/gold-purities/{id}
```

**Quyền**: `CONFIG_GOLD_PURITY`

#### Request Body

```json
{
  "ma": "14K",
  "hamLuong": 58.3,
  "category": "Gold"
}
```

#### Response — 200 OK

Trả về GoldPurity đã cập nhật.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_GOLD_PURITY_NOT_FOUND` | Không tìm thấy hàm lượng |
| `422` | `CONFIG_GOLD_PURITY_CODE_DUPLICATE` | `ma` đã được dùng bởi hàm lượng khác |

---

### 17. Xóa hàm lượng

```
DELETE /api/config/gold-purities/{id}
```

**Quyền**: `CONFIG_GOLD_PURITY`

#### Response — 204 No Content

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_GOLD_PURITY_NOT_FOUND` | Không tìm thấy hàm lượng |

---

## Endpoints — Roles & Permissions

### 18. Danh sách roles

```
GET /api/config/roles
```

**Quyền**: `USER_MANAGE`

#### Response — 200 OK

```json
[
  {
    "id": "role-uuid-xxxx",
    "code": "Manager",
    "name": "Quản lý / Chủ cửa hàng",
    "description": "...",
    "isSystem": true,
    "permissions": [
      { "id": "...", "code": "TRANSACTION_APPROVE", "name": "Duyệt giao dịch", "group": "Giao dịch" }
    ]
  }
]
```

---

### 19. Danh sách tất cả permissions

```
GET /api/config/permissions
```

**Quyền**: `USER_MANAGE`

#### Response — 200 OK

```json
[
  { "id": "...", "code": "TRANSACTION_CREATE",  "name": "Tạo giao dịch",      "group": "Giao dịch"  },
  { "id": "...", "code": "TRANSACTION_APPROVE", "name": "Duyệt giao dịch",    "group": "Giao dịch"  },
  { "id": "...", "code": "USER_MANAGE",         "name": "Quản lý người dùng", "group": "Người dùng" }
]
```

---

### 20. Cập nhật permissions của role

```
PUT /api/config/roles/{roleId}/permissions
```

**Quyền**: `USER_MANAGE`

#### Request Body

```json
{
  "permissionIds": [
    "perm-uuid-0001",
    "perm-uuid-0002"
  ]
}
```

> Danh sách này **thay thế hoàn toàn** các permission hiện tại của role.

#### Response — 204 No Content

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `RESOURCE_NOT_FOUND` | Role không tồn tại |

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| `GET` | `/api/config/prices` | Bảng giá hiện hành (đa hàm lượng) | `[Authorize]` |
| `GET` | `/api/config/prices/history` | Lịch sử bảng giá | `[Authorize]` |
| `POST` | `/api/config/prices` | Cập nhật bảng giá | `CONFIG_PRICE` |
| `GET` | `/api/config/exchange-rates` | Tỷ giá hiện hành | `[Authorize]` |
| `POST` | `/api/config/exchange-rates` | Cập nhật tỷ giá | `CONFIG_PRICE` |
| `GET` | `/api/config/stone-price-rules` | Danh sách quy tắc giá đá | `[Authorize]` |
| `POST` | `/api/config/stone-price-rules` | Tạo quy tắc | `CONFIG_STONE_PRICE` |
| `PUT` | `/api/config/stone-price-rules/{id}` | Cập nhật quy tắc | `CONFIG_STONE_PRICE` |
| `DELETE` | `/api/config/stone-price-rules/{id}` | Xóa quy tắc | `CONFIG_STONE_PRICE` |
| `GET` | `/api/config/weight-units` | Danh sách đơn vị trọng lượng | `[Authorize]` |
| `POST` | `/api/config/weight-units` | Tạo đơn vị mới | `CONFIG_WEIGHT_UNIT` |
| `PUT` | `/api/config/weight-units/{id}` | Cập nhật đơn vị | `CONFIG_WEIGHT_UNIT` |
| `DELETE` | `/api/config/weight-units/{id}` | Xóa đơn vị | `CONFIG_WEIGHT_UNIT` |
| `GET` | `/api/config/gold-purities` | Danh sách hàm lượng vàng/bạc | `[Authorize]` |
| `POST` | `/api/config/gold-purities` | Tạo hàm lượng | `CONFIG_GOLD_PURITY` |
| `PUT` | `/api/config/gold-purities/{id}` | Cập nhật hàm lượng | `CONFIG_GOLD_PURITY` |
| `DELETE` | `/api/config/gold-purities/{id}` | Xóa hàm lượng | `CONFIG_GOLD_PURITY` |
| `GET` | `/api/config/roles` | Danh sách roles + permissions | `USER_MANAGE` |
| `GET` | `/api/config/permissions` | Tất cả permissions | `USER_MANAGE` |
| `PUT` | `/api/config/roles/{roleId}/permissions` | Gán permissions cho role | `USER_MANAGE` |

---

## Ghi chú nghiệp vụ

- **Bảng giá đa hàm lượng**: mỗi lần `POST /prices` tạo một snapshot hoàn chỉnh gồm tất cả hàm lượng. Backend dùng `GoldPurity.Category` để phân biệt cách tính (`perChi` cho vàng, `perGram` cho bạc) — client không cần truyền `category` vào `items`.
- **Lịch sử giá bất biến**: `POST /prices` và `POST /exchange-rates` luôn tạo bản ghi mới — không bao giờ ghi đè. Dùng `GET /prices/history` để tra cứu lịch sử.
- **`isSystem = true`** (WeightUnit và AppRole): không được xóa qua API. Chỉ cho phép cập nhật tên/hệ số.
- **`PricingCalculator`**: load `gramPerUnit` của đơn vị `chi` từ DB khi khởi tạo — cập nhật `PUT /weight-units/{id}` có hiệu lực ở request tiếp theo.
