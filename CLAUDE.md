# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# POS System — Rules cho AI

Project: **FoxAI POS · Khamphuvong Jewelry**  
Stack: Next.js 16 (frontend) · ASP.NET Core 9 (backend) · Ant Design + Tailwind CSS · TanStack Query · Zustand · TypeScript strict

---

## Commands

```bash
# Development
npm run dev          # Next.js dev server → http://localhost:3000

# Build & type check
npm run build        # Production build (also validates types)
npx tsc --noEmit     # Type check only, no emit

# Lint
npm run lint         # ESLint (eslint.config.mjs)

```

**Backend**: ASP.NET Core chạy riêng. Set env var `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000` (hoặc để mặc định). `next.config.ts` rewrite `/api/*` → backend, nên mọi `axios.get('/api/...')` trong code tự đến đúng chỗ.

> **Next.js 16**: Có breaking changes so với Next.js 13-15. Đọc `node_modules/next/dist/docs/` trước khi dùng API không quen.

---

## Kiến trúc tổng quan

```
src/
├── app/
│   ├── (client)/pos/        ← POS terminal full-screen (Cashier/ThuQuy)
│   └── (admin)/admin/       ← Admin panel với sidebar (Manager/SystemAdmin)
│       ├── orders, inventory, cash-ledger, dashboard
│       ├── config, products, users, branches, reports, trade
│
├── components/pos/          ← POS UI: TransactionTable, PaymentPanel, PaymentModal...
├── components/ui/           ← Thin antd wrapper components (Button, Dialog, Badge...)
│
├── hooks/                   ← Boundary layer: component → hooks → lib
│   ├── usePos.ts            ← Facade duy nhất của POS page (entry point)
│   ├── useActiveTab.ts      ← Đọc state tab đang active (computed values)
│   ├── useCheckout.ts       ← useMutation thanh toán, nhận PaymentStrategy
│   └── useCart.ts / useCartInvoker.ts ← Command pattern cho giỏ hàng
│
├── lib/
│   ├── repositories/        ← Mọi HTTP call đi qua đây (R-ARCH-1)
│   ├── strategies/          ← PaymentStrategy interface + 4 impl (cash/bank/combined/qr)
│   ├── commands/cart.command.ts ← AddItem/Remove/UpdateQty/ClearCart với undo()
│   ├── pricing.ts           ← Pure functions tính giá (lineTotal, calcTotal...)
│   └── axios.ts             ← Axios singleton với JWT interceptor + auto-refresh
│
├── stores/
│   ├── invoice-tab.store.ts ← Multi-tab POS state (Zustand persist)
│   ├── auth.store.ts        ← AuthUser + token (Zustand)
│   └── cart.store.ts        ← CartStore primitives (dùng qua CartCommand)
│
└── types/
    ├── auth.ts              ← UserRole = 'Cashier'|'ThuQuy'|'Manager'|'SystemAdmin'
    ├── cart.ts              ← CartItem + lineTotal()
    ├── config.ts            ← PriceConfig, PriceItem (gramPerUnit), ExchangeRate
    └── transaction.ts       ← TransactionType, PaymentMethod enums
```

**Luồng dữ liệu POS:**
```
PosPage (orchestrate only)
  → usePos() facade
      → useActiveTab()   ← đọc invoice-tab.store (active tab)
      → useCart()        ← CartCommandInvoker wrapping CartStore
      → useCheckout()    ← useMutation → transactionRepository.create()
      → useProducts()    ← useQuery → productRepository.getAll()
      → usePriceConfig() ← useQuery, staleTime 60s → dùng snapshot giá
```

**Luồng ExchangeCurrency (khác các nghiệp vụ khác):**
- Không thêm item vào cart thực, không mở PaymentModal
- `CurrencyExchangeForm` → `setFxData()` → store (fxFromAmount, fxToAmount, fxLakAmount)
- `handleDirectCheckout` → `useCheckout` tự build 1 synthetic item khi submit

---

## Mục lục

