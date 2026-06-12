# API Reference — Khamphuvong POS

> Base URL: `https://<host>/api`  
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`  
> Content-Type: `application/json`

---

## Mục lục

1. [Auth — Xác thực](#1-auth--xác-thực)
2. [Branches — Chi nhánh](#2-branches--chi-nhánh)
3. [Users — Quản lý người dùng](#3-users--quản-lý-người-dùng)
4. [Customers — Khách hàng](#4-customers--khách-hàng)
5. [Products — Sản phẩm & Danh mục](#5-products--sản-phẩm--danh-mục)
6. [Config — Cấu hình & Giá](#6-config--cấu-hình--giá)
7. [Inventory — Kho hàng](#7-inventory--kho-hàng)
8. [Transactions — Giao dịch bán hàng (POS)](#8-transactions--giao-dịch-bán-hàng-pos)
9. [Trade — Mua vào / Đổi hàng](#9-trade--mua-vào--đổi-hàng)
10. [Cash Ledger — Quỹ & Dòng tiền](#10-cash-ledger--quỹ--dòng-tiền)
11. [Reports — Báo cáo](#11-reports--báo-cáo)
12. [Mã lỗi chung](#12-mã-lỗi-chung)

---

## Sơ đồ kiến trúc & luồng hoạt động

### A. Kiến trúc 3 lớp — Đơn vị → Sản phẩm → Giao dịch

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LỚP 1 — Danh mục đơn vị trọng lượng (weight_units)                    │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  WeightUnit                                                  │      │
│   │  ─────────────────────────────────────────────────────────── │      │
│   │  maTocDoc : "chi" | "luong" | "cay" | "bath" | ...          │      │
│   │  tenDonVi : "Chỉ" | "Lượng" | "Cây" | "Bath"               │      │
│   │  gramPerUnit : 3.75 | 37.5 | 375.0 | 15.0                   │      │
│   │  isSystem  : true (không thể xóa)                            │      │
│   └──────────────────────────────────────────────────────────────┘      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ FK (tùy chọn, đơn vị mặc định)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LỚP 2 — Sản phẩm (products)                                           │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  Product                                                     │      │
│   │  ─────────────────────────────────────────────────────────── │      │
│   │  productCode / productName / purity                          │      │
│   │  weightGram   : trọng lượng mỗi đơn vị sản phẩm (grams)     │      │
│   │  weightUnitId : FK → WeightUnit (đơn vị tham chiếu)          │      │
│   │  productType  : NguyenKhoi | CanThucTe                       │      │
│   │    NguyenKhoi → trọng lượng cố định, tính tự động            │      │
│   │    CanThucTe  → cân thực tế, nhập tay tại quầy               │      │
│   └──────────────────────────────────────────────────────────────┘      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ FK + snapshot tên đơn vị
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LỚP 3 — Dòng giao dịch (transaction_items)                            │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  TransactionItem                                             │      │
│   │  ─────────────────────────────────────────────────────────── │      │
│   │  quantity       : số lượng nhập                              │      │
│   │  weightUnitId   : FK → WeightUnit (đơn vị tại thời điểm GD) │      │
│   │  weightUnitName : snapshot tên đơn vị ("Chỉ", "Bath", ...)  │      │
│   │  weightGram     : tổng gram = qty × unit.gramPerUnit         │      │
│   │                   (hoặc = weightGramOverride khi CanThucTe)  │      │
│   │  unitPriceLak   : giá snapshot (LAK/gram)                    │      │
│   │  lineTotal      : weightGram × unitPriceLak                  │      │
│   └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### B. Luồng tính trọng lượng tại POS (POST /api/transactions)

```
Cashier chọn sản phẩm & nhập số lượng
              │
              ▼
   ┌──────────────────────────────┐
   │  Chọn đơn vị tính            │
   │  (Chỉ / Bath / Lượng / ...)  │
   └──────────────┬───────────────┘
                  │ WeightUnitId
                  ▼
   ┌──────────────────────────────┐     ┌──────────────────────────────────┐
   │  productType == NguyenKhoi?  │ Yes │  Backend:                        │
   │  (trọng lượng cố định)       │────►│  weightGram = qty × unit.gram    │
   └──────────────┬───────────────┘     └──────────────────────────────────┘
                  │ No (CanThucTe)
                  ▼
   ┌──────────────────────────────┐     ┌──────────────────────────────────┐
   │  Cashier cân thực tế         │     │  Backend:                        │
   │  nhập weightGramOverride     │────►│  weightGram = weightGramOverride  │
   └──────────────────────────────┘     └──────────────────────────────────┘
                                                        │
                                                        ▼
                                        ┌──────────────────────────────────┐
                                        │  lineTotal = weightGram          │
                                        │           × unitPriceLakPerGram  │
                                        │  snapshot: weightUnitName lưu DB │
                                        └──────────────────────────────────┘
```

---

### C. State Machine — Giao dịch POS

```
                    ┌──────────┐
          Tạo đơn   │          │
         ─────────► │ PENDING  │
                    │          │
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            │ Duyệt      │            │ Từ chối
            │ (Manager)  │            │ (Manager)
            ▼            │            ▼
       ┌──────────┐      │      ┌──────────┐
       │ APPROVED │      │      │ REJECTED │ (kết thúc)
       └────┬─────┘      │      └──────────┘
            │            │
            │ Thanh toán │
            │ (Cashier)  │
            ▼            │
       ┌──────────┐      │
       │COMPLETED │      │
       └──────────┘      │
       (không sửa/xóa)   │
                         │ (Trạng thái DRAFT dự phòng)
                         ▼
                    ┌──────────┐
                    │  DRAFT   │
                    └──────────┘
```

---

### D. Luồng đổi hàng Trade (POST /api/trade)

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                    Khách mang hàng vào đổi                       │
 └──────────────────────────────┬───────────────────────────────────┘
                                │
               ┌────────────────┼────────────────────┐
               │ DoiHang/       │ DoiMienPhi           │ DoiThanhTien
               │ MuaThem        │ (≤ 1 tháng)          │
               ▼                ▼                      ▼
        ┌────────────┐  ┌────────────┐         ┌────────────┐
        │ Tính hao   │  │ Kiểm ngày  │         │ Tính giá   │
        │ hụt (gram) │  │ mua ≤ 31d? │         │ trị cũ     │
        └─────┬──────┘  └─────┬──────┘         └─────┬──────┘
              │               │ Quá hạn ──► 422       │
              ▼               ▼                       ▼
        ┌────────────┐  ┌────────────┐         ┌────────────┐
        │ Tính chênh │  │ Kiểm giá   │         │ Tính tiền  │
        │ lệch giá   │  │ trị ≤ 1%?  │         │ khách nhận │
        └─────┬──────┘  └─────┬──────┘         └─────┬──────┘
              │               │ Sai ──► 422           │
              ▼               ▼                       ▼
        ┌─────────────────────────────────────────────────┐
        │  Ghi TradeTxn                                   │
        │  itemCu → ChuyenXuong  │  itemMoi → DaBan       │
        └─────────────────────────────────────────────────┘
```

---

### E. Luồng quản lý đơn vị trọng lượng

```
GET /api/config/weight-units
 └─► Trả về danh sách Chỉ/Lượng/Cây/Bath + isSystem

POST /api/config/weight-units          ← Thêm đơn vị mới (VD: Troy Ounce)
PUT  /api/config/weight-units/{id}     ← Sửa tên + gramPerUnit
PUT  /api/config/weight-units/{code}   ← Sửa theo maTocDoc (VD: chi)
DELETE /api/config/weight-units/{id}
  │
  ├── isSystem == true  ──► 422 CONFIG_WEIGHT_UNIT_SYSTEM_PROTECTED
  └── isSystem == false ──► Xoá thành công
```

