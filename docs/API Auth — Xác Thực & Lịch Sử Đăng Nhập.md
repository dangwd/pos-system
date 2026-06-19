# API Auth — Xác Thực & Lịch Sử Đăng Nhập

> Base URL: `https://<host>/api/auth`  
> Content-Type: `application/json`  
> Các endpoint có **Yêu cầu auth** gửi `Authorization: Bearer <accessToken>` trong header.

---

## Tổng quan

Module Auth quản lý phiên đăng nhập và ghi lại toàn bộ lịch sử xác thực vào bảng `login_audit_logs`.

**Các sự kiện được ghi log tự động:**

| Sự kiện | Khi nào |
|---|---|
| `LoginSuccess` | Đăng nhập thành công |
| `LoginFailedBadCredentials` | Sai username hoặc mật khẩu |
| `LoginFailedInactive` | Tài khoản bị vô hiệu hóa |
| `Logout` | Đăng xuất (thu hồi refresh token) |
| `TokenRefreshed` | Làm mới access token |

Mỗi log ghi kèm **IP address** và **User-Agent** của client.

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/login` | Không | Đăng nhập, lấy token |
| `POST` | `/api/auth/refresh` | Không | Làm mới access token |
| `POST` | `/api/auth/logout` | Đăng nhập | Đăng xuất, thu hồi refresh token |
| `GET` | `/api/auth/me` | Đăng nhập | Thông tin người dùng hiện tại |
| `GET` | `/api/auth/audit-logs` | `AuditLogView` | Lịch sử đăng nhập (phân trang) |

> **Policy `AuditLogView`:** chỉ cấp cho SystemAdmin.

---

## `POST /api/auth/login`

Đăng nhập bằng mã nhân viên và mật khẩu. Trả về cặp token và thông tin người dùng.

**Request body:**

```json
{
  "username": "ADMIN001",
  "password": "Admin@123"
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `username` | ✅ | Mã nhân viên (`EmployeeCode`) hoặc tên đăng nhập (`Username`) |
| `password` | ✅ | Mật khẩu |

**Response `200 OK`:**

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBpcyBh...",
  "role": "SystemAdmin",
  "permissions": ["TRANSACTION_CREATE", "AUDIT_LOG_VIEW", "..."],
  "fullName": "Quản trị viên",
  "userId": "11111111-0000-0000-0000-000000000001",
  "branchId": "55555555-0000-0000-0000-000000000001"
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `accessToken` | string | JWT — hết hạn sau `Jwt:ExpiryMinutes` (mặc định 480 phút) |
| `refreshToken` | string | Token làm mới — hết hạn sau 30 ngày |
| `role` | string | Mã role: `Cashier`, `ThuQuy`, `Manager`, `SystemAdmin` |
| `permissions` | string[] | Danh sách mã quyền hạn của role |
| `fullName` | string | Tên đầy đủ của người dùng |
| `userId` | Guid | UUID của người dùng |
| `branchId` | Guid\|null | UUID chi nhánh được gán (`null` nếu chưa gán) |

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân | Log ghi |
|---|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai username hoặc mật khẩu | `LoginFailedBadCredentials` |
| `AUTH_ACCOUNT_INACTIVE` | 403 | Tài khoản bị vô hiệu hóa | `LoginFailedInactive` |

> **Lưu ý bảo mật:** Cả hai lỗi `AUTH_INVALID_CREDENTIALS` trả về cùng HTTP 401 dù username không tồn tại hay sai mật khẩu — tránh lộ thông tin về sự tồn tại của tài khoản. Tuy nhiên trong `login_audit_logs`, trường `userId` sẽ `null` khi username không tồn tại, và có giá trị khi username đúng nhưng mật khẩu sai — phân biệt được khi audit.

---

## `POST /api/auth/refresh`

Làm mới access token bằng refresh token còn hiệu lực. Refresh token cũ bị thu hồi, một refresh token mới được cấp.

**Request body:**

```json
{
  "refreshToken": "dGhpcyBpcyBh..."
}
```

**Response `200 OK`:**

```json
{
  "accessToken": "eyJhbGci...(new)",
  "refreshToken": "bmV3UmVmcmVzaA...(new)"
}
```

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `AUTH_TOKEN_EXPIRED` | 401 | Refresh token không tồn tại, đã thu hồi, hoặc hết hạn |

> Sự kiện `TokenRefreshed` được ghi vào `login_audit_logs` sau mỗi lần refresh thành công, kèm 16 ký tự đầu của refresh token cũ trong `refreshTokenHint` để truy vết session.

---

## `POST /api/auth/logout`

Đăng xuất bằng cách thu hồi refresh token hiện tại. Sự kiện `Logout` được ghi vào log.

**Yêu cầu auth:** Bearer Token.

**Request body:**

```json
{
  "refreshToken": "dGhpcyBpcyBh..."
}
```

**Response `204 No Content`** — đăng xuất thành công, không có body.

> Nếu refresh token không tồn tại hoặc đã bị thu hồi, endpoint vẫn trả về `204` (silent success) — không ghi log trong trường hợp này.

---

## `GET /api/auth/me`

Lấy thông tin của người dùng đang đăng nhập dựa trên access token.

**Yêu cầu auth:** Bearer Token.

**Response `200 OK`:**

```json
{
  "id": "11111111-0000-0000-0000-000000000001",
  "username": "ADMIN001",
  "fullName": "Quản trị viên",
  "role": "SystemAdmin",
  "permissions": ["TRANSACTION_CREATE", "AUDIT_LOG_VIEW", "..."],
  "branchId": "55555555-0000-0000-0000-000000000001",
  "counterId": null
}
```

---

## `GET /api/auth/audit-logs`

Lấy lịch sử đăng nhập với nhiều bộ lọc. Kết quả sắp xếp theo `occurredAt` giảm dần (mới nhất đầu tiên).

**Yêu cầu policy:** `AuditLogView` — chỉ SystemAdmin.

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `userId` | Guid (tùy chọn) | Lọc theo UUID người dùng |
| `username` | string (tùy chọn) | Tìm kiếm gần đúng (contains, không phân biệt hoa/thường) trong `attemptedUsername` |
| `eventType` | int (tùy chọn) | Lọc theo loại sự kiện — xem [bảng EventType](#bảng-loginEventType) |
| `from` | datetime (tùy chọn) | Từ thời điểm (ISO 8601, UTC). Ví dụ: `2026-06-01T00:00:00Z` |
| `to` | datetime (tùy chọn) | Đến thời điểm (ISO 8601, UTC) |
| `page` | int (tùy chọn) | Trang hiện tại, mặc định `1` |
| `pageSize` | int (tùy chọn) | Số bản ghi mỗi trang, mặc định `50` |

**Ví dụ request:**

```
GET /api/auth/audit-logs?eventType=2&from=2026-06-01T00:00:00Z&page=1&pageSize=20
```
*(Xem tất cả lần đăng nhập thất bại do sai mật khẩu từ đầu tháng 6)*

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "aaaaaaaa-0000-0000-0000-000000000001",
      "userId": null,
      "attemptedUsername": "hacker123",
      "eventType": "LoginFailedBadCredentials",
      "ipAddress": "203.0.113.42",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "occurredAt": "2026-06-19T04:15:30.123Z"
    },
    {
      "id": "bbbbbbbb-0000-0000-0000-000000000001",
      "userId": "11111111-0000-0000-0000-000000000001",
      "attemptedUsername": "ADMIN001",
      "eventType": "LoginSuccess",
      "ipAddress": "192.168.1.10",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "occurredAt": "2026-06-19T03:00:00.000Z"
    }
  ],
  "total": 47,
  "page": 1,
  "pageSize": 20
}
```

**Schema `LoginAuditLogItem`:**

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | Guid | UUID của bản ghi log |
| `userId` | Guid\|null | UUID người dùng — `null` nếu username không tồn tại trong hệ thống |
| `attemptedUsername` | string | Username được nhập lúc đăng nhập (hoặc `""` với sự kiện Logout/TokenRefreshed) |
| `eventType` | string | Tên loại sự kiện — xem [bảng EventType](#bảng-loginEventType) |
| `ipAddress` | string\|null | Địa chỉ IP của client (IPv4 hoặc IPv6). `null` nếu không xác định được |
| `userAgent` | string\|null | Chuỗi User-Agent của trình duyệt/ứng dụng, tối đa 500 ký tự |
| `occurredAt` | datetime | Thời điểm xảy ra sự kiện (UTC, ISO 8601) |

---

## Bảng LoginEventType

| Giá trị int | Tên chuỗi | Mô tả |
|---|---|---|
| `1` | `LoginSuccess` | Đăng nhập thành công |
| `2` | `LoginFailedBadCredentials` | Sai username hoặc mật khẩu |
| `3` | `LoginFailedInactive` | Tài khoản bị vô hiệu hóa (`isActive = false`) |
| `4` | `Logout` | Đăng xuất (refresh token bị thu hồi) |
| `5` | `TokenRefreshed` | Làm mới access token |

> Query param `eventType` nhận giá trị **số nguyên** (ví dụ: `?eventType=2`).

---

## Bảng DB liên quan

| Bảng | Mô tả |
|---|---|
| `users` | Thông tin tài khoản — FK từ `login_audit_logs.user_id` |
| `refresh_tokens` | Refresh token — bị thu hồi khi logout hoặc refresh |
| `login_audit_logs` | Lịch sử mọi sự kiện xác thực |

**Schema bảng `login_audit_logs`:**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid | Khóa chính |
| `user_id` | uuid\|null | FK → `users.id` (SET NULL khi user bị xóa) |
| `attempted_username` | varchar(50) | Username được nhập |
| `event_type` | int | Enum `LoginEventType` |
| `ip_address` | varchar(45) | IPv4 hoặc IPv6 |
| `user_agent` | varchar(500) | User-Agent của client |
| `occurred_at` | timestamptz | Thời điểm sự kiện (UTC) |
| `refresh_token_hint` | varchar(20) | 16 ký tự đầu của refresh token — dùng truy vết session |

**Index:** `user_id`, `occurred_at`, `(user_id, occurred_at)`, `attempted_username`.

> Khi một user bị xóa khỏi hệ thống, bản ghi log **không bị xóa** — `user_id` chuyển thành `null` (SET NULL), dữ liệu kiểm toán được giữ lại.

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai username hoặc mật khẩu |
| `AUTH_ACCOUNT_INACTIVE` | 403 | Tài khoản bị vô hiệu hóa |
| `AUTH_TOKEN_EXPIRED` | 401 | Refresh token không hợp lệ, đã thu hồi, hoặc hết hạn |
| `AUTH_FORBIDDEN` | 403 | Không có quyền truy cập endpoint (thiếu permission) |

---

## Luồng sử dụng điển hình

```
1. Nhân viên đăng nhập      → POST /api/auth/login
                               body: { username: "NV001", password: "Cashier@123" }
                               → 200: { accessToken, refreshToken, role: "Cashier", ... }
                               → log: LoginSuccess (userId: ..., ip: 192.168.1.10)

