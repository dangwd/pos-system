# API — Auth: Xác thực & Phiên đăng nhập

Base URL: `https://<host>/api`  
Các endpoint `refresh`, `logout`, `me` yêu cầu `Authorization: Bearer <accessToken>`

---

## Mục lục

1. [Đăng nhập — POST /api/auth/login](#1-đăng-nhập)
2. [Làm mới token — POST /api/auth/refresh](#2-làm-mới-token)
3. [Đăng xuất — POST /api/auth/logout](#3-đăng-xuất)
4. [Lấy thông tin bản thân — GET /api/auth/me](#4-lấy-thông-tin-bản-thân)
5. [Luồng xử lý token trên FE](#5-luồng-xử-lý-token-trên-fe)
6. [Mã lỗi liên quan](#6-mã-lỗi-liên-quan)

---

## 1. Đăng nhập

```
POST /api/auth/login
Content-Type: application/json
```

### Request Body

```jsonc
{
  "username": "NV001",   // mã nhân viên hoặc username
  "password": "Cashier@123"
}
```

### Response 200

```jsonc
{
  "accessToken": "eyJhbGci...",   // JWT, thời hạn ngắn (mặc định 15 phút)
  "refreshToken": "dGhpcyBp...", // Opaque token, thời hạn dài (mặc định 7 ngày)
  "role": "Cashier",             // "Cashier" | "ThuQuy" | "Manager" | "SystemAdmin"
  "permissions": [               // danh sách mã quyền của role
    "transactions.create",
    "transactions.view",
    "inventory.view"
    // ...
  ],
  "fullName": "Nguyễn Văn A",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "branchId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

> **Lưu ý**: Login chỉ trả `branchId` (Guid). Để lấy tên chi nhánh và quầy đầy đủ, gọi tiếp `GET /api/auth/me` ngay sau khi đăng nhập thành công.

### Response lỗi

| HTTP | errorCode | Nguyên nhân |
|------|-----------|-------------|
| 401 | `AUTH_INVALID_CREDENTIALS` | Sai username/password hoặc tài khoản không tồn tại |
| 403 | `AUTH_ACCOUNT_INACTIVE` | Tài khoản đã bị vô hiệu hóa |

---

## 2. Làm mới token

```
POST /api/auth/refresh
Content-Type: application/json
```

Dùng khi `accessToken` hết hạn (FE nhận 401 từ bất kỳ API nào).

### Request Body

```jsonc
{
  "refreshToken": "dGhpcyBp..."
}
```

### Response 200

```jsonc
{
  "accessToken": "eyJhbGci...",   // JWT mới
  "refreshToken": "bmV3dG9r..."  // Refresh token mới (token cũ bị thu hồi)
}
```

> **Quan trọng**: Mỗi lần refresh, backend phát token mới và **thu hồi token cũ** (rotation). FE phải lưu lại cặp token mới ngay lập tức.

### Response lỗi

| HTTP | errorCode | Nguyên nhân |
|------|-----------|-------------|
| 401 | `AUTH_TOKEN_EXPIRED` | Refresh token không hợp lệ, đã thu hồi hoặc hết hạn |

---

## 3. Đăng xuất

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Body

```jsonc
{
  "refreshToken": "dGhpcyBp..."
}
```

### Response 204

Không có body. Backend thu hồi refresh token. FE xóa token khỏi storage và chuyển về trang login.

> Nếu `refreshToken` không tồn tại, API vẫn trả `204` (idempotent — không báo lỗi).

---

## 4. Lấy thông tin bản thân

```
GET /api/auth/me
Authorization: Bearer <accessToken>
```

Không có request body hay query params.

### Response 200

```jsonc
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeCode": "NV001",
  "fullName": "Nguyễn Văn A",
  "phone": "020 1234 5678",
  "role": "Cashier",             // "Cashier" | "ThuQuy" | "Manager" | "SystemAdmin"
  "permissions": [
    "transactions.create",
    "transactions.view",
    "inventory.view"
  ],
  "branchId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "branchName": "Chi nhánh Viêng Chăn",   // null nếu chưa phân công chi nhánh
  "counterId": "a1b2c3d4-...",             // null nếu chưa được phân công quầy
  "counterName": "Quầy 1",                // null nếu chưa được phân công quầy
  "lastLoginAt": "2026-06-14T08:30:00Z"   // null lần đăng nhập đầu tiên
}
```

### Response lỗi

| HTTP | errorCode | Nguyên nhân |
|------|-----------|-------------|
| 401 | `AUTH_TOKEN_EXPIRED` | Access token hết hạn hoặc không hợp lệ |
| 404 | `USER_NOT_FOUND` | User trong token không còn tồn tại trong DB |

---

## 5. Luồng xử lý token trên FE

### Luồng khởi động ứng dụng

```
App khởi động
    │
    ├─ Có accessToken trong storage?
    │       │
    │       ├─ Có → GET /api/auth/me
    │       │           ├─ 200 → hydrate store (user, role, branch, counter) → vào app
    │       │           └─ 401 → thử refresh (xem bên dưới)
    │       │
    │       └─ Không → chuyển về /login
    │
    └─ Đăng nhập thành công
            │
            ├─ Lưu accessToken + refreshToken vào storage
            └─ Gọi GET /api/auth/me → hydrate store → vào app
```

### Luồng tự động refresh token

```
Bất kỳ API nào trả 401
    │
    └─ Gọi POST /api/auth/refresh với refreshToken hiện tại
            │
            ├─ 200 → lưu cặp token mới → retry request gốc
            └─ 401 (AUTH_TOKEN_EXPIRED) → xóa storage → chuyển về /login
```

### Dữ liệu nên lưu vào store sau khi đăng nhập

```ts
interface AuthStore {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    employeeCode: string;
    fullName: string;
    phone: string;
    role: 'Cashier' | 'ThuQuy' | 'Manager' | 'SystemAdmin';
    permissions: string[];
    branchId: string | null;
    branchName: string | null;
    counterId: string | null;
    counterName: string | null;
    lastLoginAt: string | null;
  };
}
```

### Kiểm tra quyền trên FE

```ts
// Kiểm tra quyền cụ thể
const canCreate = user.permissions.includes('transactions.create');

// Kiểm tra role
const isManager = user.role === 'Manager' || user.role === 'SystemAdmin';
```

---

## 6. Mã lỗi liên quan

| errorCode | HTTP | Mô tả |
|-----------|------|-------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai username hoặc password |
| `AUTH_ACCOUNT_INACTIVE` | 403 | Tài khoản bị khóa |
| `AUTH_TOKEN_EXPIRED` | 401 | Access/refresh token hết hạn hoặc không hợp lệ |
| `AUTH_FORBIDDEN` | 403 | Không đủ quyền thực hiện thao tác |
| `USER_NOT_FOUND` | 404 | User không tồn tại |

---

## Demo credentials (môi trường dev)

| Mã nhân viên | Mật khẩu | Role |
|---|---|---|
| `ADMIN001` | `Admin@123` | SystemAdmin |
| `QL001` | `Manager@123` | Manager |
| `TQ001` | `ThuQuy@123` | ThuQuy |
| `NV001` | `Cashier@123` | Cashier |