---

## Quy ước chung

### Cấu trúc response lỗi

```json
{ "status": 422, "errorCode": "PRODUCT_CODE_DUPLICATE" }

// Lỗi validation
{
  "status": 422,
  "errorCode": "VALIDATION_FAILED",
  "errors": {
    "phoneNumber": ["PHONE_FORMAT_INVALID"]
  }
}
```

### Phân quyền theo Role

| Role | Mô tả |
|---|---|
| `Cashier` | Lập đơn bán/mua/đổi, xem lịch sử GD của mình |
| `ThuQuy` | Mở/chốt quỹ, kiểm đếm tiền mặt, ghi thu–chi thủ công |
| `Manager` | Duyệt/từ chối GD, cấu hình giá, xem báo cáo & lãi lỗ, quản lý kho |
| `SystemAdmin` | Toàn quyền: quản lý tài khoản, phân quyền, cấu hình toàn hệ thống |

---

## 1. Auth — Xác thực

### `POST /api/auth/login`

Đăng nhập bằng mã nhân viên và mật khẩu.

**Không yêu cầu xác thực.**

**Request body:**

```json
{
  "username": "ADMIN001",
  "password": "Admin@123"
}
```

**Response `200 OK`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fullName": "Nguyễn Văn Admin",
  "role": "SystemAdmin",
  "permissions": ["transaction.create", "transaction.approve", "config.price"],
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai mã nhân viên hoặc mật khẩu |
| `AUTH_ACCOUNT_INACTIVE` | 403 | Tài khoản bị vô hiệu hoá |

---

### `POST /api/auth/refresh`

Lấy access token mới từ refresh token.

**Không yêu cầu xác thực.**

**Request body:**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response `200 OK`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "bmV3UmVmcmVzaFRva2Vu..."
}
```

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token không hợp lệ hoặc đã hết hạn |

---

### `POST /api/auth/logout`

Đăng xuất và vô hiệu hoá refresh token.

**Request body:** `{ "refreshToken": "..." }`

**Response `204 No Content`.**

---

### `GET /api/auth/me`

Lấy thông tin người dùng đang đăng nhập (từ JWT).

**Response `200 OK`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeCode": "ADMIN001",
  "fullName": "Nguyễn Văn Admin",
  "phone": "020-12345678",
  "role": "SystemAdmin",
  "permissions": ["transaction.create", "config.price", "user.manage"],
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "lastLoginAt": "2025-06-09T07:45:00Z"
}
```

---

## 2. Branches — Chi nhánh

### `GET /api/branches`

Lấy danh sách tất cả chi nhánh.

**Response `200 OK`:**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Hội sở Vientiane",
    "address": "123 Đường Lanexang, Vientiane",
    "phone": "021-123456",
    "isHeadquarters": true,
    "isActive": true
  }
]
```

---

### `POST /api/branches`

Tạo chi nhánh mới.

**Yêu cầu policy:** `BranchManage` (Manager, SystemAdmin).

**Request body:**

```json
{
  "name": "Chi nhánh Savannakhet",
  "address": "456 Đường Khanthabouly, Savannakhet",
  "phone": "041-654321",
  "isHeadquarters": false
}
```

**Response `201 Created`:** `{ "id": "...", "name": "..." }`

---

### `PUT /api/branches/{id}`

Cập nhật thông tin chi nhánh.

**Yêu cầu policy:** `BranchManage` (Manager, SystemAdmin).

**Request body:** `{ "name": "...", "address": "...", "phone": "..." }`

**Response `200 OK`:** Object chi nhánh đã cập nhật.

**Lỗi:** `BRANCH_NOT_FOUND` 404

---

### `GET /api/branches/{id}/counters`

Lấy danh sách quầy giao dịch (chỉ trả quầy đang hoạt động).

**Response `200 OK`:**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "counterName": "Quầy 01",
    "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "isActive": true
  }
]
```

---

### `POST /api/branches/{id}/counters`

Tạo quầy giao dịch mới trong chi nhánh.

**Yêu cầu policy:** `BranchManage` (Manager hoặc SystemAdmin).

**Request body:** `{ "counterName": "Quầy 03" }`

**Response `200 OK`:** Object counter vừa tạo (cấu trúc giống GET).

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `BRANCH_NOT_FOUND` | 404 | Chi nhánh không tồn tại hoặc đã vô hiệu hóa |

---

### `PUT /api/branches/{branchId}/counters/{counterId}`

Đổi tên quầy giao dịch.

**Request body:** `{ "counterName": "Quầy Vàng" }`

**Response `200 OK`:** Object counter đã cập nhật.

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `COUNTER_NOT_FOUND` | 404 | Quầy không tồn tại |

---

### `PATCH /api/branches/{branchId}/counters/{counterId}/deactivate`

Vô hiệu hóa quầy (soft delete).

**Response `204 No Content`**

---

## Phân trang

Các API danh sách lớn (`users`, `products`, `customers`, `inventory`, `transactions`, `trade`) dùng **chế độ kép**:

- **Không truyền `page`** → trả về **mảng** như cũ (tương thích ngược, dùng cho dropdown/chọn nhanh).
- **Có `page`** (≥1) → trả về `PagedResult`:

```json
{ "total": 137, "page": 2, "pageSize": 20, "data": [ /* … */ ] }
```

`pageSize` mặc định **20**. Tìm kiếm/lọc (`search`, `branchId`, …) áp dụng trước khi phân trang nên `total` là tổng **sau khi lọc**.

---

## 3. Users — Quản lý người dùng

> Tất cả endpoint yêu cầu policy `UserManage` (SystemAdmin).

### `GET /api/users`