2. Nhập sai mật khẩu        → POST /api/auth/login
                               body: { username: "NV001", password: "wrongpassword" }
                               → 401: { errorCode: "AUTH_INVALID_CREDENTIALS" }
                               → log: LoginFailedBadCredentials (userId: <id NV001>, ip: 192.168.1.10)

3. Username không tồn tại   → POST /api/auth/login
                               body: { username: "ghost", password: "anypassword" }
                               → 401: { errorCode: "AUTH_INVALID_CREDENTIALS" }
                               → log: LoginFailedBadCredentials (userId: null, ip: ...)

4. Làm mới token             → POST /api/auth/refresh
                               body: { refreshToken: "dGhpcyBpcyBh..." }
                               → 200: { accessToken: "...(new)", refreshToken: "...(new)" }
                               → log: TokenRefreshed (userId: ..., refreshTokenHint: "dGhpcyBpcyBh")

5. Đăng xuất                 → POST /api/auth/logout
                               header: Authorization: Bearer <accessToken>
                               body: { refreshToken: "bmV3UmVmcmVzaA..." }
                               → 204 No Content
                               → log: Logout (userId: ..., refreshTokenHint: "bmV3UmVmcmVza")

6. Admin xem ai đăng nhập   → GET /api/auth/audit-logs
   thất bại hôm nay           ?eventType=2&from=2026-06-19T00:00:00Z
                               → 200: { items: [...], total: 3 }

7. Admin xem lịch sử         → GET /api/auth/audit-logs
   của một nhân viên           ?userId=<guid>&from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z
                               → 200: { items: [...], total: 25, page: 1, pageSize: 50 }
```

---

## Liên quan

- [Tài liệu Kiến trúc & Thiết kế POS Khamphuvong](./Tài%20liệu%20Kiến%20trúc%20%26%20Thiết%20kế%20POS%20Khamphuvong.md) — Mục 11: Danh sách mã lỗi
- Entity: `LoginAuditLog` (`Domain/Entities/LoginAuditLog.cs`), enum `LoginEventType` (`Domain/Enums/LoginEventType.cs`)
- Handler: `LoginCommandHandler`, `LogoutCommandHandler`, `RefreshTokenCommandHandler` (`Application/Features/Auth/AuthCommands.cs`)
- Query: `GetLoginAuditLogsQuery` (`Application/Features/Auth/LoginAuditLogQueries.cs`)
