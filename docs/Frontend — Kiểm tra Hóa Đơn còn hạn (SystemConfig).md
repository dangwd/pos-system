# Frontend — Kiểm tra Hóa Đơn còn hạn / hết hạn theo SystemConfig

> Tài liệu hướng dẫn FE xác định một hóa đơn cũ **còn trong hạn** hay **đã hết hạn** đối với 2 nghiệp vụ có ràng buộc thời gian theo `SystemConfig`:
>
> 1. **Thu mua theo giá gốc hóa đơn** (`BuyBackOriginalPrice`)
> 2. **Đổi miễn phí** (`ExchangeFree`)
>
> Doc liên quan: [`API Config — Cấu Hình Hệ Thống (SystemConfig)`](./API%20Config%20—%20Cấu%20Hình%20Hệ%20Thống%20(SystemConfig).md), [`API — Transactions`](./API%20—%20Transactions%20(Tạo%20&%20Hủy%20Hóa%20Đơn).md)

---

## 1. Tổng quan

Hai cài đặt trong `SystemConfig` quyết định một hóa đơn cũ còn được dùng cho nghiệp vụ kế tiếp hay không:

| Cài đặt | Bật/Tắt | Số ngày tối đa | Ý nghĩa |
|---|---|---|---|
| `buyBackOriginalPriceEnabled` | bool | `buyBackOriginalPriceMaxDays` (int, `0` = không giới hạn) | Trong vòng N ngày kể từ hóa đơn gốc, NV được phép áp giá bán ban đầu khi thu mua lại |
| `exchangeFreeEnabled` | bool | `exchangeFreeMaxDays` (int, > 0) | Trong vòng N ngày kể từ hóa đơn gốc, khách được Đổi Miễn Phí (`TransactionType = 5`) |

**Hai cài đặt là độc lập** — tắt cái này không ảnh hưởng cái kia. FE phải kiểm tra riêng cho mỗi luồng nghiệp vụ.

---

## 2. BuyBackOriginalPrice — FE đọc trực tiếp từ response hóa đơn

> ✅ **Không cần gọi thêm `GET /api/config/system`.** Backend đã nhúng sẵn config + số ngày đã tính sẵn vào mỗi response hóa đơn (list và detail).

### 2.1. Các field được bổ sung vào response

Mọi item trả về từ `GET /api/transactions` (list) và `GET /api/transactions/:id` (detail) đều có thêm 3 field:

```jsonc
{
  // ... các field hiện có (id, invoiceCode, transactedAt, ...)
  "daysSincePurchase": 12,                  // int — số ngày trôi qua kể từ transactedAt (tính ở backend, theo UTC, làm tròn xuống ngày)
  "buyBackOriginalPriceEnabled": true,      // bool — snapshot cài đặt hiện tại của SystemConfig
  "buyBackOriginalPriceMaxDays": 20         // int — số ngày tối đa cho phép; 0 = không giới hạn
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `daysSincePurchase` | int | `floor((now_utc − transactedAt).TotalDays)`. Luôn ≥ 0. |
| `buyBackOriginalPriceEnabled` | bool | Giá trị bật/tắt hiện tại của tính năng giá gốc khi mua lại |
| `buyBackOriginalPriceMaxDays` | int | Ngưỡng tối đa, `0` nghĩa là **không giới hạn** thời gian |

> ⚠️ `buyBackOriginalPriceEnabled` và `buyBackOriginalPriceMaxDays` là **snapshot tại thời điểm gọi API**, không phải tại thời điểm `transactedAt`. Nếu Manager vừa thay đổi cài đặt thì lần list/detail tiếp theo sẽ thấy giá trị mới.

### 2.2. Công thức xác định "còn hạn"

```
canApplyOriginalPrice =
    buyBackOriginalPriceEnabled === true
    && (
        buyBackOriginalPriceMaxDays === 0                                       // 0 = không giới hạn
        || daysSincePurchase <= buyBackOriginalPriceMaxDays                     // còn trong ngưỡng
    )
```

### 2.3. Ma trận quyết định

| `enabled` | `maxDays` | `daysSincePurchase` | Kết quả | Hiển thị gợi ý |
|---|---|---|---|---|
| `false` | bất kỳ | bất kỳ | ❌ Không áp dụng | Ẩn nút/option giá gốc |
| `true` | `0` | bất kỳ | ✅ Còn hạn | "Đủ điều kiện áp giá gốc" |
| `true` | `20` | `0` | ✅ Còn hạn | "Còn 20 ngày" |
| `true` | `20` | `12` | ✅ Còn hạn | "Còn 8 ngày" |
| `true` | `20` | `20` | ✅ Còn hạn | "Còn 0 ngày — hôm nay là ngày cuối" |
| `true` | `20` | `21` | ❌ Hết hạn | "Đã quá 1 ngày so với hạn 20 ngày" |

### 2.4. Sample TypeScript

```ts
// types/transaction.ts
export interface TransactionListItem {
  id: string;
  invoiceCode: string;
  transactedAt: string;        // ISO 8601 UTC
  daysSincePurchase: number;
  buyBackOriginalPriceEnabled: boolean;
  buyBackOriginalPriceMaxDays: number;
  // ... các field khác
}