**Query params:** `branchId` (GUID, lọc theo chi nhánh); `search` (từ khoá — tìm theo mã NV, username, họ tên, SĐT); `isActive` (bool, tùy chọn — bỏ trống = trả về **cả** user đang hoạt động lẫn đã vô hiệu hóa); `page`, `pageSize` (mặc định 20) — **có `page`** ⇒ trả `PagedResult`, **không có** ⇒ trả mảng (xem [Phân trang](#phân-trang)).

> Mặc định (không truyền `isActive`) trả về **tất cả** user; user đã vô hiệu hóa (`isActive=false`) vẫn hiển thị (xếp cuối) để có thể kích hoạt lại qua `PATCH /api/users/{id}/activate`.

**Response `200 OK`:**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "employeeCode": "NV001",
    "fullName": "Trần Văn Nhân Viên",
    "phone": "020-99998888",
    "email": "nv001@khamphuvong.la",
    "address": "Bản Phonxay, Vientiane",
    "dateOfBirth": "1995-03-20",
    "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "counterId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "counterName": "Quầy 1 — Bán vàng",
    "role": { "id": "...", "code": "Cashier", "name": "Nhân viên bán hàng" },
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "lastLoginAt": "2025-06-09T07:45:00Z"
  }
]
```

> `email`, `address`, `dateOfBirth`, `counterId`, `counterName` — trả về `null` nếu chưa được thiết lập. `GET /api/users/{id}` trả về cùng cấu trúc cho một người dùng.

---

### `POST /api/users`

Tạo tài khoản người dùng mới.

**Request body:**

```json
{
  "employeeCode": "NV002",
  "fullName": "Lê Thị Bán Hàng",
  "phone": "020-11112222",
  "password": "Cashier@123",
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "roleId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "ltbh@khamphuvong.la",
  "address": "123 Đường Setthathirath, Vientiane",
  "dateOfBirth": "1998-07-15",
  "counterId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

> `email`, `address`, `dateOfBirth`, `counterId` — tuỳ chọn. `counterId` là quầy phân công cho nhân viên; quầy phải đang hoạt động và thuộc đúng chi nhánh (`branchId`) của nhân viên.

**Response `201 Created`:** `{ "id": "...", "employeeCode": "NV002", "fullName": "..." }`

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `USER_EMPLOYEE_CODE_DUPLICATE` | 422 | Mã nhân viên đã tồn tại |
| `BRANCH_NOT_FOUND` | 404 | Chi nhánh không tồn tại |
| `ROLE_NOT_FOUND` | 404 | Role không tồn tại |
| `COUNTER_NOT_FOUND` | 404 | Quầy không tồn tại hoặc đã ngừng hoạt động |
| `COUNTER_BRANCH_MISMATCH` | 422 | Quầy không thuộc chi nhánh của nhân viên |

---

### `PUT /api/users/{id}`

Cập nhật thông tin người dùng.

**Request body:**

```json
{
  "fullName": "Tên mới",
  "phone": "020-33334444",
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "email@khamphuvong.la",
  "address": "456 Đường Lan Xang, Vientiane",
  "dateOfBirth": "1998-07-15"
}
```

**Response `204 No Content`.**

> Phân công quầy **không** thay đổi qua endpoint này — dùng `PATCH /api/users/{id}/counter`. Nếu `branchId` thay đổi, quầy đang phân công sẽ tự được gỡ (vì quầy thuộc chi nhánh cũ).

---

### `PATCH /api/users/{id}/counter`

Phân công (hoặc gỡ) quầy giao dịch cho nhân viên.

**Request body:** `{ "counterId": "3fa85f64-5717-4562-b3fc-2c963f66afa6" }` — truyền `null` để gỡ phân công.

**Response `204 No Content`.**

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `USER_NOT_FOUND` | 404 | Người dùng không tồn tại |
| `COUNTER_NOT_FOUND` | 404 | Quầy không tồn tại hoặc đã ngừng hoạt động |
| `COUNTER_BRANCH_MISMATCH` | 422 | Quầy không thuộc chi nhánh của nhân viên |

---

### `PATCH /api/users/{id}/role`

Thay đổi role. **Request body:** `{ "roleId": "..." }`  **Response `204 No Content`.**

### `PATCH /api/users/{id}/activate` / `PATCH /api/users/{id}/deactivate`

Kích hoạt / vô hiệu hoá tài khoản. **Response `204 No Content`.**

### `POST /api/users/{id}/reset-password`

Đặt lại mật khẩu. **Request body:** `{ "newPassword": "NewPass@456" }` **Response `204 No Content`.**

---

## 4. Customers — Khách hàng

### `GET /api/customers`

Tìm kiếm khách hàng theo tên hoặc số điện thoại.

**Query params:** `search` (từ khoá — tìm theo tên/SĐT; `q` là alias cũ), `limit` (mặc định 10); `page`, `pageSize` (mặc định 20) — **có `page`** ⇒ trả `PagedResult` (màn quản lý KH), **không có** ⇒ trả mảng gọn theo `limit` (chọn nhanh khi lập đơn).

> Khi truyền `limit`: trả `array` phẳng.  
> Khi không truyền `limit`: trả object phân trang `{ total, page, pageSize, data }`.

**Response `200 OK` (phân trang):**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Somchai Phommavong",
    "phoneNumber": "020-55551234",
    "email": "somchai@example.com",
    "loyaltyTier": "silver",
    "accumulatedPoints": 1500,
    "isActive": true,
    "createdAt": "2025-01-15T08:30:00Z"
  }
]
```

---

### `GET /api/customers/{id}`

Lấy chi tiết khách hàng (kèm `totalCompletedInvoices`).

**Response `200 OK`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Somchai Phommavong",
  "phoneNumber": "020-55551234",
  "email": "somchai@example.com",
  "address": "Bản Nongbone, Vientiane",
  "dateOfBirth": "1985-11-03",
  "loyaltyTier": "silver",
  "accumulatedPoints": 1500,
  "isActive": true,
  "createdAt": "2025-01-15T08:30:00Z",
  "totalCompletedInvoices": 12
}
```

---

### `POST /api/customers`

Tạo khách hàng mới.

**Request body:**

```json
{
  "name": "Somchai Phommavong",
  "phoneNumber": "020-55551234",
  "loyaltyTier": "silver",
  "email": "somchai@example.com",
  "address": "Bản Nongbone, Vientiane",
  "dateOfBirth": "1985-11-03"
}
```

> `loyaltyTier`: `silver` | `gold` | `platinum` (mặc định `silver`).  
> `phoneNumber`, `email`, `address`, `dateOfBirth` — tuỳ chọn.

**Lỗi:** `CUSTOMER_PHONE_DUPLICATE` 422

---

### `PUT /api/customers/{id}`

Cập nhật thông tin khách hàng. (Request body tương tự POST, hỗ trợ `null` để xoá.)

---

## 5. Products — Sản phẩm & Danh mục

> **Quan trọng:** Từ phiên bản hiện tại, trọng lượng sản phẩm được lưu bằng **gram** (`weightGram`).  
> Mỗi sản phẩm có thể gắn đơn vị tham chiếu (`weightUnitId`) và loại cân (`productType`).

### `GET /api/products/categories`

Lấy danh sách danh mục (sắp xếp theo `sortOrder`).

**Response `200 OK`:** `[{ "id": "...", "code": "VANG_24K", "name": "Vàng 24K" }]`

---

### `POST /api/products/categories`

**Yêu cầu policy:** `ProductManage`. **Request body:** `{ "code": "BAC_925", "name": "Bạc 925", "sortOrder": 10 }`

**Lỗi:** `PRODUCT_CATEGORY_CODE_DUPLICATE` 422

---

### `PUT /api/products/categories/{id}` / `DELETE /api/products/categories/{id}`

Cập nhật tên & thứ tự | Xoá danh mục (chỉ khi không còn sản phẩm).

**Lỗi DELETE:** `PRODUCT_CATEGORY_HAS_PRODUCTS` 422

---

### `GET /api/products`

Lấy danh sách sản phẩm đang hoạt động.

**Query params:** `categoryCode` (string, lọc danh mục); `search` (từ khoá — tìm theo mã/tên sản phẩm); `page`, `pageSize` (mặc định 20) — **có `page`** ⇒ trả `PagedResult`, **không có** ⇒ trả mảng. `GET /api/products/categories` cũng nhận `search` (không phân trang — dữ liệu nhỏ).