1. [Stack](#stack)
2. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
3. [Nghiệp vụ & Domain](#nghiệp-vụ--domain)
4. [Vai trò & Phân quyền](#vai-trò--phân-quyền)
5. [Loại giao dịch & Trạng thái](#loại-giao-dịch--trạng-thái)
6. [Công thức tính giá](#công-thức-tính-giá)
7. [Mô hình dữ liệu](#mô-hình-dữ-liệu)
8. [Backend API Contract](#backend-api-contract)
9. [Ràng buộc nghiệp vụ](#ràng-buộc-nghiệp-vụ)
10. [Rules — Architecture](#rules--architecture)
11. [Rules — UI Components](#rules--ui-components)
12. [Rules — Invoice Tab Manager](#rules--invoice-tab-manager)
13. [Rules — i18n](#rules--i18n)
14. [Anti-patterns](#anti-patterns)
15. [Keyboard shortcuts](#keyboard-shortcuts)

---

## Stack

| Layer | Công nghệ |
|---|---|
| Frontend framework | Next.js App Router (`src/` dir) |
| Backend API | **ASP.NET Core 9.0** — tại `/api/*` (proxy qua Nginx) |
| Database | PostgreSQL 16 — database: `pos_main` |
| UI | **Ant Design** (`antd`) + Tailwind CSS — icons từ `@ant-design/icons` |
| Wrapper components | `src/components/ui/` — thin wrappers quanh antd, API tương thích shadcn |
| Màu theme | Indigo oklch (H≈268) — xem `globals.css` |
| Server State | TanStack Query v5 |
| HTTP Client | Axios (chỉ trong `src/lib/repositories/`) |
| Client State | Zustand (persist middleware) |
| Tables | Ant Design `<Table />` (`antd`) |
| Forms | React Hook Form + Zod |
| Thông báo | antd `message` (import từ `@/lib/toast` — `toast.success()`, `toast.error()`) |
| Animation | Motion (`motion`) |
| Language | TypeScript strict — không dùng `any` |

> **Quan trọng**: `src/app/api/` là **mock data tạm thời** cho dev. Không thêm business logic vào route handlers. Trong production, mọi API call đi thẳng đến backend ASP.NET Core.

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (client)/                   ← POS terminal (full-screen, không nav)
│   │   ├── layout.tsx              ← đăng ký keyboard shortcuts ở đây
│   │   └── pos/page.tsx            ← chỉ gọi usePos(), render component
│   ├── (admin)/                    ← Admin panel (có sidebar)
│   │   ├── layout.tsx
│   │   └── admin/{dashboard,products,orders}/page.tsx
│   └── api/                        ← Mock route handlers (chỉ dev)
├── components/
│   ├── ui/                         ← shadcn/ui components (generate bằng CLI)
│   └── pos/
│       ├── DataTable.tsx           ← Generic TanStack Table reusable
│       ├── columns/                ← Column definitions tách riêng theo entity
│       │   ├── product-columns.tsx
│       │   └── order-columns.tsx
│       ├── PosTopBar.tsx           ← Thanh tiêu đề + ProductSearch (F3) + tabs
│       ├── TransactionTable.tsx    ← Bảng giao dịch chính (scrollable)
│       ├── PaymentPanel.tsx        ← Panel thanh toán bên phải
│       ├── PaymentModal.tsx        ← Modal hoàn tất thanh toán
│       └── Receipt.tsx             ← In chứng từ
├── hooks/
│   ├── usePos.ts                   ← Facade — entry point duy nhất cho POS page
│   ├── useProducts.ts              ← Observer / TanStack Query
│   ├── useCart.ts                  ← Optimistic Update
│   ├── useCartInvoker.ts           ← Command invoker
│   ├── useCheckout.ts              ← Strategy consumer
│   ├── useCoupon.ts
│   ├── useActiveTab.ts             ← Computed active tab state
│   └── useInvoiceTabShortcuts.ts
├── lib/
│   ├── axios.ts                    ← Axios instance singleton (JWT interceptor)
│   ├── errors.ts                   ← Map errorCode → message (lo/vi/en)
│   ├── pricing.ts                  ← Công thức tính giá (pure functions)
│   ├── repositories/               ← Repository Pattern
│   ├── commands/                   ← Command Pattern
│   └── strategies/                 ← Strategy Pattern
├── stores/
│   └── invoice-tab.store.ts        ← Zustand (multi-tab POS system)
└── types/
    ├── product.ts
    ├── transaction.ts              ← TransactionType, TransactionStatus enums
    ├── cart.ts
    └── invoice-tab.ts
```

---

## Nghiệp vụ & Domain

### Tổng quan

**Khamphuvong POS** là hệ thống bán hàng cho chuỗi cửa hàng kinh doanh **vàng, bạc và ngoại tệ** tại Vientiane, Lào. Mô hình: nhiều chi nhánh — 1 hội sở quản trị trung tâm.

| Thông số | Giá trị |
|---|---|
| Đơn vị tiền tệ chính | Kip Lào (₭ / LAK) |
| Đơn vị tiền tệ phụ | Baht Thái (THB), USD |
| Đơn vị trọng lượng vàng | Chỉ (1 chỉ = 3,75g), Baht, Phân, Gram |
| Tuổi vàng phổ biến | 9999 (vàng ròng), 750 |
| Nguồn giá vàng | **Pisico** — cập nhật theo giờ |
| Ngôn ngữ chính | Lào (`lo`), phụ: tiếng Việt (`vi`), tiếng Anh (`en`) |

### Các module hệ thống

| Module | Route frontend | Mô tả |
|---|---|---|
| Quầy Giao Dịch | `/(client)/pos` | Lập đơn, thanh toán tại quầy |
| Nhật Ký Hóa Đơn | `/(admin)/admin/orders` | Tra cứu, xem lại, in chứng từ |
| Kho Hàng Hóa | `/(admin)/admin/inventory` | Tồn kho theo chi nhánh/tủ |
| Sổ Quỹ Thu Chi | `/(admin)/admin/cash-ledger` | Theo dõi dòng tiền ngày |
| Hội Sở Quản Trị | `/(admin)/admin/dashboard` | KPI, duyệt GD, xếp hạng nhánh |
| Thiết Lập Cấu Hình | `/(admin)/admin/settings` | Bảng giá, tỷ giá ngoại tệ |

---

## Vai trò & Phân quyền

`UserRole` trong code (`src/types/auth.ts`): `'Cashier' | 'ThuQuy' | 'Manager' | 'SystemAdmin'`

### Các vai trò

| Role code | Tên | Phạm vi |
|---|---|---|
| `Cashier` | Nhân viên bán hàng | Tạo GD, in chứng từ, xem kho |
| `ThuQuy` | Thủ quỹ | Mở/chốt quỹ, kiểm đếm tiền, ghi thu–chi, báo cáo ngày |
| `Manager` | Quản lý / Chủ cửa hàng | Duyệt GD, cấu hình giá/tỷ giá, quản lý kho & sản phẩm, báo cáo |
| `SystemAdmin` | Quản trị hệ thống | Toàn quyền: quản lý user, chi nhánh, cấu hình hệ thống |

### Ma trận permission (17 permissions)

Permission được trả về trong JWT claim và `user.permissions[]`. Dùng `user.permissions.includes('...')` để kiểm tra.

| Permission | Cashier | ThuQuy | Manager | SystemAdmin |
|---|:---:|:---:|:---:|:---:|
| `TRANSACTION_CREATE` | ✓ | ✓ | ✓ | ✓ |
| `TRANSACTION_APPROVE` | | | ✓ | ✓ |
| `TRANSACTION_VIEW_ALL` | | | ✓ | ✓ |
| `TRADE_CREATE` | ✓ | | ✓ | ✓ |
| `TRADE_APPROVE` | | | ✓ | ✓ |
| `INVENTORY_VIEW` | ✓ | ✓ | ✓ | ✓ |
| `INVENTORY_MANAGE` | | | ✓ | ✓ |
| `CASH_LEDGER_MANAGE` | | ✓ | ✓ | ✓ |
| `REPORT_DAILY` | | ✓ | ✓ | ✓ |
| `REPORT_DASHBOARD` | | | ✓ | ✓ |
| `CONFIG_PRICE` | | | ✓ | ✓ |
| `CONFIG_WEIGHT_UNIT` | | | ✓ | ✓ |
| `CONFIG_STONE_PRICE` | | | ✓ | ✓ |
| `CONFIG_GOLD_PURITY` | | | ✓ | ✓ |
| `PRODUCT_MANAGE` | | | ✓ | ✓ |
| `BRANCH_MANAGE` | | | | ✓ |
| `USER_MANAGE` | | | | ✓ |

> Frontend phải ẩn/disable UI theo permission. Backend xác thực lại bằng Policy per endpoint.

---

## Loại giao dịch & Trạng thái

### `TransactionType` — Loại nghiệp vụ

| Enum | Tên UI | Mô tả |
|---|---|---|
| `SELL_GOLD` | Bán Vàng | Khách mua vàng, thu Kip |
| `SELL_SILVER` | Bán Bạc | Khách mua bạc, thu Kip |
| `BUY_GOLD` | Mua Vàng | Cửa hàng thu mua vàng từ khách, chi Kip |
| `TRADE_UP` | Mua Thêm | Vàng cũ → sản phẩm mới cao hơn, khách trả phần chênh lệch |
| `EXCHANGE_GOLD` | Đổi Hàng | Vàng cũ → vàng mới cùng hoặc khác loại |
| `PARTIAL_REDEMPTION` | Đổi Thành Tiền | Một phần vàng → tiền mặt, phần còn lại → sản phẩm mới |
| `EXCHANGE_CURRENCY` | Thu Đổi Ngoại Tệ | THB/USD → Kip Lào theo tỷ giá |

### `TransactionStatus` — Trạng thái

```
DRAFT → PENDING → APPROVED → COMPLETED
                └→ REJECTED
```

| Status | Mô tả | Có thể sửa? |
|---|---|---|
| `DRAFT` | Đang soạn, chưa xác nhận | Có |
| `PENDING` | Chờ duyệt (vượt hạn mức hoặc liên nhánh) | Không |
| `APPROVED` | Đã được duyệt, chờ hoàn tất | Không |
| `REJECTED` | Bị từ chối | Không |
| `COMPLETED` | Hoàn tất, đã in chứng từ | **KHÔNG — chỉ tạo đảo phiếu** |

### `PaymentMethod`

| Enum | Mô tả |
|---|---|
| `CASH` | Tiền mặt |
| `BANK` | Chuyển khoản |
| `MIXED` | Kết hợp tiền mặt + chuyển khoản |

---

## Công thức tính giá

> Các hàm tính giá phải đặt trong `src/lib/pricing.ts` (pure functions, testable).  
> **Dùng `number` integer (LAK) — KHÔNG dùng `float` cho tiền tệ.**

### Bán vàng (`SELL_GOLD`)

```ts
// Tính từng dòng hàng
lineTotal = weight_chi * goldSellPrice // ₭/chỉ

// Tổng đơn
subtotal = sum(lineTotal mỗi dòng)
total    = subtotal + laborFee + stoneFee
```

### Mua vàng (`BUY_GOLD`)

```ts
total = weight_chi * goldBuyPrice
// Không có laborFee hay stoneFee khi mua vào
```

### Phí đá đính kèm (`stoneFee`)

Phụ thuộc **trọng lượng vàng mua** — tra bảng định mức:

| Trọng lượng vàng | Ví dụ phí đá |
|---|---|
| 1 chỉ | 500.000 ₭ |
| 2 chỉ | 700.000 ₭ |
| 3 chỉ trở lên | Tăng theo bậc |

> Nhân viên nhập tay khi lập đơn. Hệ thống chỉ gợi ý, không tự tính.

### Phí gia công thợ (`laborFee`)

Do nhân viên tự báo theo từng thợ. **Nhập tay bắt buộc**, không có công thức.

### Bán bạc (`SELL_SILVER`)

```ts
total = weight_gram * silverPricePerGram
```

### Mua thêm / Trade-up (`TRADE_UP`)

```ts
// Định giá vàng cũ theo giá BÁN RA (không phải mua vào)
oldGoldValue  = oldWeight * goldSellPrice
newProductVal = newWeight * goldSellPrice + stoneFee + laborFee
wasteAmount   = wasteWeight * goldSellPrice   // hao hụt trọng lượng (nếu có)

customerPays  = newProductVal - oldGoldValue + damageFee + wasteAmount
// damageFee: phí hư hại do nhân viên quy định
```

> Chỉ áp dụng cho **vàng của Khamphuvong**. Vàng ngoài → BUY_GOLD trước, SELL_GOLD sau.

### Đổi hàng (`EXCHANGE_GOLD`)

```ts
// Nếu đổi sang loại khác (ví dụ: nhẫn → vòng có đá)
customerPays = newStoneFee + newLaborFee
             + damageFee + wasteAmount
             - oldStoneFee  // nếu cửa hàng miễn theo chính sách

// Đổi miễn phí khi: vàng Khamphuvong + ≤30 ngày + không hư + cùng giá trị
```

### Đổi thành tiền (`PARTIAL_REDEMPTION`)

```ts
// Phần A: đổi thành tiền — dùng giá MUA VÀO
cashPartValue = weightA * goldBuyPrice

// Tiền khách thực nhận
customerReceives = cashPartValue - newStoneFee - newLaborFee - damageFee
// Đồng thời khách nhận sản phẩm mới tương ứng phần B
```

### Thu đổi ngoại tệ (`EXCHANGE_CURRENCY`)

```ts
amountLAK = foreignAmount * (exchangeRate + adjustment)
```

### Lãi gộp tạm tính

```ts
grossProfit = (goldRevenue + stoneFee + laborFee) - (weight * goldBuyPrice)
// Chưa trừ chi phí vận hành
```

---

## Mô hình dữ liệu

Tên TypeScript types phải khớp với entity backend. Field: `camelCase`.

### Entities chính

```ts
// BRANCH
interface Branch {
  id: string
  name: string
  address: string
  city: string
  isHeadquarters: boolean
}

// USER
interface User {
  id: string
  employeeCode: string
  fullName: string
  phone: string
  branchId: string
  role: 'CASHIER' | 'BRANCH_MANAGER' | 'HQ_ADMIN' | 'SYSTEM_ADMIN'
  isActive: boolean
}

// COUNTER (Tủ/Khay trưng bày)
interface Counter {
  id: string
  branchId: string
  counterName: string   // "Tủ 1", "Tủ 2"
  isActive: boolean
}

// PRODUCT
interface Product {
  id: string
  productCode: string
  productName: string
  category: string      // "Nhẫn", "Vòng", "Lắc", "Đồng tiền", "Bạc Mỹ nghệ"
  purity: string        // "9999", "750", ...
  unit: 'chi' | 'gram' | 'baht'
  weightPerUnit: number // gram/unit
}

// TRANSACTION
interface Transaction {
  id: string
  invoiceCode: string
  transactionType: TransactionType
  branchId: string
  cashierId: string
  staffId: string
  counterId: string
  status: TransactionStatus
  subtotalAmount: number   // integer LAK
  laborFee: number         // Phí gia công
  stoneFee: number         // Phí đá đính kèm
  totalAmount: number      // Tổng phải thu/chi
  currency: 'LAK' | 'THB' | 'USD'
  exchangeRate: number     // Tỷ giá snapshot tại thời điểm GD
  paymentMethod: 'CASH' | 'BANK' | 'MIXED'
  note: string
  transactedAt: string     // ISO 8601
  approvedAt: string | null
  approvedBy: string | null
}

// TRANSACTION_ITEM
interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  productSnapshotName: string  // Tên tại thời điểm GD (không đổi theo SP)
  quantity: number
  weight: number               // chỉ
  unitPrice: number            // Giá snapshot tại thời điểm GD — bắt buộc
  lineTotal: number
}

// PRICE_CONFIG — mỗi cập nhật tạo bản ghi mới, KHÔNG ghi đè
interface PriceConfig {
  id: string
  goldPricePerChi: number       // Giá vàng 9999 / chỉ (₭)
  goldBuyPricePerChi: number    // Giá mua vào / chỉ (₭)
  silverPricePerGram: number    // Giá bạc / gram (₭)
  updatedBy: string
  updatedAt: string
  effectiveFrom: string         // ISO 8601
}

// EXCHANGE_RATE — tỷ giá ngoại tệ
interface ExchangeRate {
  id: string
  currencyCode: 'THB' | 'USD' | string
  rateToLak: number        // 1 ngoại tệ = X LAK
  adjustmentAmount: number // Spread cộng thêm
  updatedBy: string
  updatedAt: string
  effectiveFrom: string
}

// INVENTORY
interface Inventory {
  id: string
  branchId: string
  productId: string
  quantityOnHand: number
  weightOnHand: number    // chỉ
  lastUpdatedAt: string
}

// CASH_LEDGER
interface CashLedger {
  id: string
  branchId: string
  transactionId: string | null
  entryType: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  entryDate: string
}
```

---

## Backend API Contract

### Base URL & Routing

```
[Browser] → Nginx :443
  /api/*  → ASP.NET Core :5000
  /*      → Next.js :3000 (static)
```

### Xác thực

```http
Authorization: Bearer <access_token>
```

- JWT Bearer — session timeout 8 giờ
- Refresh: `POST /api/auth/refresh` với `{ refreshToken }`
- Axios interceptor tự đính token (trong `src/lib/axios.ts`)

### Cấu trúc Response lỗi (RFC 7807 mở rộng)

Backend **KHÔNG trả text ngôn ngữ tự nhiên**. Chỉ trả `errorCode` dạng `SCREAMING_SNAKE_CASE`.  
Frontend map `errorCode → text` trong `src/lib/errors.ts`.

```json
// Lỗi đơn
{ "status": 401, "errorCode": "AUTH_INVALID_CREDENTIALS" }

// Lỗi validation (nhiều field)
{
  "status": 422,
  "errorCode": "VALIDATION_FAILED",
  "errors": {
    "weight": ["Trọng lượng phải lớn hơn 0"],
    "items": ["Phải có ít nhất 1 mặt hàng"]
  }
}
```

### Danh sách mã lỗi chuẩn

| Nhóm | Mã lỗi | HTTP | Khi nào |
|---|---|---|---|
| **AUTH** | `AUTH_INVALID_CREDENTIALS` | 401 | Sai mã NV hoặc mật khẩu |
| | `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn |
| | `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token không hợp lệ |
| | `AUTH_FORBIDDEN` | 403 | Không đủ quyền |
| | `AUTH_ACCOUNT_INACTIVE` | 403 | Tài khoản bị vô hiệu hóa |
| **TRANSACTION** | `TRANSACTION_NOT_FOUND` | 404 | Không tìm thấy GD |
| | `TRANSACTION_ALREADY_COMPLETED` | 422 | GD đã hoàn tất, không sửa được |
| | `TRANSACTION_INVALID_STATUS` | 422 | Trạng thái không hợp lệ |
| | `TRANSACTION_APPROVAL_REQUIRED` | 422 | GD cần duyệt trước khi hoàn tất |
| **CONFIG** | `CONFIG_PRICE_NOT_FOUND` | 404 | Chưa có bảng giá |
| | `CONFIG_RATE_NOT_FOUND` | 404 | Không có tỷ giá cho loại ngoại tệ |
| **INVENTORY** | `INVENTORY_NOT_FOUND` | 404 | Không tìm thấy tồn kho |
| | `INVENTORY_INSUFFICIENT_STOCK` | 422 | Không đủ hàng để xuất |
| **VALIDATION** | `VALIDATION_FAILED` | 422 | Dữ liệu không hợp lệ (kèm `errors`) |
| **RESOURCE** | `RESOURCE_NOT_FOUND` | 404 | Tài nguyên không tồn tại |
| **SYSTEM** | `SYSTEM_INTERNAL_ERROR` | 500 | Lỗi nội bộ |

### Quy tắc xử lý lỗi trong Repository

```ts
// ✅ Đúng — throw ApiError với errorCode
catch (err) {
  if (axios.isAxiosError(err)) {
    throw new ApiError(err.response?.data?.errorCode ?? 'SYSTEM_INTERNAL_ERROR')
  }
  throw err
}

// ❌ Sai — hiện message từ backend hay hardcode text
toast.error(err.response.data.message)
toast.error('Không tìm thấy giao dịch')
```

### Quy tắc gọi API cho giá

```ts
// ✅ Luôn load giá khi mở form lập đơn
const { data: priceConfig } = useQuery({
  queryKey: ['price-config', 'current'],
  queryFn: () => PriceConfigRepository.getCurrent(),
  staleTime: 60_000, // Cache 1 phút — giá cập nhật theo giờ
})

// ✅ Snapshot giá vào TransactionItem trước khi submit
item.unitPrice = priceConfig.goldPricePerChi
// Không để backend tự lookup — giá thay đổi trong khi user đang lập đơn
```

---

## Ràng buộc nghiệp vụ

> Enforce ở **cả UI (disable/hide)** lẫn **backend (HTTP 422)**. Không chỉ validate một phía.

| Ràng buộc | Mô tả | Xử lý |
|---|---|---|
| GD COMPLETED không sửa | Giao dịch `COMPLETED` là bất biến | UI: ẩn nút edit; Backend: 422 `TRANSACTION_ALREADY_COMPLETED` |
| Snapshot giá bắt buộc | `unitPrice` trong `TransactionItem` phải lưu giá tại thời điểm GD | Frontend gán trước khi submit |
| Price versioning | Mỗi cập nhật giá → bản ghi mới (`effectiveFrom`), không ghi đè | Chỉ cập nhật qua `POST /api/config/prices` |
| Vàng ngoài | TRADE_UP/EXCHANGE_GOLD chỉ dùng cho vàng Khamphuvong | UI: hiển thị cảnh báo; Backend: validate |
| Phí gia công tự báo | Không auto-calculate — nhân viên nhập tay | Input số, không readonly |
| Đổi miễn phí ≤30 ngày | Kiểm tra `transactedAt` của GD gốc | Frontend tính, backend xác thực |
| Phê duyệt vượt hạn mức | GD > ngưỡng giá trị → status `PENDING` tự động | Backend xử lý, frontend hiển thị badge PENDING |
| GD liên chi nhánh | → `PENDING`, chờ HQ_ADMIN duyệt | Tương tự trên |
| Không xóa GD | Chỉ tạo giao dịch đảo phiếu mới (có `linkedTransactionId`) | Không có nút Delete trong Invoice Journal |
| Thay đổi giá phải audit | Lưu: ai thay đổi, khi nào, giá cũ/mới | Tự động qua `updatedBy + updatedAt` |

---

## Rules — Architecture

### R-ARCH-1 · Repository cho mọi HTTP call

KHÔNG gọi `axios` trực tiếp trong component hay hook UI.  
Mọi HTTP call phải nằm trong class Repository ở `src/lib/repositories/`.

```
✅ TransactionRepository.create(dto)   ← trong hooks/useCheckout.ts
❌ axios.post('/api/transactions')     ← trong component/hook UI
```

### R-ARCH-2 · TanStack Query cho server state

KHÔNG dùng `useEffect + useState` để fetch data.  
Mọi read → `useQuery`. Mọi write → `useMutation`.  
`staleTime` phải set rõ ràng (không để mặc định 0).

| Data | staleTime gợi ý |
|---|---|
| Giá vàng hiện tại | `60_000` (1 phút — giá cập nhật theo giờ) |
| Danh sách sản phẩm | `300_000` (5 phút) |
| Nhật ký giao dịch | `30_000` (30 giây) |
| Tỷ giá ngoại tệ | `60_000` (1 phút) |

### R-ARCH-3 · PaymentStrategy cho thanh toán

KHÔNG viết logic thanh toán trong component.  
Mọi payment đi qua interface `PaymentStrategy` → `useCheckout(strategy, method)`.  
Thêm phương thức mới = tạo file strategy mới, không sửa `CheckoutService`.

### R-ARCH-4 · InvoiceTabStore cho cart

KHÔNG mutate cart state trực tiếp từ component.  
Dùng actions từ `useInvoiceTabStore()` hoặc đọc qua `useActiveTab()`.

### R-ARCH-5 · Hooks làm boundary với lib/

KHÔNG import từ `src/lib/` trong component files.  
Component → hooks → lib. Không bỏ qua tầng hook.

### R-ARCH-6 · TypeScript strict

Mọi API response phải có TypeScript type rõ ràng.  
Không dùng `any`, `unknown` không justified, hay `as` ép kiểu.

### R-ARCH-7 · Optimistic update phải có rollback

Mọi `useMutation` dùng optimistic update phải có `onMutate` snapshot  
và `onError` restore. Không được bỏ `onError`.

### R-ARCH-8 · queryKey chuẩn

`queryKey` phải là array, đủ granular để cache chính xác.

```ts
// ✅
['transactions']
['transactions', { branchId, status, date }]
['inventory', branchId]
['price-config', 'current']
['exchange-rates', 'THB']

// ❌
['data']
['transaction']  // thiếu số nhiều
```

### R-ARCH-9 · Component ≤ 150 dòng

Nếu component vượt 150 dòng, tách ra sub-component.  
Không truyền quá 3 props — nếu hơn, dùng Context hoặc đọc từ hook.

### R-ARCH-10 · Giá tiền là integer LAK

Mọi giá trị tiền tệ trong TypeScript phải là `number` nguyên (LAK).  
KHÔNG dùng `float` hay `string` cho tiền.

```ts
// ✅
const total: number = Math.round(weight * goldSellPrice)

// ❌
const total = 0.1 + 0.2  // sai số float
const total = '9,800,000' // string
```

### R-ARCH-11 · Logic giá trong src/lib/pricing.ts

Tất cả công thức tính tiền (bán vàng, mua vàng, trade-up...) phải là pure functions trong `src/lib/pricing.ts`.  
KHÔNG viết logic tính giá trực tiếp trong component hay hook.

```ts
// ✅
import { calculateSellGold } from '@/lib/pricing'
const total = calculateSellGold({ weight, goldSellPrice, laborFee, stoneFee })

// ❌
const total = weight * goldSellPrice + laborFee + stoneFee // trong component
```

---

## Rules — UI Components

### R-UI-1 · Ưu tiên thứ tự chọn component

**PHẢI** duyệt qua theo thứ tự này trước khi viết bất kỳ UI nào:

```
1. Wrapper components   → src/components/ui/  (Button, Dialog, Badge, Input, Select...)
   antd trực tiếp       → antd Table, Modal, Form, Tooltip, Tabs... khi wrapper chưa có

2. antd thuần           → import trực tiếp từ 'antd'
   Icons                → import từ '@ant-design/icons'

3. Tự viết              → src/components/pos/ hoặc src/components/admin/  (KHÔNG phải ui/)
```

#### Wrapper components có sẵn (`@/components/ui/`)

`button` · `input` · `dialog` · `badge` · `checkbox` · `card` · `select` · `separator` · `skeleton` · `label` · `textarea` · `table` · `dropdown-menu` · `field` · `empty` · `input-group` · `spinner` · `number-input` · `popover`

Tất cả wrapper đều là thin wrappers quanh antd — có thể edit trực tiếp trong `src/components/ui/`.

### R-UI-2 · Ant Design Table cho mọi bảng dữ liệu

## UI Table

- Dùng `<Table />` từ `antd` cho mọi table admin trong project — thông qua wrapper `<DataTable>` tại `src/components/shared/DataTable.tsx`
- **KHÔNG dùng** `@tanstack/react-table` — đã migrate hoàn toàn sang antd
- Columns theo `TableColumnsType<T>` từ `antd`: `{ title, dataIndex, key, render? }`
- Luôn set `rowKey` (mặc định `'id'`), pagination mặc định `pageSize=10` có `showSizeChanger`
- **KHÔNG import** `flexRender`, `useReactTable`, `getCoreRowModel`, `ColumnDef` từ `@tanstack/react-table`
- Column files tại `src/components/admin/columns/` — mỗi file export factory function `createXxxColumns(labels, ...callbacks)`
- Server-side pagination dùng prop `serverPagination` của `<DataTable>`

> **Exception được phép**: `TransactionTable.tsx` dùng `<table>` HTML compact vì layout POS cần density cao. Không áp dụng DataTable ở đây.

### R-UI-3 · Không tự viết dropdown/menu

KHÔNG dùng `useState + absolute div` cho dropdown/menu.  
Dùng `DropdownMenu` từ `@/components/ui/dropdown-menu` hoặc antd `Dropdown`.

> **Exception được phép**: `ProductSearch` trong `PosTopBar.tsx` dùng controlled div autocomplete do yêu cầu layout đặc thù.

### R-UI-4 · Không tự viết modal

KHÔNG dùng `position: fixed` tự vẽ modal.  
Dùng `Dialog` từ `@/components/ui/dialog` (wrapper antd Modal) hoặc antd `Modal` trực tiếp.

### R-UI-5 · Không tự viết toast

KHÔNG dùng `alert()` hay div tự vẽ notification.  
Dùng `toast` từ `@/lib/toast`:
```ts
import { toast } from '@/lib/toast'
toast.success('Thành công')
toast.error('Có lỗi xảy ra')
```

### R-UI-6 · Không hardcode màu

KHÔNG dùng `style={{ color: '#...' }}` hay Tailwind màu cụ thể (`text-red-500`, `bg-blue-400`...).  
Dùng token CSS variable: `text-primary`, `bg-muted`, `text-destructive`, `bg-secondary`...

### R-UI-7 · Icons dùng @ant-design/icons

KHÔNG dùng lucide-react hay bất kỳ icon library nào khác.  
Dùng `@ant-design/icons`:
```tsx
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
<EditOutlined className="h-4 w-4" />
```

### R-UI-8 · Customize trong src/components/ui/

Customize component = edit file trong `src/components/ui/`.  
KHÔNG bọc thêm `<div>` bên ngoài để override style.

### R-UI-9 · Tất cả form dùng RHF + Zod

KHÔNG dùng `<form onSubmit>` thủ công.  
Mọi form phải dùng `react-hook-form` + `@hookform/resolvers/zod`.

### R-UI-10 · Hiển thị tiền tệ LAK

Mọi số tiền hiển thị theo format: `X,XXX,XXX ₭` (dấu phẩy phân cách, ₭ ở sau).

```ts
// ✅ Format LAK
amount.toLocaleString('lo-LA') + ' ₭'

// Khi có i18n đầy đủ:
new Intl.NumberFormat('lo-LA').format(amount) + ' ₭'

// ❌ Không dùng vi-VN cho LAK
amount.toLocaleString('vi-VN') + '₫'
```

### R-UI-12 · Expanded Row trong Admin Table

Mọi admin table đều **phải có expanded row** — click vào row để xem chi tiết, không dùng modal hay drawer riêng cho thông tin chi tiết.

**Nguyên tắc bắt buộc:**
- Chỉ **1 row được mở tại 1 thời điểm** — không cho phép mở đồng thời nhiều row
- Dùng `onRow.onClick` để xử lý expand, **KHÔNG dùng** `expandRowByClick: true` (antd có edge case với controlled state)
- Bỏ `showExpandColumn: false` để ẩn nút expand mặc định
- Bỏ `onExpand` callback — logic nằm trong `onRow.onClick`

**Pattern chuẩn cho table page:**

```tsx
const [expandedKeys, setExpandedKeys] = useState<string[]>([])

<Table<T>
  rowKey="id"
  onRow={(record) => ({
    onClick: (e) => {
      if ((e.target as HTMLElement).closest('button, a, input, select, [role="button"]')) return
      setExpandedKeys(prev => prev.includes(record.id) ? [] : [record.id])
    },
  })}
  expandable={{
    expandedRowKeys: expandedKeys,
    showExpandColumn: false,
    expandedRowRender: (record) => <XxxExpandedRow record={record} />,
  }}
/>
```

**Cấu trúc `XxxExpandedRow`:**
- Nền `background: '#f8faff'`, padding `'16px 24px 20px'`
- Nếu có nhiều nhóm thông tin: dùng `<Tabs>` antd với `size="small"`
- Tab thông tin (attributes): danh sách label/value dạng `flex`, `w-1/2` cho label và value — **KHÔNG dùng** `grid-cols-2` outer cho label-value rows
- Action buttons (Sửa, Vô hiệu hóa, ...) nằm ở cuối expanded row, align right
- Bảng con (tồn kho, lịch sử...): dùng antd `<Table>` `size="small"` `bordered`, bọc trong `max-w-2xl` nếu ít cột

**Layout label/value chuẩn (KHÔNG để nằm 1 góc):**

```tsx
// ✅ Đúng — mỗi row chiếm full width, label trái 50%, value phải 50%
<div className="max-w-2xl mb-4">
  {rows.map((r, i) => (
    <div key={i} className="flex items-center border-b border-dashed py-1.5 text-sm">
      <span className="text-muted-foreground w-1/2">{r.label}</span>
      <span className="font-medium w-1/2">{r.value}</span>
    </div>
  ))}
</div>

// ❌ Sai — grid-cols-2 outer chia mỗi item còn 50% container, value bị đẩy vào giữa
<div className="grid grid-cols-2 gap-x-8">
  {rows.map((r, i) => (
    <div key={i} className="flex justify-between">
      <span>{r.label}</span>
      <span className="text-right">{r.value}</span>
    </div>
  ))}
</div>
```

### R-UI-11 · Không dùng asChild

`asChild` prop không tồn tại trong antd wrappers.  
Apply class/props trực tiếp vào component.

```tsx
// ✅
<DropdownMenuTrigger className="h-8 px-3 text-xs ...">Mở menu</DropdownMenuTrigger>

// ❌
<DropdownMenuTrigger asChild><Button>Mở menu</Button></DropdownMenuTrigger>
```

---

## Rules — Invoice Tab Manager

### R-TAB-1 · State hoàn toàn độc lập

Mỗi tab có cart riêng biệt. KHÔNG share cart state giữa các tab.

### R-TAB-2 · Giữ ít nhất 1 tab

`closeTab` phải kiểm tra `tabs.length > 1`. Không được để màn hình không có tab nào.

### R-TAB-3 · activeTabId điều khiển toàn bộ UI

`TransactionTable` và `PaymentPanel` chỉ đọc từ `useActiveTab()`.  
Khi switch tab → hook trả về data mới → UI tự re-render, không cần prop drilling.

### R-TAB-4 · UUID làm tab key

Dùng `crypto.randomUUID()` cho tab ID.  
KHÔNG dùng array index (index thay đổi khi đóng tab giữa).

### R-TAB-5 · Persist tabs vào localStorage

Zustand `persist` với `partialize: s => ({ tabs: s.tabs })`.  
KHÔNG persist `activeTabId` (tránh stale sau reload).

### R-TAB-6 · Confirm dialog trước khi đóng tab có items

Nếu tab có `items.length > 0`, phải hiện shadcn `Dialog` xác nhận.  
KHÔNG đóng tab ngay lập tức hay dùng `window.confirm()`.

### R-TAB-7 · Keyboard shortcuts tại root layout

`useInvoiceTabShortcuts()` được gọi duy nhất trong `src/app/(client)/layout.tsx`.  
KHÔNG đăng ký shortcuts trong component (gây duplicate listener).

### R-TAB-8 · Block đóng tab đang paying

Tab với `status === 'paying'` không được đóng.  
Kiểm tra ở cả store layer lẫn UI layer.

---

## Rules — i18n

### R-I18N-1 · Ngôn ngữ ưu tiên

Ngôn ngữ mặc định: **Lào (`lo`)**.  
Fallback chain: `lo` → `vi` → `en`.  
Mọi bản dịch phải có đủ 3 locale.

### R-I18N-2 · Không hardcode string UI

KHÔNG hardcode tiếng Lào, tiếng Việt hay tiếng Anh trong JSX.  
Mọi text phải qua `t('key')` từ `next-intl`.

### R-I18N-3 · Key phải có namespace

`pos.payment.total` ✅ · `total` ❌  
Namespace theo cấu trúc: `{module}.{section}.{key}`.

### R-I18N-4 · Format tiền LAK

```ts
// ✅ Format đúng cho LAK
amount.toLocaleString('lo-LA') + ' ₭'
// Hoặc khi có next-intl:
formatNumber(amount) + ' ₭'

// ❌ Không dùng vi-VN locale cho LAK
amount.toLocaleString('vi-VN') + '₫'
```

### R-I18N-5 · Error codes qua src/lib/errors.ts

```ts
// ✅ Map errorCode qua errors.ts
import { getErrorMessage } from '@/lib/errors'
toast.error(getErrorMessage(errorCode, currentLocale))

// ❌ Hiện errorCode trực tiếp hay hardcode message
toast.error('AUTH_INVALID_CREDENTIALS')
toast.error('Sai mật khẩu')
```

```ts
// Cấu trúc src/lib/errors.ts
type Locale = 'lo' | 'vi' | 'en'

const ERROR_MESSAGES: Record<string, Record<Locale, string>> = {
  AUTH_INVALID_CREDENTIALS: {
    lo: 'ລະຫັດພະນັກງານ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ',
    vi: 'Tên đăng nhập hoặc mật khẩu không đúng',
    en: 'Invalid employee code or password',
  },
  // ... thêm errorCode mới vào đây
}

export function getErrorMessage(code: string, locale: Locale = 'lo'): string {
  return ERROR_MESSAGES[code]?.[locale]
    ?? ERROR_MESSAGES[code]?.['en']
    ?? ERROR_MESSAGES['SYSTEM_INTERNAL_ERROR'][locale]
}
```

### R-I18N-6 · Đồng bộ key giữa các locale

Mọi key trong `lo.json` phải có trong `vi.json` và `en.json` cùng cấu trúc.

---

## Anti-patterns

```ts
// ❌ Gọi API trực tiếp trong component/hook UI
fetch('/api/transactions').then(...)
axios.post('/api/transactions', data)

// ❌ Fetch data bằng useEffect
useEffect(() => { fetch(...).then(setData) }, [])

// ❌ Float cho tiền tệ
const change = received - total  // nếu đây là float → sai số

// ❌ Bảng HTML thuần cho admin data grid
<table><tr><td>...</td></tr></table>  // dùng DataTable

// ❌ Dropdown tự vẽ
<div onClick={() => setOpen(true)} style={{ position: 'absolute' }}>...</div>

// ❌ Modal tự vẽ
<div style={{ position: 'fixed', zIndex: 9999 }}>...</div>

// ❌ Import lib trực tiếp trong component
import { TransactionRepository } from '@/lib/repositories/transaction.repository'
// phải qua hook: useCheckout, useTransaction...

// ❌ any type
const data: any = await fetch(...)

// ❌ Logic giá trong component
const total = weight * goldSellPrice + laborFee  // đặt vào lib/pricing.ts

// ❌ asChild không tồn tại
<DropdownMenuTrigger asChild><Button>...</Button></DropdownMenuTrigger>

// ❌ Dùng lucide-react hay sonner trực tiếp (đã bị remove)
import { Edit } from 'lucide-react'
import { toast } from 'sonner'

// ❌ Hiển thị errorCode trực tiếp
toast.error('TRANSACTION_NOT_FOUND')

// ❌ Sửa giao dịch COMPLETED
if (tx.status === 'COMPLETED') { /* Không bao giờ */ editTransaction(tx.id) }

// ❌ Hardcode màu
className="text-red-500 bg-blue-400"  // dùng token: text-destructive bg-primary
```

---

## Keyboard shortcuts (POS terminal)

| Phím | Hành động |
|---|---|
| `F3` | Focus ProductSearch |
| `F4` | Focus tìm khách hàng |
| `F6` | Focus tra cứu hóa đơn |
| `Ctrl + T` | Mở hóa đơn mới |
| `Ctrl + W` | Đóng hóa đơn hiện tại |
| `Ctrl + Tab` | Chuyển tab kế tiếp |
| `Ctrl + Shift + Tab` | Chuyển tab trước đó |
| `Ctrl + H` | Hold đơn (tạm giữ) |
| `Ctrl + D` | Nhân bản đơn hiện tại |

---

*Tài liệu này tổng hợp từ:*  
- *`Tài liệu Kiến trúc & Thiết kế POS Khamphuvong.md` (v1.0 — 03/06/2026)*  
- *`Tài liệu Nghiệp vụ & Luồng Quy trình POS Khamphuvong.md` (v1.0 — 05/06/2026)*  
- *`pos-design-patterns.md` — kiến trúc frontend hiện tại*