// lib/buy-back.ts
export interface BuyBackStatus {
  canApplyOriginalPrice: boolean;
  reason: 'feature_disabled' | 'no_limit' | 'within_limit' | 'expired';
  daysRemaining: number | null;   // null khi không giới hạn hoặc đã hết hạn / tắt
}

export function getBuyBackStatus(txn: {
  daysSincePurchase: number;
  buyBackOriginalPriceEnabled: boolean;
  buyBackOriginalPriceMaxDays: number;
}): BuyBackStatus {
  if (!txn.buyBackOriginalPriceEnabled) {
    return { canApplyOriginalPrice: false, reason: 'feature_disabled', daysRemaining: null };
  }
  if (txn.buyBackOriginalPriceMaxDays === 0) {
    return { canApplyOriginalPrice: true, reason: 'no_limit', daysRemaining: null };
  }
  if (txn.daysSincePurchase <= txn.buyBackOriginalPriceMaxDays) {
    return {
      canApplyOriginalPrice: true,
      reason: 'within_limit',
      daysRemaining: txn.buyBackOriginalPriceMaxDays - txn.daysSincePurchase,
    };
  }
  return { canApplyOriginalPrice: false, reason: 'expired', daysRemaining: null };
}
```

### 2.5. Gợi ý hiển thị UI

```
┌────────────────────────────────────────────────────┐
│ HD-20260605-0042   ·   Mua ngày 12 ngày trước     │
│                                                    │
│ 🟢 Còn hạn áp giá gốc (còn 8 ngày)                 │
│ [Áp giá gốc hóa đơn]   [Áp giá thị trường]         │
└────────────────────────────────────────────────────┘

hoặc khi hết hạn:

┌────────────────────────────────────────────────────┐
│ HD-20260501-0017   ·   Mua ngày 54 ngày trước     │
│                                                    │
│ 🔴 Đã hết hạn áp giá gốc (giới hạn 20 ngày)        │
│ [Áp giá thị trường]                                │
└────────────────────────────────────────────────────┘
```

---

## 3. ExchangeFree — FE tự ghép từ SystemConfig + transactedAt

> ⚠️ Khác với BuyBack, **response hóa đơn KHÔNG nhúng sẵn** field cho ExchangeFree. FE cần:
> 1. Gọi `GET /api/config/system` (cache lại trong session).
> 2. Tính `daysSincePurchase` từ `transactedAt` của hóa đơn gốc.
> 3. Áp công thức.

### 3.1. Lấy cài đặt

```
GET /api/config/system
Authorization: Bearer <accessToken>
```

Response (xem chi tiết trong [SystemConfig doc](./API%20Config%20—%20Cấu%20Hình%20Hệ%20Thống%20(SystemConfig).md)):

```json
{
  "exchangeFreeEnabled": true,
  "exchangeFreeMaxDays": 30,
  "buyBackOriginalPriceEnabled": false,
  "buyBackOriginalPriceMaxDays": 0,
  "updatedAt": "2026-06-24T02:08:03Z",
  "updatedBy": "uuid"
}
```

### 3.2. Công thức xác định "còn hạn"

```
canExchangeFree =
    exchangeFreeEnabled === true
    && daysSincePurchase <= exchangeFreeMaxDays    // exchangeFreeMaxDays luôn > 0 (validation BE)