**Response `200 OK`:**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "productCode": "V24K-NHAN-001",
    "productName": "Nhẫn Vàng 24K Trơn",
    "category": { "id": "...", "code": "VANG_24K", "name": "Vàng 24K" },
    "purity": "24K",
    "weightGram": 3.75,
    "weightUnitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "productType": "NguyenKhoi"
  }
]
```

> `weightGram`: Trọng lượng mỗi đơn vị tính bằng **gram** (ví dụ: 1 Chỉ = 3.75g).  
> `weightUnitId`: Đơn vị trọng lượng tham chiếu mặc định (tùy chọn).  
> `productType`: `NguyenKhoi` (cố định) | `CanThucTe` (cân thực tế).

---

### `GET /api/products/{id}`

Lấy chi tiết sản phẩm (kèm `isActive`).

---

### `POST /api/products`

**Yêu cầu policy:** `ProductManage`.

**Request body:**

```json
{
  "productCode": "V9999-NHAN-002",
  "productName": "Nhẫn Vàng 9999 Hoa Mai",
  "productCategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "goldPurityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "weightGram": 3.75,
  "weightUnitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "productType": "NguyenKhoi"
}
```

> `goldPurityId`: **FK → hàm lượng** (`GET /api/config/gold-purities`). **Null** cho hàng không có hàm lượng (Đá, Ngoại tệ).  
> `weightUnitId`: **FK → đơn vị** (`GET /api/config/weight-units`). Vàng/Bạc **cần** đặt để hệ thống tự tra giá khi bán (khớp dòng bảng giá theo `goldPurityId` + `weightUnitId`).  
> `weightGram`: Trọng lượng **mỗi món** tính bằng **gram** (khác `weightGram` tổng-cả-lô ở [§7 Inventory](#7-inventory--kho-hàng)).  
> `productType`: `NguyenKhoi` (mặc định) | `CanThucTe`.

> **⚙️ Lưu ý tích hợp Kho & phí (backend xác nhận) — ranh giới hiện tại:**
> - **Tạo sản phẩm chỉ tạo master data, KHÔNG sinh tồn kho.** Hiện **chưa có endpoint khai báo tồn kho ban đầu**. `InventoryItem` chỉ phát sinh qua **giao dịch nhập kho** (chiều `IN`: `BuyGold` / `BuyMoreGold` / item-vào khi thu đổi — xem [§8](#8-transactions--giao-dịch-bán-hàng-pos)) hoặc qua dữ liệu **seed**. `POST /api/inventory/{id}/adjust` **yêu cầu mục kho đã tồn tại**.
> - **Tiền công** và **tiền đá KHÔNG phải field của sản phẩm** — nhập tại thời điểm bán (`TransactionItem.laborFee` / `stoneFee`). Nếu form khai báo SP có 2 ô này thì chỉ để **preview/gợi ý**, **chưa được lưu**.
> - **ĐVT** (`weightUnitId`) **CÓ** được lưu trên sản phẩm — không nằm trong nhóm "chưa lưu".
> - Muốn lưu đủ (tồn kho ban đầu, tiền công/đá mặc định theo SP) cần **backend bổ sung** endpoint/field tương ứng.

**Response `201 Created`:** `{ "id": "...", "productCode": "..." }`

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `PRODUCT_CODE_DUPLICATE` | 422 | Mã sản phẩm đã tồn tại |
| `PRODUCT_CATEGORY_NOT_FOUND` | 404 | Danh mục không tồn tại |
| `CONFIG_GOLD_PURITY_NOT_FOUND` | 404 | Hàm lượng không tồn tại |
| `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị không tồn tại |

---

### `PUT /api/products/{id}`

**Request body:**

```json
{
  "productName": "Nhẫn Vàng 24K Hoa Mai (Cập nhật)",
  "productCategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "purity": "22K",
  "weightGram": 5.5,
  "weightUnitId": null,
  "productType": "NguyenKhoi"
}
```

**Response `200 OK`:** Object sản phẩm đã cập nhật.

---

### `DELETE /api/products/{id}`

Vô hiệu hoá sản phẩm (soft delete). **Response `204 No Content`.**

---

## 6. Config — Cấu hình & Giá

### `GET /api/config/prices`

Lấy bảng giá hiện tại — danh sách dòng giá theo **từng (hàm lượng × đơn vị)**.

**Response `200 OK`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "effectiveFrom": "2026-06-10T07:00:00Z",
  "updatedBy": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "updatedAt": "2026-06-10T07:00:00Z",
  "items": [
    {
      "goldPurityId": "...", "purityCode": "9999", "hamLuong": 99.99, "category": "Gold",
      "weightUnitId": "...", "weightUnitCode": "chi", "gramPerUnit": 3.75,
      "buyPrice": 5000000, "sellPrice": 5700000
    },
    {
      "goldPurityId": "...", "purityCode": "925", "hamLuong": 92.5, "category": "Silver",
      "weightUnitId": "...", "weightUnitCode": "gram", "gramPerUnit": 1,
      "buyPrice": 20000, "sellPrice": 23000
    }
  ]
}
```

**Lỗi:** `CONFIG_PRICE_NOT_FOUND` 404

---

### `POST /api/config/prices`

Cập nhật bảng giá (mỗi lần tạo bản ghi mới — không ghi đè). Mỗi item là **một hàm lượng × một đơn vị**.

**Yêu cầu policy:** `ConfigPrice` (Manager, SystemAdmin).

**Request body:**

```json
{
  "items": [
    { "goldPurityId": "...", "weightUnitId": "<chi>",  "buyPrice": 5000000, "sellPrice": 5700000 },
    { "goldPurityId": "...", "weightUnitId": "<bath>", "buyPrice": 3625000, "sellPrice": 3670000 },
    { "goldPurityId": "...", "weightUnitId": "<gram>", "buyPrice": 20000,   "sellPrice": 23000 }
  ]
}
```

> `buyPrice`/`sellPrice` là giá **mỗi đơn vị** (`weightUnitId`). Đơn vị tự do: Chỉ/Lượng/Cây/Bath/Gram — tiệm dùng đơn vị nào thì thêm dòng đó. Đơn vị: **LAK**.

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `CONFIG_GOLD_PURITY_NOT_FOUND` | 404 | Hàm lượng không tồn tại |
| `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị không tồn tại |

**Response `200 OK`:** Bản ghi giá vừa tạo.

---

### `GET /api/config/prices/history`

Lấy lịch sử bảng giá.

**Query params:** `limit` (mặc định 20).

**Response `200 OK`:** Mảng các bản ghi giá sắp xếp mới nhất trước.

---

### `GET /api/config/exchange-rates`

