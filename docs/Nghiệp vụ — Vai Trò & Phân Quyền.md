# Vai Trò & Phân Quyền (RBAC)

> Tài liệu end-to-end: cấu trúc role/permission, luồng xác thực JWT, các API liên quan và hướng dẫn ghép FE.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Các vai trò & quyền hạn](#2-các-vai-trò--quyền-hạn)
3. [Ma trận phân quyền](#3-ma-trận-phân-quyền)
4. [API Endpoints phân quyền theo endpoint](#4-api-endpoints-phân-quyền-theo-endpoint)
5. [Luồng đăng nhập & JWT](#5-luồng-đăng-nhập--jwt)
6. [Token lifecycle](#6-token-lifecycle)
7. [Frontend — Lưu trữ & sử dụng](#7-frontend--lưu-trữ--sử-dụng)
8. [Frontend — Bảo vệ route (middleware)](#8-frontend--bảo-vệ-route-middleware)
9. [Frontend — Hiển thị menu theo role](#9-frontend--hiển-thị-menu-theo-role)
10. [Frontend — Kiểm tra permission trước khi render nút/action](#10-frontend--kiểm-tra-permission-trước-khi-render-nútaction)
11. [API Reference đầy đủ](#11-api-reference-đầy-đủ)
12. [TypeScript interfaces](#12-typescript-interfaces)
13. [Mã lỗi & xử lý](#13-mã-lỗi--xử-lý)

---

## 1. Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│  PHÂN QUYỀN 2 CẤP                                           │
│                                                              │
│  1. ROLE (vai trò) — dùng cho UI                            │
│     Cashier | ThuQuy | Manager | SystemAdmin                │
│                                                              │
│  2. PERMISSION (quyền hạn) — dùng cho API                  │
│     17 permission codes → gắn vào JWT claim                 │
│     → Backend kiểm tra từng Policy per endpoint             │
└──────────────────────────────────────────────────────────────┘

Đăng nhập
  → Backend trả: accessToken (chứa permission claims) + refreshToken
  → Frontend lưu: localStorage + cookie

Gọi API
  → Axios gắn Bearer token vào header
  → Backend: JWT validate → PermissionHandler kiểm tra claim
  → 403 nếu thiếu quyền

UI
  → authStore.user.role → lọc menu
  → authStore.user.permissions[] → ẩn/hiện nút hành động
```

---

## 2. Các vai trò & quyền hạn

### Cashier — Nhân viên bán hàng

|               |                                                          |
| ------------- | -------------------------------------------------------- |
| **Role code** | `Cashier`                                                |
| **Mô tả**     | Lập đơn bán hàng tại quầy                                |
| **Quyền**     | `TRANSACTION_CREATE` · `TRADE_CREATE` · `INVENTORY_VIEW` |

### ThuQuy — Thủ quỹ

|               |                                                                                 |
| ------------- | ------------------------------------------------------------------------------- |
| **Role code** | `ThuQuy`                                                                        |
| **Mô tả**     | Mở/chốt quỹ, kiểm đếm tiền mặt, ghi thu–chi                                     |
| **Quyền**     | `TRANSACTION_CREATE` · `INVENTORY_VIEW` · `CASH_LEDGER_MANAGE` · `REPORT_DAILY` |

### Manager — Quản lý / Chủ cửa hàng

|               |                                                                     |
| ------------- | ------------------------------------------------------------------- |
| **Role code** | `Manager`                                                           |
| **Mô tả**     | Duyệt/từ chối GD, cấu hình giá, xem báo cáo, quản lý kho & sản phẩm |
| **Quyền**     | 12 quyền — tất cả trừ `BRANCH_MANAGE` và `USER_MANAGE`              |

### SystemAdmin — Quản trị hệ thống

|               |                     |
| ------------- | ------------------- |
| **Role code** | `SystemAdmin`       |
| **Mô tả**     | Toàn quyền hệ thống |
| **Quyền**     | 17 quyền (toàn bộ)  |

---

## 3. Ma trận phân quyền

| Permission             | Nhóm        | Cashier | ThuQuy | Manager | SystemAdmin |
| ---------------------- | ----------- | :-----: | :----: | :-----: | :---------: |
| `TRANSACTION_CREATE`   | TRANSACTION |   ✅    |   ✅   |   ✅    |     ✅      |
| `TRANSACTION_APPROVE`  | TRANSACTION |         |        |   ✅    |     ✅      |
| `TRANSACTION_VIEW_ALL` | TRANSACTION |         |        |   ✅    |     ✅      |
| `TRADE_CREATE`         | TRADE       |   ✅    |        |   ✅    |     ✅      |
| `TRADE_APPROVE`        | TRADE       |         |        |   ✅    |     ✅      |
| `INVENTORY_VIEW`       | INVENTORY   |   ✅    |   ✅   |   ✅    |     ✅      |
| `INVENTORY_MANAGE`     | INVENTORY   |         |        |   ✅    |     ✅      |
| `CASH_LEDGER_MANAGE`   | CASH_LEDGER |         |   ✅   |   ✅    |     ✅      |
| `REPORT_DASHBOARD`     | REPORT      |         |        |   ✅    |     ✅      |
| `REPORT_DAILY`         | REPORT      |         |   ✅   |   ✅    |     ✅      |
| `CONFIG_PRICE`         | CONFIG      |         |        |   ✅    |     ✅      |
| `CONFIG_WEIGHT_UNIT`   | CONFIG      |         |        |   ✅    |     ✅      |
| `CONFIG_STONE_PRICE`   | CONFIG      |         |        |   ✅    |     ✅      |
| `CONFIG_GOLD_PURITY`   | CONFIG      |         |        |   ✅    |     ✅      |
| `PRODUCT_MANAGE`       | PRODUCT     |         |        |   ✅    |     ✅      |
| `BRANCH_MANAGE`        | BRANCH      |         |        |         |     ✅      |
| `USER_MANAGE`          | USER        |         |        |         |     ✅      |

---

## 4. API Endpoints phân quyền theo endpoint

> `[AUTH]` = chỉ cần đăng nhập (JWT hợp lệ).
> `[PERMISSION]` = cần JWT + permission cụ thể.
> `[PUBLIC]` = không cần xác thực.

### Auth

| Method | Endpoint            | Policy | Ghi chú                     |
| ------ | ------------------- | ------ | --------------------------- |
| POST   | `/api/auth/login`   | PUBLIC | Đăng nhập                   |
| POST   | `/api/auth/refresh` | PUBLIC | Lấy token mới               |
| POST   | `/api/auth/logout`  | AUTH   | Revoke refresh token        |
| GET    | `/api/auth/me`      | AUTH   | Lấy thông tin user hiện tại |

### Transactions

| Method | Endpoint                          | Policy             | Ghi chú                                       |
| ------ | --------------------------------- | ------------------ | --------------------------------------------- |
| POST   | `/api/transactions`               | AUTH               | `TRANSACTION_CREATE` (kiểm tra trong handler) |
| GET    | `/api/transactions`               | AUTH               | Cashier chỉ xem của mình; Manager xem tất cả  |
| GET    | `/api/transactions/{id}`          | AUTH               |                                               |
| POST   | `/api/transactions/{id}/approve`  | AUTH               | Handler check `TRANSACTION_APPROVE`           |
| POST   | `/api/transactions/{id}/reject`   | AUTH               | Handler check `TRANSACTION_APPROVE`           |
| POST   | `/api/transactions/{id}/complete` | AUTH               |                                               |
| GET    | `/api/transactions/export`        | `REPORT_DASHBOARD` | Xuất Excel                                    |

### Trade

| Method | Endpoint                  | Policy          | Ghi chú |
| ------ | ------------------------- | --------------- | ------- |
| POST   | `/api/trade`              | `TRADE_CREATE`  |         |
| GET    | `/api/trade`              | AUTH            |         |
| GET    | `/api/trade/{id}`         | AUTH            |         |
| POST   | `/api/trade/{id}/approve` | `TRADE_APPROVE` |         |

### Inventory

| Method | Endpoint                     | Policy             | Ghi chú              |
| ------ | ---------------------------- | ------------------ | -------------------- |
| GET    | `/api/inventory`             | `INVENTORY_VIEW`   |                      |
| GET    | `/api/inventory/{id}`        | `INVENTORY_VIEW`   |                      |
| POST   | `/api/inventory/{id}/adjust` | `INVENTORY_MANAGE` | Điều chỉnh xuất/nhập |
| PATCH  | `/api/inventory/{id}/status` | `INVENTORY_MANAGE` | Cập nhật trạng thái  |
| GET    | `/api/inventory/adjustments` | `INVENTORY_VIEW`   | Lịch sử điều chỉnh   |

### Cash Ledger

| Method | Endpoint                           | Policy               | Ghi chú              |
| ------ | ---------------------------------- | -------------------- | -------------------- |
| GET    | `/api/cash-ledger/daily`           | `CASH_LEDGER_MANAGE` |                      |
| POST   | `/api/cash-ledger/opening-balance` | `CASH_LEDGER_MANAGE` | Mở quỹ               |
| POST   | `/api/cash-ledger/count-sheet`     | `CASH_LEDGER_MANAGE` | Kiểm đếm tiền        |
| POST   | `/api/cash-ledger/entries`         | `CASH_LEDGER_MANAGE` | Ghi thu–chi thủ công |

### Reports

| Method | Endpoint                 | Policy             | Ghi chú |
| ------ | ------------------------ | ------------------ | ------- |
| GET    | `/api/reports/dashboard` | `REPORT_DASHBOARD` |         |
| GET    | `/api/reports/daily`     | `REPORT_DAILY`     |         |

### Config — Giá & Tỷ giá

| Method | Endpoint                             | Policy               | Ghi chú           |
| ------ | ------------------------------------ | -------------------- | ----------------- |
| GET    | `/api/config/prices`                 | AUTH                 | Xem giá vàng      |
| PUT    | `/api/config/prices`                 | `CONFIG_PRICE`       | Cập nhật giá vàng |
| GET    | `/api/config/exchange-rates`         | AUTH                 | Xem tỷ giá        |
| POST   | `/api/config/exchange-rates`         | `CONFIG_PRICE`       | Cập nhật tỷ giá   |
| GET    | `/api/config/gold-purities`          | AUTH                 |                   |
| POST   | `/api/config/gold-purities`          | `CONFIG_GOLD_PURITY` |                   |
| PUT    | `/api/config/gold-purities/{id}`     | `CONFIG_GOLD_PURITY` |                   |
| GET    | `/api/config/stone-price-rules`      | AUTH                 |                   |
| POST   | `/api/config/stone-price-rules`      | `CONFIG_STONE_PRICE` |                   |
| DELETE | `/api/config/stone-price-rules/{id}` | `CONFIG_STONE_PRICE` |                   |
| GET    | `/api/config/weight-units`           | AUTH                 |                   |
| PUT    | `/api/config/weight-units/{code}`    | `CONFIG_WEIGHT_UNIT` |                   |

### Config — Vai trò & Phân quyền

| Method | Endpoint                                 | Policy        | Ghi chú                                                |
| ------ | ---------------------------------------- | ------------- | ------------------------------------------------------ |
| GET    | `/api/config/roles`                      | `USER_MANAGE` | Danh sách vai trò kèm tập quyền hiện tại               |
| POST   | `/api/config/roles`                      | `USER_MANAGE` | Tạo vai trò mới (mã, tên, mô tả)                       |
| PUT    | `/api/config/roles/{roleId}`             | `USER_MANAGE` | Cập nhật tên và mô tả vai trò                          |
| PUT    | `/api/config/roles/{roleId}/permissions` | `USER_MANAGE` | Thay thế toàn bộ tập quyền của vai trò                 |
| DELETE | `/api/config/roles/{roleId}`             | `USER_MANAGE` | Xóa vai trò — không áp dụng cho vai trò hệ thống       |
| GET    | `/api/config/permissions`                | `USER_MANAGE` | Danh sách tất cả permission khả dụng, nhóm theo module |

### Products

| Method | Endpoint                        | Policy           | Ghi chú |
| ------ | ------------------------------- | ---------------- | ------- |
| GET    | `/api/products`                 | AUTH             |         |
| GET    | `/api/products/{id}`            | AUTH             |         |
| POST   | `/api/products`                 | `PRODUCT_MANAGE` |         |
| PUT    | `/api/products/{id}`            | `PRODUCT_MANAGE` |         |
| DELETE | `/api/products/{id}`            | `PRODUCT_MANAGE` |         |
| GET    | `/api/products/categories`      | AUTH             |         |
| POST   | `/api/products/categories`      | `PRODUCT_MANAGE` |         |
| PUT    | `/api/products/categories/{id}` | `PRODUCT_MANAGE` |         |
| DELETE | `/api/products/categories/{id}` | `PRODUCT_MANAGE` |         |

### Branches & Counters

| Method | Endpoint                      | Policy          | Ghi chú |
| ------ | ----------------------------- | --------------- | ------- |
| GET    | `/api/branches`               | AUTH            |         |
| POST   | `/api/branches`               | `BRANCH_MANAGE` |         |
| PUT    | `/api/branches/{id}`          | `BRANCH_MANAGE` |         |
| DELETE | `/api/branches/{id}`          | `BRANCH_MANAGE` |         |
| GET    | `/api/branches/{id}/counters` | AUTH            |         |
| POST   | `/api/branches/{id}/counters` | `BRANCH_MANAGE` |         |

### Users

| Method | Endpoint                         | Policy        | Ghi chú |
| ------ | -------------------------------- | ------------- | ------- |
| GET    | `/api/users`                     | `USER_MANAGE` |         |
| GET    | `/api/users/{id}`                | `USER_MANAGE` |         |
| POST   | `/api/users`                     | `USER_MANAGE` |         |
| PUT    | `/api/users/{id}`                | `USER_MANAGE` |         |
| PATCH  | `/api/users/{id}/role`           | `USER_MANAGE` |         |
| PATCH  | `/api/users/{id}/counter`        | `USER_MANAGE` |         |
| PATCH  | `/api/users/{id}/activate`       | `USER_MANAGE` |         |
| PATCH  | `/api/users/{id}/deactivate`     | `USER_MANAGE` |         |
| POST   | `/api/users/{id}/reset-password` | `USER_MANAGE` |         |

### Customers

| Method | Endpoint              | Policy | Ghi chú |
| ------ | --------------------- | ------ | ------- |
| GET    | `/api/customers`      | AUTH   |         |
| GET    | `/api/customers/{id}` | AUTH   |         |
| POST   | `/api/customers`      | AUTH   |         |
| PUT    | `/api/customers/{id}` | AUTH   |         |

---

## 5. Luồng đăng nhập & JWT

### Request đăng nhập

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "NV001",
  "password": "Cashier@123"
}
```

> `username` chấp nhận cả `EmployeeCode` lẫn `Username`.

### Response thành công `200 OK`

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "base64string...",
  "userId": "c3d1843f-2047-467d-acc8-15054bdf5328",
  "username": "NV001",
  "fullName": "Nguyễn Văn Nhân Viên",
  "role": "Cashier",
  "permissions": ["TRANSACTION_CREATE", "TRADE_CREATE", "INVENTORY_VIEW"],
  "branchId": "uuid-chi-nhanh"
}
```

### Cấu trúc JWT Access Token (decode payload)

```json
{
  "sub": "c3d1843f-2047-467d-acc8-15054bdf5328",
  "unique_name": "NV001",
  "role_code": "Cashier",
  "permission": "TRANSACTION_CREATE",
  "permission": "TRADE_CREATE",
  "permission": "INVENTORY_VIEW",
  "exp": 1781178456,
  "iss": "Khamphouvong-pos",
  "aud": "Khamphouvong-pos-clients"
}
```

> Mỗi permission là **1 claim riêng** (không phải mảng), backend dùng `User.HasClaim("permission", "TRANSACTION_CREATE")` để kiểm tra.

**Thời hạn:**

- Access token: **8 giờ** (cấu hình qua `Jwt:ExpiryMinutes`)
- Refresh token: **30 ngày** (hard-coded)

### Lỗi đăng nhập

```json
{ "status": 401, "errorCode": "AUTH_INVALID_CREDENTIALS" }
```

---

## 6. Token lifecycle

```
Đăng nhập
  → accessToken (8h) + refreshToken (30 ngày)
          │
          │ [accessToken hết hạn → 401]
          ▼
POST /api/auth/refresh
  Body: { "refreshToken": "..." }
  → accessToken mới + refreshToken mới
  → refreshToken cũ bị revoke
          │
          │ [refreshToken hết hạn hoặc revoked → 401]
          ▼
  Redirect về /login
```

### Request refresh token

```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "base64refreshtoken..."
}
```

Response `200 OK`:

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "newbase64..."
}
```

Lỗi:

```json
{ "status": 401, "errorCode": "AUTH_REFRESH_TOKEN_INVALID" }
```

### Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>

{
  "refreshToken": "..."
}
```

Response `204 No Content`.

---

## 7. Frontend — Lưu trữ & sử dụng

File: `lib/auth.ts`

```typescript
// Keys
const ACCESS_TOKEN_KEY = "pos-access-token";
const REFRESH_TOKEN_KEY = "pos-refresh-token";
const USER_KEY = "pos-user";
const COOKIE_KEY = "pos-token"; // dùng cho middleware Next.js

// Lưu sau khi đăng nhập
export function saveAuth(user: AuthUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, user.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, user.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Cookie cho middleware (max 24h)
  document.cookie = `${COOKIE_KEY}=${user.accessToken}; max-age=86400; path=/`;
}

// Xóa khi logout
export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${COOKIE_KEY}=; max-age=0; path=/`;
}
```

**Axios interceptors** (`lib/api.ts`):

```typescript
// Request: gắn token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pos-access-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: tự refresh khi 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem("pos-refresh-token");
      const { data } = await axios.post("/api/auth/refresh", { refreshToken });
      localStorage.setItem("pos-access-token", data.accessToken);
      localStorage.setItem("pos-refresh-token", data.refreshToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(error.config); // retry request gốc
    }
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

**authStore** (`stores/authStore.ts`):

```typescript
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoaded: false,

  setUser: (user: AuthUser) => {
    saveAuth(user);
    set({ user, isLoaded: true });
  },

  logout: () => {
    clearAuth();
    set({ user: null, isLoaded: true });
  },

  loadFromStorage: () => {
    const raw = localStorage.getItem("pos-user");
    const user = raw ? JSON.parse(raw) : null;
    set({ user, isLoaded: true });
  },
}));
```

**Đăng nhập (ví dụ):**

```typescript
const { data } = await authApi.login({ username, password });
const user: AuthUser = {
  userId: data.userId,
  username: data.username,
  fullName: data.fullName,
  role: data.role,
  permissions: data.permissions,
  branchId: data.branchId,
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
};
useAuthStore.getState().setUser(user);
router.push("/pos");
```

---

## 8. Frontend — Bảo vệ route (middleware)

File: `middleware.ts`

```typescript
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua static files
  if (/_next|favicon|public|api/.test(pathname)) return NextResponse.next();

  const token = request.cookies.get("pos-token")?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Chưa đăng nhập → về login
  if (!token && !isPublic)
    return NextResponse.redirect(new URL("/login", request.url));

  // Đã đăng nhập mà vào /login → về /pos
  if (token && isPublic)
    return NextResponse.redirect(new URL("/pos", request.url));

  return NextResponse.next();
}
```

> Middleware chỉ kiểm tra **có token** hay không (không decode/verify JWT).
> Verify thực sự xảy ra ở backend khi gọi API.

**Bảo vệ theo role ở page level:**

```typescript
// Trong page component
const { user } = useAuthStore();

useEffect(() => {
  if (!user) return;
  // Chỉ Manager/SystemAdmin được vào /config
  if (!["Manager", "SystemAdmin"].includes(user.role)) {
    router.replace("/pos");
  }
}, [user]);
```

---

## 9. Frontend — Hiển thị menu theo role

File: `components/layout/AppSidebar.tsx`

```typescript
const menuItems = [
  { key: "/pos",       label: "Quầy Giao Dịch",     icon: <ShopOutlined /> },
  { key: "/invoices",  label: "Nhật Ký Hóa Đơn",    icon: <FileTextOutlined /> },
  { key: "/inventory", label: "Kho Hàng Hóa",        icon: <InboxOutlined /> },
  { key: "/trade",     label: "Mua Thêm/Đổi Hàng",  icon: <SwapOutlined /> },
  { key: "/ledger",    label: "Sổ Quỹ Thu Chi",      icon: <WalletOutlined /> },
  {
    key: "/dashboard",
    label: "Hội Sở Quản Trị",
    icon: <BarChartOutlined />,
    roles: ["Manager", "SystemAdmin"],    // ← chỉ hiện với role này
  },
  {
    key: "/config",
    label: "Thiết Lập Cấu Hình",
    icon: <SettingOutlined />,
    roles: ["Manager", "SystemAdmin"],
  },
];

// Filter menu
const visibleItems = menuItems.filter(item =>
  !item.roles || (user && item.roles.includes(user.role))
);
```

---

## 10. Frontend — Kiểm tra permission trước khi render nút/action

Dùng `user.permissions[]` để kiểm tra permission cụ thể:

```typescript
// Utility helper
function hasPermission(user: AuthUser | null, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

// Sử dụng trong component
const { user } = useAuthStore();

// Ẩn nút "Duyệt" nếu không có quyền TRANSACTION_APPROVE
{hasPermission(user, "TRANSACTION_APPROVE") && (
  <Button onClick={handleApprove}>Duyệt đơn</Button>
)}

// Ẩn tab "Cấu hình giá" nếu không có CONFIG_PRICE
{hasPermission(user, "CONFIG_PRICE") && (
  <Tab key="prices">Cấu hình giá</Tab>
)}

// Ẩn nút xóa sản phẩm
{hasPermission(user, "PRODUCT_MANAGE") && (
  <Button danger onClick={handleDelete}>Xóa</Button>
)}
```

**Bảng gợi ý — Nút/Action nên kiểm tra quyền gì:**

| Action trong UI                       | Permission cần kiểm tra |
| ------------------------------------- | ----------------------- |
| Nút "Duyệt / Từ chối" giao dịch       | `TRANSACTION_APPROVE`   |
| Xem danh sách GD của tất cả nhân viên | `TRANSACTION_VIEW_ALL`  |
| Nút "Xuất Excel" danh sách GD         | `REPORT_DASHBOARD`      |
| Nút "Tạo đơn Trade"                   | `TRADE_CREATE`          |
| Nút "Duyệt Trade"                     | `TRADE_APPROVE`         |
| Nút "Điều chỉnh kho"                  | `INVENTORY_MANAGE`      |
| Toàn bộ màn hình Sổ Quỹ               | `CASH_LEDGER_MANAGE`    |
| Nút "Cập nhật giá vàng / tỷ giá"      | `CONFIG_PRICE`          |
| Nút "Thêm / Sửa sản phẩm"             | `PRODUCT_MANAGE`        |
| Màn hình Quản lý chi nhánh            | `BRANCH_MANAGE`         |
| Màn hình Quản lý người dùng           | `USER_MANAGE`           |

---

## 11. API Reference đầy đủ

### `POST /api/auth/login`

Request:

```json
{ "username": "NV001", "password": "Cashier@123" }
```

Response `200`:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "base64...",
  "userId": "uuid",
  "username": "NV001",
  "fullName": "Nguyễn Văn A",
  "role": "Cashier",
  "permissions": ["TRANSACTION_CREATE", "TRADE_CREATE", "INVENTORY_VIEW"],
  "branchId": "uuid"
}
```

Lỗi: `AUTH_INVALID_CREDENTIALS` 401

---

### `POST /api/auth/refresh`

Request:

```json
{ "refreshToken": "base64refreshtoken" }
```

Response `200`:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "newbase64..."
}
```

Lỗi: `AUTH_REFRESH_TOKEN_INVALID` 401

---

### `POST /api/auth/logout`

Header: `Authorization: Bearer <token>`

Request:

```json
{ "refreshToken": "base64refreshtoken" }
```

Response: `204 No Content`

---

### `GET /api/auth/me`

Header: `Authorization: Bearer <token>`

Response `200`:

```json
{
  "userId": "uuid",
  "username": "NV001",
  "fullName": "Nguyễn Văn A",
  "role": "Cashier",
  "permissions": ["TRANSACTION_CREATE", "TRADE_CREATE", "INVENTORY_VIEW"],
  "branchId": "uuid"
}
```

---

## 12. TypeScript interfaces

```typescript
// types/index.ts

export type UserRole = "Cashier" | "ThuQuy" | "Manager" | "SystemAdmin";

export type Permission =
  | "TRANSACTION_CREATE"
  | "TRANSACTION_APPROVE"
  | "TRANSACTION_VIEW_ALL"
  | "TRADE_CREATE"
  | "TRADE_APPROVE"
  | "INVENTORY_VIEW"
  | "INVENTORY_MANAGE"
  | "CASH_LEDGER_MANAGE"
  | "REPORT_DASHBOARD"
  | "REPORT_DAILY"
  | "CONFIG_PRICE"
  | "CONFIG_WEIGHT_UNIT"
  | "CONFIG_STONE_PRICE"
  | "CONFIG_GOLD_PURITY"
  | "PRODUCT_MANAGE"
  | "BRANCH_MANAGE"
  | "USER_MANAGE";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  branchId: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  branchId: string;
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUserResponse {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  branchId: string;
}
```

---

## 13. Mã lỗi & xử lý

| Mã lỗi                       | HTTP | Nguyên nhân                   | Xử lý FE                                     |
| ---------------------------- | ---- | ----------------------------- | -------------------------------------------- |
| `AUTH_INVALID_CREDENTIALS`   | 401  | Sai username/password         | Hiện lỗi tại form                            |
| `AUTH_TOKEN_EXPIRED`         | 401  | Access token hết hạn          | Axios tự refresh                             |
| `AUTH_REFRESH_TOKEN_INVALID` | 401  | Refresh token hết hạn/revoked | Redirect `/login`                            |
| `AUTH_FORBIDDEN`             | 403  | Không có permission           | Hiện thông báo "Không có quyền"              |
| `USER_NOT_FOUND`             | 404  | User bị xóa sau khi đăng nhập | Logout, redirect `/login`                    |
| `USER_INACTIVE`              | 401  | Tài khoản bị khóa             | Hiện thông báo "Tài khoản đã bị vô hiệu hóa" |

**Xử lý 403 trong component:**

```typescript
import { extractErrorCode } from "@/lib/errors";

try {
  await transactionApi.approve(id);
} catch (err) {
  const code = extractErrorCode(err);
  if (code === "AUTH_FORBIDDEN") {
    message.error("Bạn không có quyền thực hiện thao tác này.");
  }
}
```

---

## Tài khoản demo

| EmployeeCode | Password      | Role        |
| ------------ | ------------- | ----------- |
| `ADMIN001`   | `Admin@123`   | SystemAdmin |
| `QL001`      | `Manager@123` | Manager     |
| `TQ001`      | `ThuQuy@123`  | ThuQuy      |
| `NV001`      | `Cashier@123` | Cashier     |