```

> `exchangeFreeMaxDays` ở backend bắt buộc `> 0` (mã lỗi `CONFIG_EXCHANGE_FREE_MAX_DAYS_INVALID`), nên FE không cần xử lý case `= 0`.

### 3.3. Sample TypeScript

```ts
// lib/exchange-free.ts
export interface SystemConfig {
  exchangeFreeEnabled: boolean;
  exchangeFreeMaxDays: number;
  buyBackOriginalPriceEnabled: boolean;
  buyBackOriginalPriceMaxDays: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export function getDaysSince(transactedAt: string): number {
  const ms = Date.now() - new Date(transactedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export interface ExchangeFreeStatus {
  canExchangeFree: boolean;
  reason: 'feature_disabled' | 'within_limit' | 'expired';
  daysRemaining: number | null;
}

export function getExchangeFreeStatus(
  transactedAt: string,
  config: SystemConfig,
): ExchangeFreeStatus {
  if (!config.exchangeFreeEnabled) {
    return { canExchangeFree: false, reason: 'feature_disabled', daysRemaining: null };
  }
  const days = getDaysSince(transactedAt);
  if (days <= config.exchangeFreeMaxDays) {
    return {
      canExchangeFree: true,
      reason: 'within_limit',
      daysRemaining: config.exchangeFreeMaxDays - days,
    };
  }
  return { canExchangeFree: false, reason: 'expired', daysRemaining: null };
}
```

### 3.4. Lỗi BE trả khi tạo giao dịch ExchangeFree

Khi FE gọi `POST /api/transactions` với `type = 5` (`ExchangeFree`), BE sẽ tự re-validate và có thể trả các mã lỗi sau (xem [errors.ts](#)):

| Mã lỗi | HTTP | Tình huống |
|---|---|---|
| `EXCHANGE_FREE_DISABLED` | 422 | Manager đã tắt tính năng |
| `EXCHANGE_FREE_REFERENCE_REQUIRED` | 422 | FE quên gửi `referenceInvoiceCode` |
| `EXCHANGE_FREE_REFERENCE_NOT_FOUND` | 422 | Mã hóa đơn gốc không tồn tại |
| `EXCHANGE_FREE_REFERENCE_EXPIRED` | 422 | Hóa đơn gốc đã quá `exchangeFreeMaxDays` |

**FE nên check trước** để không cho user submit nếu đã hết hạn — nhưng vẫn phải handle các mã lỗi trên vì cài đặt có thể vừa thay đổi giữa lúc load màn hình và lúc submit.

---

## 4. So sánh nhanh hai luồng

| Tiêu chí | BuyBackOriginalPrice | ExchangeFree |
|---|---|---|
| Cần gọi `GET /api/config/system`? | ❌ Không — đã nhúng sẵn vào response hóa đơn | ✅ Có |
| Field `daysSincePurchase` từ BE? | ✅ Có sẵn trong response hóa đơn | ❌ FE tự tính từ `transactedAt` |
| `maxDays = 0` có ý nghĩa? | ✅ Có — `0` = không giới hạn | ❌ Không — BE bắt buộc `> 0` |
| BE re-validate khi tạo giao dịch? | (Không liên quan đến tạo giao dịch — là cài đặt UI/quote) | ✅ Có — trả `EXCHANGE_FREE_*` errors |
| Mã lỗi BE | (không có) | `EXCHANGE_FREE_DISABLED`, `EXCHANGE_FREE_REFERENCE_EXPIRED`, ... |

---

## 5. Các câu hỏi thường gặp

**Q: Tại sao BuyBack nhúng config vào response hóa đơn, còn ExchangeFree thì không?**
BuyBack dùng để **hiển thị/gợi ý giá** ngay trên màn hình chi tiết/list hóa đơn — gắn config vào đúng row giúp FE không phải merge 2 nguồn dữ liệu khi render bảng. ExchangeFree được kiểm tra tại bước **tạo giao dịch mới** (POST /api/transactions), không cần hiển thị trên row hóa đơn cũ → FE chỉ cần gọi config 1 lần và cache lại.

**Q: `daysSincePurchase` tính theo timezone nào?**
Tính ở backend bằng UTC: `Math.max(0, (int)(DateTime.UtcNow - transactedAt).TotalDays)`. Là số ngày trọn vẹn (làm tròn xuống). FE không cần xử lý timezone — chỉ hiển thị trực tiếp.

**Q: Nếu user xem hóa đơn cũ sau khi Manager vừa giảm `buyBackOriginalPriceMaxDays`, FE có thấy đúng không?**
Có. Mỗi lần gọi `GET /api/transactions/...`, BE đọc bản ghi `SystemConfig` mới nhất và snapshot vào response → FE luôn thấy cài đặt hiện hành.

**Q: Cần invalidate cache `SystemConfig` ở FE khi nào?**
- Sau khi Manager gọi `PUT /api/config/system/exchange-free` hoặc `PUT /api/config/system/buy-back-original-price` thành công → invalidate cache + re-fetch.
- Khi user đăng nhập lại → fetch lại từ đầu.
- Tùy chọn: TTL ngắn (5–10 phút) nếu màn hình mở lâu.

**Q: Khi `buyBackOriginalPriceMaxDays = 0` (không giới hạn) thì hiển thị thế nào?**
Gợi ý: "Không giới hạn thời gian" hoặc ẩn dòng "Còn N ngày". Đừng hiển thị "Còn 0 ngày" — gây hiểu nhầm là sắp hết hạn.

---

## 6. Liên quan

- [API Config — Cấu Hình Hệ Thống (SystemConfig)](./API%20Config%20—%20Cấu%20Hình%20Hệ%20Thống%20(SystemConfig).md)
- [API — Transactions (Tạo & Hủy Hóa Đơn)](./API%20—%20Transactions%20(Tạo%20&%20Hủy%20Hóa%20Đơn).md)
- Backend handlers:
  - `Application/Features/Transactions/TransactionQueries.cs` — nhúng `daysSincePurchase` và `buyBackOriginalPrice*` vào DTO
  - `Application/Features/Transactions/TransactionCommands.cs` — validate ExchangeFree theo `exchangeFreeMaxDays`