Lấy tỷ giá ngoại tệ hiện tại.

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "currencyCode": "THB",
    "rateToLak": 1150,
    "adjustment": 5,
    "effectiveFrom": "2025-06-09T07:00:00Z"
  }
]
```

---

### `POST /api/config/exchange-rates`

Cập nhật tỷ giá.

**Request body:** `{ "currencyCode": "THB", "rateToLak": 1155, "adjustment": 5 }`

> `adjustment`: Biên lợi nhuận cộng thêm vào tỷ giá cơ bản.

---

### `GET /api/config/weight-units`

Lấy danh sách đơn vị trọng lượng và hệ số quy đổi.

**Response `200 OK`:**

```json
[
  { "id": "...", "maTocDoc": "chi",   "tenDonVi": "Chỉ",   "gramPerUnit": 3.75,  "isSystem": true  },
  { "id": "...", "maTocDoc": "luong", "tenDonVi": "Lượng",  "gramPerUnit": 37.5,  "isSystem": true  },
  { "id": "...", "maTocDoc": "cay",   "tenDonVi": "Cây",    "gramPerUnit": 375.0, "isSystem": true  },
  { "id": "...", "maTocDoc": "bath",  "tenDonVi": "Bath",   "gramPerUnit": 15.0,  "isSystem": true  }
]
```

> `gramPerUnit`: Hệ số quy đổi — số gram tương ứng với 1 đơn vị.  
> `isSystem`: Đơn vị hệ thống (`true`) không thể xoá qua API.

---

### `POST /api/config/weight-units`

Thêm đơn vị trọng lượng mới (ví dụ: Troy Ounce).

**Yêu cầu policy:** `ConfigWeightUnit` (SystemAdmin).

**Request body:**

```json
{
  "tenDonVi": "Troy Ounce",
  "maTocDoc": "oz",
  "gramPerUnit": 31.1035
}
```

**Response `200 OK`:** Object đơn vị vừa tạo (kèm `isSystem: false`).

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `CONFIG_WEIGHT_UNIT_CODE_DUPLICATE` | 422 | Mã đơn vị (`maTocDoc`) đã tồn tại |

---

### `PUT /api/config/weight-units/{id}`

Cập nhật tên và hệ số quy đổi theo ID.

**Yêu cầu policy:** `ConfigWeightUnit` (SystemAdmin).

**Request body:** `{ "tenDonVi": "Chỉ", "gramPerUnit": 3.76 }`

**Response `200 OK`:** Object đơn vị đã cập nhật.

**Lỗi:** `CONFIG_WEIGHT_UNIT_NOT_FOUND` 404

---

### `PUT /api/config/weight-units/{maTocDoc}`

Cập nhật theo mã đơn vị (ví dụ: `chi`, `bath`).

**Request body:** `{ "gramPerUnit": 3.76 }`

**Lỗi:** `CONFIG_WEIGHT_UNIT_NOT_FOUND` 404

---

### `DELETE /api/config/weight-units/{id}`

Xoá đơn vị trọng lượng.

**Yêu cầu policy:** `ConfigWeightUnit` (SystemAdmin).

**Response `204 No Content`.**

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị không tồn tại |
| `CONFIG_WEIGHT_UNIT_SYSTEM_PROTECTED` | 422 | Đơn vị hệ thống, không thể xoá |

---

### `GET /api/config/stone-price-rules`

Lấy danh sách quy tắc tính giá đá (sắp xếp theo `tuSoChi` tăng dần).

**Response `200 OK`:**

```json
[
  { "id": "...", "tuSoChi": 0.5, "denSoChi": 1.0, "giaDa": 200000 },
  { "id": "...", "tuSoChi": 1.0, "denSoChi": 2.0, "giaDa": 350000 }
]
```

---

### `POST /api/config/stone-price-rules`

Tạo quy tắc giá đá mới.

**Yêu cầu policy:** `ConfigStonePrice` (Manager, SystemAdmin).

**Request body:** `{ "tuSoChi": 2.0, "denSoChi": 5.0, "giaDa": 600000 }`

> Ngưỡng trọng lượng tính bằng **chỉ**. `giaDa` là phí đá (LAK).

---

### `PUT /api/config/stone-price-rules/{id}`

Cập nhật quy tắc giá đá.

**Request body:** `{ "tuSoChi": 2.0, "denSoChi": 5.0, "giaDa": 700000 }`

**Lỗi:** `CONFIG_STONE_RULE_NOT_FOUND` 404

---

### `DELETE /api/config/stone-price-rules/{id}`

Xoá quy tắc giá đá. **Response `204 No Content`.**

**Lỗi:** `CONFIG_STONE_RULE_NOT_FOUND` 404

---

### `GET /api/config/gold-purities`

Lấy danh sách độ tinh khiết vàng.

**Response `200 OK`:**

```json
[
  { "id": "...", "ma": "9999", "hamLuong": 99.99 },
  { "id": "...", "ma": "24K",  "hamLuong": 99.9  },
  { "id": "...", "ma": "18K",  "hamLuong": 75.0  }
]
```

---

### `POST /api/config/gold-purities`

Tạo độ tinh khiết vàng mới.

**Request body:** `{ "ma": "22K", "hamLuong": 91.7 }`

**Lỗi:** `CONFIG_GOLD_PURITY_CODE_DUPLICATE` 422

---

### `PUT /api/config/gold-purities/{id}`

Cập nhật độ tinh khiết vàng.

**Request body:** `{ "ma": "22K", "hamLuong": 91.7 }`

**Lỗi:** `CONFIG_GOLD_PURITY_NOT_FOUND` 404

---

### `DELETE /api/config/gold-purities/{id}`

Xoá độ tinh khiết vàng. **Response `204 No Content`.**

**Lỗi:** `CONFIG_GOLD_PURITY_NOT_FOUND` 404

---

### `GET /api/config/roles` / `GET /api/config/permissions`

Lấy danh sách role và permission (yêu cầu policy `UserManage`).

### `PUT /api/config/roles/{roleId}/permissions`

Cập nhật permission cho role (ghi đè toàn bộ).

**Request body:** `{ "permissionIds": ["...", "..."] }`

---

### `POST /api/config/roles`

Tạo role tùy biến mới (luôn có `isSystem = false`). Yêu cầu policy `UserManage`.

**Request body:** `{ "code": "Auditor", "name": "Kiểm toán", "description": "Chỉ xem báo cáo" }`

**Response `200 OK`:** `{ "id": "...", "code": "Auditor", "name": "Kiểm toán", "description": "...", "isSystem": false }`

> `code`, `name` được trim; mã trùng (không phân biệt hoa/thường) → `ROLE_CODE_DUPLICATE`.

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `ROLE_CODE_REQUIRED` | 422 | Thiếu mã role |
| `ROLE_NAME_REQUIRED` | 422 | Thiếu tên role |
| `ROLE_CODE_DUPLICATE` | 422 | Mã role đã tồn tại |

---

### `PUT /api/config/roles/{roleId}`

Cập nhật tên / mô tả role. Không sửa được role hệ thống.

**Request body:** `{ "name": "Tên mới", "description": "Mô tả mới" }`

**Response `200 OK`** (cấu trúc như POST).

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `ROLE_NOT_FOUND` | 404 | Role không tồn tại |
| `ROLE_SYSTEM_PROTECTED` | 422 | Không sửa được role hệ thống |

---

### `DELETE /api/config/roles/{roleId}`

Xóa role tùy biến. **Response `204 No Content`.** Quyền liên quan (`role_permissions`) tự xóa theo (cascade).

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `ROLE_NOT_FOUND` | 404 | Role không tồn tại |
| `ROLE_SYSTEM_PROTECTED` | 422 | Không xóa được role hệ thống |
| `ROLE_IN_USE` | 422 | Role vẫn còn người dùng được gán |

---

## 7. Inventory — Kho hàng

### `GET /api/inventory`

Lấy danh sách hàng tồn kho, hỗ trợ tìm kiếm theo từ khóa và phân trang.

**Query params:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `branchId` | GUID | — | Lọc theo chi nhánh |
| `category` | string | — | Lọc theo mã danh mục |
| `status` | string | — | `TiepNhan` \| `DaDinhGia` \| `TrenQuay` \| `ChuyenXuong` \| `DaBan` |
| `nguonGoc` | string | — | `Quan` \| `Ngoai` |
| `keyword` | string | — | Tìm theo mã sản phẩm, tên, loại, tên quầy |
| `page` | int | `1` | Trang hiện tại |
| `pageSize` | int | `20` | Số bản ghi/trang (tối đa 100) |

> `status` tương ứng enum `ItemTrangThai`: `TiepNhan` (vừa tiếp nhận) · `DaDinhGia` (đã định giá) · `TrenQuay` (đang trưng bày) · `ChuyenXuong` (chuyển xưởng) · `DaBan` (đã bán).  
> `nguonGoc` tương ứng enum `ItemNguonGoc`: `Quan` (vàng của quán) · `Ngoai` (vàng ngoài).

**Response `200 OK`:**

```json
{
  "total": 120,
  "page": 1,
  "pageSize": 20,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "productCode": "V24K-NHAN-001",
      "productName": "Nhẫn Vàng 24K Trơn",
      "category": "VANG_24K",
      "purity": "24K",
      "trayId": "KHAY-A1",
      "quantity": 5,
      "weightGram": 18.75,
      "lastUpdatedAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

> ⚠️ **`weightGram` ở Kho là TỔNG cả lô** (`= trọng-lượng-mỗi-món × quantity`). Trọng lượng mỗi món suy ra bằng `weightGram / quantity`.
> Đây **khác** với `weightGram` ở **API Sản phẩm** (`/api/products`) — vốn là **trọng lượng mỗi món**. Hai field trùng tên nhưng khác ngữ nghĩa theo từng API.
> **→ Khi tính giá trị lô từ dữ liệu Kho, KHÔNG nhân `quantity` lần nữa** (đã nằm trong `weightGram`). Ví dụ trên: `quantity = 5`, `weightGram = 18.75` ⇒ mỗi món `3.75g` (= 1 Chỉ).
> Backend xác nhận: `InventoryItem.WeightGram` = tổng; logic điều chỉnh dùng `perUnit = WeightGram / Quantity` (xem `AdjustInventoryCommandHandler`).

---

### `GET /api/inventory/{id}`

Lấy chi tiết một mục kho. **Lỗi:** `INVENTORY_NOT_FOUND` 404

---

### `POST /api/inventory/{id}/adjust`

Điều chỉnh số lượng tồn kho thủ công. Mỗi lần điều chỉnh tạo một bản ghi lịch sử (`InventoryAdjustmentLog`).

**Yêu cầu policy:** `InventoryManage` (Manager, SystemAdmin).

**Request body:**

```json
{
  "direction": "IN",
  "quantity": 10,
  "reason": "Nhập hàng từ nhà cung cấp",
  "paymentMethod": "CASH",
  "actualValue": 57000000
}
```

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `direction` | ✔ | `IN` (nhập kho) \| `OUT` (xuất kho) |
| `quantity` | ✔ | Số lượng điều chỉnh (số dương) |
| `reason` | ✔ | Lý do điều chỉnh |
| `paymentMethod` | — | `CASH` \| `BANK` — phương thức thanh toán (nếu có) |
| `actualValue` | — | Giá trị thực tế của lô hàng (LAK) |

**Response `200 OK`:**

```json
{
  "item": {
    "id": "...",
    "branchId": "...",
    "productCode": "V24K-NHAN-001",
    "productName": "Nhẫn Vàng 24K Trơn",
    "category": "VANG_24K",
    "purity": "24K",
    "trayId": "KHAY-A1",
    "quantity": 15,
    "weightGram": 56.25,
    "lastUpdatedAt": "2026-06-11T10:00:00Z"
  },
  "log": {
    "id": "...",
    "adjustmentCode": "ADJ-011",
    "branchId": "...",
    "branchName": "Hội sở Vientiane",
    "inventoryItemId": "...",
    "productName": "Nhẫn Vàng 24K Trơn",
    "direction": "IN",
    "quantity": 10,
    "reason": "Nhập hàng từ nhà cung cấp",
    "paymentMethod": "CASH",
    "actualValue": 57000000,
    "createdAt": "2026-06-11T10:00:00Z"
  }
}
```

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `INVENTORY_NOT_FOUND` | 404 | Mục kho không tồn tại |
| `INVENTORY_INSUFFICIENT_STOCK` | 422 | Số lượng xuất vượt quá tồn kho |
| `INVENTORY_INVALID_DIRECTION` | 422 | `direction` phải là `IN` hoặc `OUT` |
| `INVENTORY_INVALID_QUANTITY` | 422 | Số lượng phải lớn hơn 0 |
| `INVENTORY_REASON_REQUIRED` | 422 | Lý do điều chỉnh bắt buộc |

---

### `PATCH /api/inventory/{id}/status`

Cập nhật trạng thái mục kho.

**Request body:** `{ "trangThai": "TrenQuay" }`

> `trangThai`: `TiepNhan` | `DaDinhGia` | `TrenQuay` | `ChuyenXuong` | `DaBan`

**Response `200 OK`:** `{ "id": "...", "trangThai": "TrenQuay" }`

---

### `GET /api/inventory/adjustments`

Lấy lịch sử điều chỉnh tồn kho, hỗ trợ tìm kiếm và phân trang.

**Query params:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `branchId` | GUID | — | Lọc theo chi nhánh |
| `keyword` | string | — | Tìm theo mã điều chỉnh, tên sản phẩm, lý do, tên chi nhánh |
| `page` | int | `1` | Trang hiện tại |
| `pageSize` | int | `20` | Số bản ghi/trang (tối đa 100) |

**Response `200 OK`:**

```json
{
  "total": 85,
  "page": 1,
  "pageSize": 20,
  "data": [
    {
      "id": "...",
      "adjustmentCode": "ADJ-011",
      "branchId": "...",
      "branchName": "Hội sở Vientiane",
      "inventoryItemId": "...",
      "productName": "Nhẫn Vàng 24K Trơn",
      "direction": "OUT",
      "quantity": 2,
      "reason": "Giao dịch INV-2026060901",
      "paymentMethod": "CASH",
      "actualValue": 11400000,
      "createdAt": "2026-06-09T08:30:00Z"
    }
  ]
}
```

> `paymentMethod` và `actualValue` là `null` với các bản ghi được tạo tự động từ giao dịch nếu chưa có giá trị tương ứng.

---

## 8. Transactions — Giao dịch bán hàng (POS)

### Luồng trạng thái

```
Cashier tạo đơn
      │
      ▼
  [ PENDING ] ─── Manager duyệt ──► [ APPROVED ] ─── Thanh toán ──► [ COMPLETED ]
      │                                                                (bất biến)
      └─── Manager từ chối ──► [ REJECTED ]
```

---

### `POST /api/transactions`

Tạo giao dịch bán hàng mới (trạng thái ban đầu: `PENDING`).

**Yêu cầu xác thực.** `branchId`, `staffId`, `counterId` được lấy tự động từ JWT — **không truyền trong body**.

**Request body:**

```json
{
  "type": "SellGold",
  "paymentMethod": "CASH",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "currency": null,
  "exchangeRate": null,
  "note": "Khách VIP",
  "depositAmount": 0,
  "referenceInvoiceCode": null,
  "items": [
    {
      "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "productName": "Nhẫn Vàng 24K Trơn",
      "quantity": 2,
      "weightUnitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "weightGramOverride": null,
      "unitPriceLak": 510000,
      "itemRole": "Normal",
      "laborFee": 50000,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `type` | ✔ | `SellGold` \| `SellSilver` \| `BuyGold` \| `ExchangeGold` \| `ExchangeCurrency` \| `BuyMoreGold` \| `ExchangeFree` \| `ExchangeToMoney` |
| `paymentMethod` | ✔ | `CASH` \| `BANK` |
| `items[].productId` | ✔ | ID sản phẩm |
| `items[].quantity` | ✔ | Số lượng |
| `items[].weightUnitId` | — | ID đơn vị tính (lấy từ `GET /api/config/weight-units`). `null` khi `ExchangeCurrency` |
| `items[].weightGramOverride` | — | **Bắt buộc cho `CanThucTe`** — trọng lượng thực đo (grams). `null` cho `NguyenKhoi` |
| `items[].unitPriceLak` | ✔ | Giá snapshot tại thời điểm GD (LAK/đơn vị) |
| `items[].itemRole` | — | `Normal` (mặc định) — dùng cho luồng đổi hàng |
| `items[].laborFee` | — | Phí gia công thợ (LAK, mặc định 0) |
| `items[].stoneFee` | — | Phí đá (LAK, mặc định 0) |
| `items[].haoHutGram` | — | Trọng lượng hao hụt (grams, mặc định 0) |
| `items[].phiHuHai` | — | Phí hủy hoại (LAK, mặc định 0) |
| `customerId` | — | ID khách hàng (tuỳ chọn) |
| `depositAmount` | — | Số tiền đặt cọc (LAK, mặc định 0) |
| `referenceInvoiceCode` | — | Mã hóa đơn gốc — dùng cho luồng đổi hàng (`ExchangeGold`) |

**Cách tính tự động (backend):**

```
weightGram = weightGramOverride ?? (quantity × unit.gramPerUnit)
lineTotal  = quantity × unitPriceLak
```

**Response `201 Created`:** ID giao dịch vừa tạo (GUID).

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị trọng lượng không tồn tại |
| `CONFIG_PRICE_NOT_FOUND` | 422 | Chưa có bảng giá hiệu lực |
| `INVENTORY_NOT_FOUND` | 404 | Sản phẩm không có trong kho quầy |
| `INVENTORY_INSUFFICIENT_STOCK` | 422 | Không đủ số lượng trong kho |
| `VALIDATION_FAILED` | 422 | Dữ liệu không hợp lệ (kèm `errors{}`) |

---

### `GET /api/transactions`

Lấy danh sách giao dịch với phân trang hoặc không phân trang.

**Query params:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `branchId` | GUID | — | Lọc theo chi nhánh |
| `status` | string | — | `Draft` \| `Pending` \| `Approved` \| `Rejected` \| `Completed` |
| `type` | string | — | `SellGold` \| `SellSilver` \| `BuyGold` \| `ExchangeGold` \| `ExchangeCurrency` \| ... |
| `from` | DateTime | — | Ngày bắt đầu |
| `to` | DateTime | — | Ngày kết thúc |
| `invoiceCode` | string | — | Tìm chính xác theo mã hóa đơn |
| `q` | string | — | Tìm kiếm chung |
| `limit` | int | — | Trả mảng phẳng không phân trang (dùng cho POS lookup). **Khi truyền `limit`, bỏ qua `page`/`pageSize`** |
| `page` | int | `1` | Trang hiện tại (chế độ phân trang) |
| `pageSize` | int | `20` | Số bản ghi/trang |

> Khi truyền `limit`: response là **mảng phẳng** `[...]`.  
> Khi không truyền `limit`: response là **object phân trang** `{ total, page, pageSize, data }`.

**Response `200 OK`** (chế độ phân trang):

```json
{
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "invoiceCode": "INV-2026060901",
      "type": "SellGold",
      "status": "Completed",
      "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "branchName": "Hội sở Vientiane",
      "counterId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "counterName": "Quầy 01",
      "cashierId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "cashierName": "Trần Văn A",
      "subtotalAmount": 11400000,
      "laborFee": 100000,
      "stoneFee": 0,
      "totalAmount": 11500000,
      "depositAmount": 0,
      "currency": "LAK",
      "paymentMethod": "CASH",
      "note": "Khách VIP",
      "transactedAt": "2026-06-09T08:30:00Z",
      "referenceInvoiceCode": null,
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
          "laborFee": 100000,
          "stoneFee": 0
        }
      ]
    }
  ]
}
```

---

### `GET /api/transactions/export`

Xuất danh sách giao dịch ra file Excel (`.xlsx`). Áp dụng cùng bộ filter với `GET /api/transactions`, tối đa **5 000 dòng**.

**Yêu cầu policy:** `ReportDashboard` (Manager, SystemAdmin).

**Query params:** Giống `GET /api/transactions` (trừ `limit`, `page`, `pageSize`).

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `branchId` | GUID | Lọc theo chi nhánh |
| `status` | string | Lọc theo trạng thái |
| `type` | string | Lọc theo loại giao dịch |
| `from` | DateTime | Từ ngày |
| `to` | DateTime | Đến ngày |
| `invoiceCode` | string | Tìm theo mã hóa đơn |
| `q` | string | Tìm kiếm chung |

**Response `200 OK`:**

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="giao-dich-YYYYMMDD-HHmmss.xlsx"`

