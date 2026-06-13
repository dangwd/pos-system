# API Tài liệu — Module Auth (`/api/auth`)

> **Base URL**: `/api/auth`
> **Phiên bản**: v1
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Auth xử lý xác thực người dùng theo cơ chế **JWT + Refresh Token rotation**.

### Luồng xác thực

```
┌──────────┐   POST /login        ┌────────────┐
│  Client  │ ───────────────────► │   Server   │
│          │ ◄─────────────────── │            │
│          │  accessToken (JWT)   │  BCrypt     │
│          │  refreshToken        │  verify     │
└──────────┘                      └────────────┘

                      ┌─────── Mỗi request ───────┐
                      │  Authorization: Bearer <accessToken>  │
                      └───────────────────────────┘

      Khi accessToken hết hạn:
┌──────────┐   POST /refresh      ┌────────────┐
│  Client  │ ───────────────────► │   Server   │
│          │ ◄─────────────────── │            │
│          │  accessToken (mới)   │  Revoke     │
│          │  refreshToken (mới)  │  cũ, tạo   │
└──────────┘                      │  mới       │
                                  └────────────┘
```

### Cơ chế Token

| Token | Thuật toán | Thời hạn | Lưu trữ |
|---|---|---|---|
| **Access Token** | HMAC-SHA256 (JWT) | 480 phút (mặc định, cấu hình qua `Jwt:ExpiryMinutes`) | Memory / `Authorization` header |
| **Refresh Token** | Random 64 bytes (Base64) | 30 ngày | DB (`refresh_tokens`) + Cookie/LocalStorage phía client |

**Refresh Token Rotation**: mỗi lần `/refresh` thành công, token cũ bị thu hồi (`IsRevoked = true`) và một cặp token mới được phát hành.

---

## JWT Claims

Access Token chứa các claims sau:

| Claim | Tên chuẩn | Kiểu | Mô tả |
|---|---|---|---|
| `sub` | `JwtRegisteredClaimNames.Sub` | `string (GUID)` | ID người dùng |
| `unique_name` | `JwtRegisteredClaimNames.UniqueName` | `string` | Username (= mã nhân viên) |
| `role_code` | custom | `string` | Mã role: `SystemAdmin`, `Manager`, `ThuQuy`, `Cashier` |
| `permission` | custom (nhiều) | `string[]` | Danh sách mã quyền, mỗi quyền là một claim riêng |
| `exp` | standard | `Unix timestamp` | Thời điểm hết hạn |

---

## Endpoints

### 1. Đăng nhập

```
POST /api/auth/login
```

**Yêu cầu xác thực**: Không

#### Request Body

```json
{
  "username": "NV001",
  "password": "Cashier@123"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `username` | `string` | Có | Mã nhân viên (= username đăng nhập) |
| `password` | `string` | Có | Mật khẩu |

#### Response — 200 OK

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJhbmRvbSByZWZyZXNoIHRva2Vu...",
  "role": "Cashier",
  "permissions": [
    "transaction.create",
    "transaction.view_own",
    "trade.create"
  ],
  "fullName": "Nguyễn Văn A",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `accessToken` | `string` | JWT dùng cho các request tiếp theo |
| `refreshToken` | `string` | Token dùng để gia hạn access token |
| `role` | `string` | Mã role của người dùng |
| `permissions` | `string[]` | Danh sách quyền được cấp |
| `fullName` | `string` | Tên đầy đủ |
| `userId` | `GUID` | ID người dùng |
| `branchId` | `GUID \| null` | ID chi nhánh (null nếu là SystemAdmin không gắn chi nhánh) |

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `401` | `AUTH_INVALID_CREDENTIALS` | Sai username hoặc password |
| `403` | `AUTH_ACCOUNT_INACTIVE` | Tài khoản bị vô hiệu hóa |

---

### 2. Gia hạn Token

```
POST /api/auth/refresh
```

**Yêu cầu xác thực**: Không (dùng refresh token)

#### Request Body

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJhbmRvbSByZWZyZXNoIHRva2Vu..."
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `refreshToken` | `string` | Có | Refresh token hiện tại |

#### Response — 200 OK

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "bW5vcHFyc3R1dnd4eXphYmNkZWZnaGlqa2xtbm9w..."
}
```

