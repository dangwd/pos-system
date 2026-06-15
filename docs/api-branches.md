# API Tài liệu — Module Branches (`/api/branches`)

> **Base URL**: `/api/branches`  
> **Phiên bản**: v1  
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Branches quản lý chi nhánh và quầy giao dịch (counter) trong hệ thống đa chi nhánh.

**Phân quyền**:
- `GET` (đọc): Mọi user đã đăng nhập (`[Authorize]`)
- `POST`, `PUT`, `PATCH` (ghi): Yêu cầu permission `BRANCH_MANAGE`

---

## Schema

### Branch Object

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Chi nhánh Vientiane Center",
  "address": "Km3, Thadeua Road, Vientiane",
  "phone": "021-999-888",
  "isHeadquarters": true,
  "isActive": true
}
```

### Counter Object

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "counterName": "Quầy 1",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "isActive": true
}
```

---

## Endpoints — Chi nhánh

### 1. Danh sách chi nhánh

```
GET /api/branches
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Chi nhánh Vientiane Center",
    "address": "Km3, Thadeua Road, Vientiane",
    "phone": "021-999-888",
    "isHeadquarters": true,
    "isActive": true
  }
]
```

---

### 2. Chi tiết chi nhánh

```
GET /api/branches/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Path Parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `GUID` | ID chi nhánh |

#### Response — 200 OK

Trả về Branch Object.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `BRANCH_NOT_FOUND` | Không tìm thấy chi nhánh |

---

### 3. Tạo chi nhánh mới

```
POST /api/branches
```

**Quyền**: `BRANCH_MANAGE`

#### Request Body

```json
{
  "name": "Chi nhánh Luang Prabang",
  "address": "Sisavangvong Road, Luang Prabang",
  "phone": "071-123-456",
  "isHeadquarters": false
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `name` | `string` | Có | Tên chi nhánh |
| `address` | `string` | Có | Địa chỉ |
| `phone` | `string` | Có | Số điện thoại |
| `isHeadquarters` | `bool` | Không | Có phải hội sở không (mặc định `false`) |

#### Response — 201 Created

```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "name": "Chi nhánh Luang Prabang"
}
```

Header `Location: /api/branches/{id}`

---

### 4. Cập nhật chi nhánh

```
PUT /api/branches/{id}
```

**Quyền**: `BRANCH_MANAGE`

#### Request Body

```json
{
  "name": "Chi nhánh Luang Prabang (đã đổi tên)",
  "address": "Sisavangvong Road, Luang Prabang",
  "phone": "071-999-999"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `name` | `string` | Có | Tên mới |
| `address` | `string` | Có | Địa chỉ mới |
| `phone` | `string` | Có | Điện thoại mới |

#### Response — 200 OK

Trả về Branch Object đã cập nhật.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `BRANCH_NOT_FOUND` | Không tìm thấy chi nhánh |

---

## Endpoints — Quầy giao dịch (Counter)

### 5. Danh sách quầy theo chi nhánh

```
GET /api/branches/{id}/counters
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "counterName": "Quầy 1",
    "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "isActive": true
  }
]
```

---

### 6. Tạo quầy mới

```
POST /api/branches/{id}/counters
```

**Quyền**: `BRANCH_MANAGE`

#### Request Body

```json
{
  "counterName": "Quầy 2"
}
```

#### Response — 200 OK

Trả về Counter Object vừa tạo.

---

### 7. Cập nhật quầy

```
PUT /api/branches/{branchId}/counters/{counterId}
```

**Quyền**: `BRANCH_MANAGE`

#### Request Body

```json
{
  "counterName": "Quầy VIP"
}
```

#### Response — 200 OK

Trả về Counter Object đã cập nhật.

---

### 8. Vô hiệu hóa quầy

```
PATCH /api/branches/{branchId}/counters/{counterId}/deactivate
```

**Quyền**: `BRANCH_MANAGE`

#### Response — 204 No Content

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| `GET` | `/api/branches` | Danh sách chi nhánh | `[Authorize]` |
| `GET` | `/api/branches/{id}` | Chi tiết chi nhánh | `[Authorize]` |
| `POST` | `/api/branches` | Tạo chi nhánh | `BRANCH_MANAGE` |
| `PUT` | `/api/branches/{id}` | Cập nhật chi nhánh | `BRANCH_MANAGE` |
| `GET` | `/api/branches/{id}/counters` | Danh sách quầy | `[Authorize]` |
| `POST` | `/api/branches/{id}/counters` | Tạo quầy | `BRANCH_MANAGE` |
| `PUT` | `/api/branches/{branchId}/counters/{counterId}` | Cập nhật quầy | `BRANCH_MANAGE` |
| `PATCH` | `/api/branches/{branchId}/counters/{counterId}/deactivate` | Vô hiệu hóa quầy | `BRANCH_MANAGE` |