File Excel gồm các cột: Mã HĐ · Loại GD · Trạng thái · Chi nhánh · Quầy · Nhân viên · Khách hàng · SĐT KH · Tiền hàng · Phí GC · Phí đá · Tổng tiền · Đặt cọc · PT TT · Tiền tệ · Ghi chú · Thời gian.

---

### `GET /api/transactions/{id}` / Approve / Reject / Complete

| Method | Endpoint | Policy | Mô tả |
|---|---|---|---|
| `GET` | `/{id}` | Auth | Chi tiết giao dịch (cấu trúc giống item trong danh sách) |
| `POST` | `/{id}/approve` | `TransactionApprove` | Duyệt (`Pending → Approved`) |
| `POST` | `/{id}/reject` | `TransactionApprove` | Từ chối (`Pending → Rejected`) |
| `POST` | `/{id}/complete` | Auth | Hoàn thành (`Approved → Completed`) |

**Body `/complete`:** `{ "paymentMethod": "CASH" }`

**Lỗi phổ biến:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `TRANSACTION_NOT_FOUND` | 404 | Giao dịch không tồn tại |
| `TRANSACTION_INVALID_STATUS` | 422 | Trạng thái không cho phép thao tác này |
| `TRANSACTION_ALREADY_COMPLETED` | 422 | Giao dịch đã hoàn thành, không thể sửa |