> **Lưu ý**: Refresh token cũ bị thu hồi ngay lập tức. Client **phải lưu** refresh token mới từ response này.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `401` | `AUTH_TOKEN_EXPIRED` | Token không tồn tại, đã bị thu hồi, hoặc hết hạn 30 ngày |

---

### 3. Đăng xuất

```
POST /api/auth/logout
```

**Yêu cầu xác thực**: Có — `Authorization: Bearer <accessToken>`

#### Request Body

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJhbmRvbSByZWZyZXNoIHRva2Vu..."
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `refreshToken` | `string` | Có | Refresh token cần thu hồi |

#### Response — 204 No Content

Không có body. Refresh token bị đánh dấu `IsRevoked = true` trong DB.

> **Hành vi**: Nếu refresh token không tồn tại, endpoint vẫn trả về `204` (idempotent — an toàn khi gọi nhiều lần).

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `401` | `AUTH_TOKEN_EXPIRED` | Access token không hợp lệ hoặc hết hạn |
| `403` | `AUTH_FORBIDDEN` | Không có quyền |

---

### 4. Lấy thông tin người dùng hiện tại

```
GET /api/auth/me
```

**Yêu cầu xác thực**: Có — `Authorization: Bearer <accessToken>`

#### Response — 200 OK

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeCode": "NV001",
  "fullName": "Nguyễn Văn A",
  "phone": "0201234567",
  "role": "Cashier",
  "permissions": [
    "transaction.create",
    "transaction.view_own",
    "trade.create"
  ],
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "lastLoginAt": "2026-06-10T08:30:00Z"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | `GUID` | ID người dùng |
| `employeeCode` | `string` | Mã nhân viên |
| `fullName` | `string` | Họ và tên |
| `phone` | `string` | Số điện thoại |
| `role` | `string` | Mã role |
| `permissions` | `string[]` | Danh sách quyền hiện tại |
| `branchId` | `GUID \| null` | ID chi nhánh |
| `lastLoginAt` | `ISO 8601 \| null` | Lần đăng nhập cuối (UTC) |

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `401` | `AUTH_TOKEN_EXPIRED` | Access token không hợp lệ hoặc hết hạn |
| `404` | `USER_NOT_FOUND` | Người dùng đã bị xóa sau khi đăng nhập |

---

## Cấu trúc Response Lỗi

Mọi lỗi trả về theo chuẩn mở rộng RFC 7807:

```json
{
  "status": 401,
  "errorCode": "AUTH_INVALID_CREDENTIALS"
}
```

> Không bao giờ trả về thông báo lỗi bằng ngôn ngữ tự nhiên trong `errorCode`. Frontend tự map sang ngôn ngữ hiển thị qua `src/lib/errors.ts`.

---

## Demo Credentials (Seeded)

| Username | Password | Role | Mô tả |
|---|---|---|---|
| `ADMIN001` | `Admin@123` | `SystemAdmin` | Toàn quyền hệ thống |
| `QL001` | `Manager@123` | `Manager` | Quản lý / Chủ cửa hàng |
| `TQ001` | `ThuQuy@123` | `ThuQuy` | Thủ quỹ |
| `NV001` | `Cashier@123` | `Cashier` | Nhân viên bán hàng |

---

## Ví dụ sử dụng (cURL)

### Đăng nhập

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "ADMIN001", "password": "Admin@123"}'
```

### Gọi API có xác thực

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Gia hạn token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "dGhpcyBpcyBhIHJhbmRvbSByZWZyZXNoIHRva2Vu..."}'
```

### Đăng xuất

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "dGhpcyBpcyBhIHJhbmRvbSByZWZyZXNoIHRva2Vu..."}'
```

---

## Ghi chú triển khai

- **Cấu hình JWT** nằm trong `appsettings.json` → section `Jwt`:
  ```json
  {
    "Jwt": {
      "Secret": "<min 32 chars>",
      "Issuer": "khamphuvong-pos",
      "Audience": "khamphuvong-pos-client",
      "ExpiryMinutes": "480"
    }
  }
  ```
- `AuthController` bắt `UnauthorizedAccessException` thủ công và trả về `401` thay vì để middleware xử lý (middleware map nó thành `403`).
- Refresh token được lưu trong bảng `refresh_tokens` với `ExpiresAt = CreatedAt + 30 ngày`. Nên định kỳ chạy job dọn dẹp các token hết hạn.
