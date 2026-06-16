# API — Cấu hình Tỉ Giá Ngoại Tệ

> **Tạo:** 2026-06-16  
> Tài liệu này mô tả các API quản lý tỉ giá ngoại tệ (THB, USD → LAK) dùng cho màn hình **Cấu hình → Tỉ giá** và màn hình **Đổi Ngoại Tệ**.

Base URL: `https://<host>/api`  
Auth: `Authorization: Bearer <accessToken>`  
Quyền cần có: `config:price` (Manager / SystemAdmin)

---

## Mục lục

1. [Lấy tỉ giá hiện tại — GET /api/config/exchange-rates](#1-lấy-tỉ-giá-hiện-tại)
2. [Cập nhật tỉ giá — POST /api/config/exchange-rates](#2-cập-nhật-tỉ-giá)
3. [Cấu trúc tỉ giá hiệu lực](#3-cấu-trúc-tỉ-giá-hiệu-lực)
4. [Mã lỗi liên quan](#4-mã-lỗi-liên-quan)

---

## 1. Lấy tỉ giá hiện tại

Trả về danh sách tỉ giá **đang hiệu lực** cho tất cả loại ngoại tệ (mỗi loại 1 bản ghi mới nhất).

```
GET /api/config/exchange-rates
Authorization: Bearer <accessToken>
```

### Response — 200 OK

```jsonc
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "currencyCode": "THB",
    "rateToLak": 820.0,      // 1 THB = 820 LAK (giá gốc nhập vào)
    "adjustment": 5.0,       // biên độ điều chỉnh
    "effectiveRate": 825.0,  // tỉ giá thực dùng = rateToLak + adjustment
    "updatedBy": "uuid-của-người-cập-nhật",
    "updatedAt": "2026-06-16T08:30:00Z",
    "effectiveFrom": "2026-06-16T08:30:00Z"
  },
  {
    "id": "...",
    "currencyCode": "USD",
    "rateToLak": 20500.0,
    "adjustment": 100.0,
    "effectiveRate": 20600.0,
    "updatedBy": "...",
    "updatedAt": "2026-06-15T14:00:00Z",
    "effectiveFrom": "2026-06-15T14:00:00Z"
  }
]
```

> **Lưu ý**: `effectiveRate = rateToLak + adjustment`. Đây là con số FE phải dùng khi tính tiền quy đổi. **Không tự cộng lại.**

---

## 2. Cập nhật tỉ giá

Mỗi lần gọi API này sẽ **tạo bản ghi mới** cho loại ngoại tệ đó (không ghi đè). Tỉ giá mới có hiệu lực ngay lập tức (`effectiveFrom = now`).

```
POST /api/config/exchange-rates
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Body

```jsonc
{
  "currencyCode": "THB",   // mã ngoại tệ: "THB" | "USD" | "CNY" (chữ hoa hoặc thường đều được)
  "rateToLak": 820.0,      // 1 đơn vị ngoại tệ = X LAK (giá thị trường tham chiếu)
  "adjustment": 5.0        // biên độ cộng thêm vào rateToLak khi áp dụng (có thể âm)
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| `currencyCode` | `string` | ✅ | Ví dụ: `"THB"`, `"USD"`. Backend tự chuyển sang chữ hoa. |
| `rateToLak` | `decimal` | ✅ | Giá gốc: 1 ngoại tệ = X LAK |
| `adjustment` | `decimal` | ✅ | Biên độ điều chỉnh. Có thể là `0` nếu không muốn điều chỉnh. |

### Response — 200 OK

Trả về bản ghi tỉ giá vừa tạo (cùng cấu trúc như GET):

```jsonc
{
  "id": "new-uuid",
  "currencyCode": "THB",
  "rateToLak": 820.0,
  "adjustment": 5.0,
  "effectiveRate": 825.0,
  "updatedBy": "uuid-của-người-cập-nhật",
  "updatedAt": "2026-06-16T09:00:00Z",
  "effectiveFrom": "2026-06-16T09:00:00Z"
}
```

---

## 3. Cấu trúc tỉ giá hiệu lực

```
rateToLak   = giá gốc tham chiếu (ví dụ: 820 LAK/THB)
adjustment  = biên độ điều chỉnh (ví dụ: +5 hoặc -10)
effectiveRate = rateToLak + adjustment  ← dùng con số này khi tính tiền
```

### Ví dụ tính tiền đổi ngoại tệ

```
Khách đổi 1,000 THB → LAK
effectiveRate = 820 + 5 = 825
Số LAK nhận = 1,000 × 825 = 825,000 ₭
```

### Vòng đời bản ghi tỉ giá

- Mỗi lần `POST /api/config/exchange-rates` tạo **1 bản ghi mới** (không xóa/ghi đè bản cũ).
- `GET /api/config/exchange-rates` luôn trả về **bản ghi mới nhất** của mỗi loại tiền tệ.
- Backend group by `currencyCode`, lấy `MAX(effectiveFrom)` → FE không cần lo lịch sử.

---

## 4. Mã lỗi liên quan

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|-------------|
| `AUTH_FORBIDDEN` | 403 | Không có quyền `config:price` (chỉ Manager / SystemAdmin mới được cập nhật) |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn, cần refresh |
| `SYSTEM_INTERNAL_ERROR` | 500 | Lỗi server không xác định |

> **Không có lỗi validation đặc biệt** cho exchange rate: backend không kiểm tra trùng lặp hay range — FE chịu trách nhiệm validate giá trị hợp lệ (> 0) trước khi gửi.

---

## Gợi ý tích hợp FE

### Màn hình Cấu hình → Tỉ giá

```
1. Mount: gọi GET /api/config/exchange-rates → hiển thị danh sách tỉ giá hiện tại
2. Nhân viên nhập rateToLak + adjustment cho từng loại tiền
3. Submit: gọi POST /api/config/exchange-rates cho từng loại tiền thay đổi
4. Sau khi POST thành công → cập nhật lại state bằng response trả về (không cần GET lại)
```

### Màn hình Đổi Ngoại Tệ — lấy tỉ giá để tính tiền

```
1. Khi mở màn hình: gọi GET /api/config/exchange-rates → lưu vào store/state
2. Khi tính tiền: dùng effectiveRate (đã có trong response, KHÔNG tự cộng rateToLak + adjustment)
3. Khi tạo giao dịch: truyền exchangeRate = effectiveRate vào body POST /api/transactions
```

### TypeScript type gợi ý

```typescript
interface ExchangeRateDto {
  id: string;
  currencyCode: string;       // "THB" | "USD" | "CNY"
  rateToLak: number;
  adjustment: number;
  effectiveRate: number;      // = rateToLak + adjustment, dùng con số này
  updatedBy: string;
  updatedAt: string;          // ISO 8601
  effectiveFrom: string;      // ISO 8601
}

interface UpdateExchangeRateRequest {
  currencyCode: string;
  rateToLak: number;
  adjustment: number;
}
```