---

## 9. Trade — Mua vào / Đổi hàng

### Các loại giao dịch Trade

```
DoiHang     — Đổi hàng: đem hàng cũ lấy hàng mới + tính chênh lệch
MuaThem     — Mua thêm: giống DoiHang (alias)
DoiMienPhi  — Đổi miễn phí: trong vòng 31 ngày, giá trị chênh ≤ 1%
DoiThanhTien— Đổi thành tiền mặt: khách nhận tiền, không cần hàng mới
```

### `POST /api/trade`

Tạo giao dịch mua vào hoặc đổi hàng.

**Yêu cầu policy:** `TradeCreate` (Cashier, Manager, SystemAdmin).

**Request body:**

```json
{
  "loai": "DoiHang",
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "itemCuId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "itemMoiId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "phiHuHai": 50000,
  "haoHutGram": 0.05,
  "tienCong": 100000,
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "ngayMuaCu": null,
  "note": "Đổi nhẫn cũ lấy nhẫn mới"
}
```

> `haoHutGram`: Trọng lượng hao hụt tính bằng **gram** (trước đây là `haoHutMg`).  
> `itemMoiId`: Bắt buộc cho `DoiHang`, `MuaThem`, `DoiMienPhi`. Tùy chọn cho `DoiThanhTien`.  
> `ngayMuaCu`: Bắt buộc cho `DoiMienPhi` (kiểm tra ≤ 31 ngày).

**Response `200 OK`:**

```json
{
  "id": "...",
  "txnCode": "TRADE-0001",
  "loai": "DoiHang",
  "branchId": "...",
  "employeeId": "...",
  "itemCuId": "...",
  "itemCuName": "Nhẫn Vàng 18K cũ",
  "itemCuWeightGram": 3.75,
  "itemMoiId": "...",
  "itemMoiName": "Nhẫn Vàng 24K mới",
  "itemMoiWeightGram": 4.5,
  "phiHuHai": 50000,
  "tienHaoHut": 23925,
  "tienCong": 100000,
  "chenhLech": 836925,
  "note": "Đổi nhẫn cũ lấy nhẫn mới",
  "ngayGio": "2025-06-09T09:00:00Z"
}
```

> `chenhLech > 0`: Khách phải trả thêm | `chenhLech < 0`: Cửa hàng hoàn tiền.  
> `itemCuWeightGram` / `itemMoiWeightGram`: Trọng lượng tính bằng **gram**.

**Lỗi:**

| Mã lỗi | HTTP | Mô tả |
|---|---|---|
| `INVENTORY_NOT_FOUND` | 404 | Sản phẩm kho không tồn tại |
| `TRADE_ITEM_NOT_QUAN` | 422 | Sản phẩm không phải của quán |
| `INVENTORY_ITEM_NOT_AVAILABLE` | 422 | Sản phẩm mới không ở trạng thái trên quầy |
| `TRADE_FREE_EXCHANGE_EXPIRED` | 422 | Hết thời hạn đổi miễn phí (> 31 ngày) |
| `TRADE_FREE_EXCHANGE_INVALID_VALUE` | 422 | Chênh lệch giá trị vượt 1% |
| `CONFIG_PRICE_NOT_FOUND` | 422 | Chưa có bảng giá hiệu lực |

---

### `GET /api/trade`

Lấy danh sách giao dịch Trade.

**Query params:** `branchId`, `loai`, `from`, `to`, `page`, `limit`.

**Response `200 OK`:** `{ "total": 50, "page": 1, "pageSize": 20, "data": [...TradeTxnResponse] }`

---

### `GET /api/trade/{id}`

Lấy chi tiết giao dịch Trade. **Lỗi:** `TRADE_NOT_FOUND` 404

---

## 10. Cash Ledger — Quỹ & Dòng tiền

> Tất cả endpoint yêu cầu policy `CashLedgerManage` (ThuQuy, Manager, SystemAdmin).

### `GET /api/cash-ledger/daily`

Lấy sổ quỹ theo ngày. **Query params:** `branchId` (bắt buộc), `date` (mặc định hôm nay).

---

### `POST /api/cash-ledger/opening-balance`

Đặt số dư mở đầu ngày.

**Request body:**

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "date": "2025-06-10",
  "cashAmountLak": 50000000,
  "bankAmountLak": 100000000
}
```

---

### `POST /api/cash-ledger/manual-entry`

Ghi thu–chi thủ công.

**Request body:**

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "description": "Chi tiền vệ sinh văn phòng",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 500000,
  "exchangeRate": 1
}
```

> `direction`: `IN` (thu) | `OUT` (chi). `currency`: `LAK` | `THB` | `USD`.

---

### `GET /api/cash-ledger/cash-count` / `PUT /api/cash-ledger/cash-count`

Lấy / Lưu kết quả kiểm đếm tiền mặt. **Query params (GET):** `branchId`, `date`.

---

## 11. Reports — Báo cáo

### `GET /api/reports/dashboard`

Lấy số liệu tổng quan Dashboard.

**Yêu cầu policy:** `ReportDashboard` (Manager, SystemAdmin).

**Query params:** `from`, `to` (DateTime).

**Response `200 OK`:**

```json
{
  "totalRevenue": 9570000000,
  "totalPurchase": 3600000000,
  "pendingTransactionCount": 3,
  "from": "2025-06-01T00:00:00Z",
  "to": "2025-06-09T23:59:59Z"
}
```

---

### `GET /api/reports/daily`

Lấy báo cáo chi tiết theo ngày.

**Yêu cầu policy:** `ReportDaily` (Manager, SystemAdmin, ThuQuy).

**Query params:** `branchId` (bắt buộc), `date` (mặc định hôm nay).

---

## 12. Mã lỗi chung

| Nhóm | Mã lỗi | HTTP | Mô tả |
|---|---|---|---|
| **Auth** | `AUTH_INVALID_CREDENTIALS` | 401 | Sai mã nhân viên hoặc mật khẩu |
| | `AUTH_TOKEN_EXPIRED` | 401 | Access token đã hết hạn |
| | `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token không hợp lệ |
| | `AUTH_ACCOUNT_INACTIVE` | 403 | Tài khoản bị vô hiệu hoá |
| | `AUTH_FORBIDDEN` | 403 | Không có quyền thực hiện thao tác |
| **Branch** | `BRANCH_NOT_FOUND` | 404 | Chi nhánh không tồn tại |
| | `COUNTER_NOT_FOUND` | 404 | Quầy giao dịch không tồn tại |
| **User** | `USER_NOT_FOUND` | 404 | Người dùng không tồn tại |
| | `USER_EMPLOYEE_CODE_DUPLICATE` | 422 | Mã nhân viên đã tồn tại |
| | `ROLE_NOT_FOUND` | 404 | Role không tồn tại |
| | `ROLE_CODE_DUPLICATE` | 422 | Mã role đã tồn tại |
| | `ROLE_CODE_REQUIRED` | 422 | Thiếu mã role |
| | `ROLE_NAME_REQUIRED` | 422 | Thiếu tên role |
| | `ROLE_SYSTEM_PROTECTED` | 422 | Không sửa/xóa được role hệ thống |
| | `ROLE_IN_USE` | 422 | Role vẫn còn người dùng được gán |
| | `COUNTER_BRANCH_MISMATCH` | 422 | Quầy không thuộc chi nhánh của nhân viên |
| **Customer** | `CUSTOMER_NOT_FOUND` | 404 | Khách hàng không tồn tại |
| | `CUSTOMER_PHONE_DUPLICATE` | 422 | Số điện thoại đã được đăng ký |
| **Product** | `PRODUCT_NOT_FOUND` | 404 | Sản phẩm không tồn tại |
| | `PRODUCT_CODE_DUPLICATE` | 422 | Mã sản phẩm đã tồn tại |
| | `PRODUCT_CATEGORY_NOT_FOUND` | 404 | Danh mục sản phẩm không tồn tại |
| | `PRODUCT_CATEGORY_CODE_DUPLICATE` | 422 | Mã danh mục đã tồn tại |
| | `PRODUCT_CATEGORY_HAS_PRODUCTS` | 422 | Danh mục còn sản phẩm, không thể xoá |
| | `PRODUCT_PRICE_NOT_CONFIGURED` | 422 | Sản phẩm chưa có giá (đúng hàm lượng + đơn vị) trong bảng giá — không thể bán |
| | `PRODUCT_WEIGHT_UNIT_REQUIRED` | 422 | Sản phẩm có hàm lượng (Vàng/Bạc) phải chọn đơn vị tính giá |
| **Config** | `CONFIG_PRICE_NOT_FOUND` | 404 | Chưa có bảng giá hiệu lực |
| | `CONFIG_RATE_NOT_FOUND` | 404 | Chưa có tỷ giá hiệu lực |
| | `CONFIG_GOLD_PURITY_NOT_FOUND` | 404 | Độ tinh khiết không tồn tại |
| | `CONFIG_GOLD_PURITY_CODE_DUPLICATE` | 422 | Mã độ tinh khiết đã tồn tại |
| | `CONFIG_GOLD_PURITY_IN_USE` | 422 | Hàm lượng đang được dùng (sản phẩm/bảng giá), không thể xóa |
| | `CONFIG_WEIGHT_UNIT_IN_USE` | 422 | Đơn vị đang được dùng (sản phẩm/bảng giá), không thể xóa |
| | `CONFIG_STONE_RULE_NOT_FOUND` | 404 | Quy tắc giá đá không tồn tại |
| | `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị trọng lượng không tồn tại |
| | `CONFIG_WEIGHT_UNIT_CODE_DUPLICATE` | 422 | Mã đơn vị (`maTocDoc`) đã tồn tại |
| | `CONFIG_WEIGHT_UNIT_SYSTEM_PROTECTED` | 422 | Đơn vị hệ thống, không thể xoá |
| **Inventory** | `INVENTORY_NOT_FOUND` | 404 | Mục kho không tồn tại |
| | `INVENTORY_INSUFFICIENT_STOCK` | 422 | Không đủ số lượng trong kho |
| | `INVENTORY_ITEM_NOT_AVAILABLE` | 422 | Sản phẩm không ở trạng thái trên quầy |
| | `INVENTORY_INVALID_DIRECTION` | 422 | Direction phải là IN hoặc OUT |
| **Transaction** | `TRANSACTION_NOT_FOUND` | 404 | Giao dịch không tồn tại |
| | `TRANSACTION_ALREADY_COMPLETED` | 422 | Giao dịch đã hoàn thành |
| | `TRANSACTION_INVALID_STATUS` | 422 | Trạng thái giao dịch không hợp lệ |
| **Trade** | `TRADE_NOT_FOUND` | 404 | Giao dịch Trade không tồn tại |
| | `TRADE_ITEM_NOT_QUAN` | 422 | Sản phẩm không phải của quán |
| | `TRADE_FREE_EXCHANGE_EXPIRED` | 422 | Hết thời hạn đổi miễn phí (> 31 ngày) |
| | `TRADE_FREE_EXCHANGE_INVALID_VALUE` | 422 | Chênh lệch giá trị vượt 1% |
| **Validation** | `VALIDATION_FAILED` | 422 | Dữ liệu đầu vào không hợp lệ (kèm `errors{}`) |
| **System** | `SYSTEM_INTERNAL_ERROR` | 500 | Lỗi hệ thống nội bộ |
