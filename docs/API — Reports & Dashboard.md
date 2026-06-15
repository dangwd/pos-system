# API — Reports & Dashboard

> Tài liệu đầy đủ cho module báo cáo: dashboard tổng quan và báo cáo ngày chi tiết.  
> Cập nhật: 2026-06-12

---

## 1. Tổng quan

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| `GET` | `/api/reports/dashboard` | `REPORT_DASHBOARD` | Tổng quan doanh thu theo khoảng thời gian |
| `GET` | `/api/reports/daily` | `REPORT_DAILY` | Báo cáo chi tiết lãi/lỗ + tồn kho + tồn quỹ theo ngày & chi nhánh |

Cả hai endpoint yêu cầu role **Manager trở lên** (`REPORT_DASHBOARD`, `REPORT_DAILY`). Cashier và ThuQuy không có quyền truy cập.

> **Múi giờ**: Backend xử lý tất cả DateTime theo **UTC**. FE phải convert sang UTC trước khi gửi `from`/`to`.  
> `DateOnly` (dùng trong `/daily`) không cần convert — backend tự hiểu là ngày cục bộ của chi nhánh.

---

## 2. Dashboard — `GET /api/reports/dashboard`

### Endpoint

```
GET /api/reports/dashboard
GET /api/reports/dashboard?from=2026-06-01T00:00:00Z&to=2026-06-12T23:59:59Z
Authorization: Bearer <token>  (policy: REPORT_DASHBOARD)
```

### Query parameters

| Tên | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `from` | `DateTime` (ISO 8601) | Hôm nay 00:00:00 UTC | Thời điểm bắt đầu (inclusive) |
| `to` | `DateTime` (ISO 8601) | Hôm nay 23:59:59 UTC | Thời điểm kết thúc (inclusive) |

> Nếu chỉ truyền `from` mà không có `to`: `to` mặc định = `from + 1 ngày - 1 giây`.  
> Nếu không truyền gì cả: lấy số liệu trong ngày hôm nay.

### Response `200 OK`

```json
{
  "totalRevenue":   12_560_000_000,
  "totalPurchase":   3_200_000_000,
  "cancelledCount": 2,
  "from": "2026-06-12T00:00:00Z",
  "to":   "2026-06-12T23:59:59Z"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `totalRevenue` | `decimal` | Tổng `TotalAmount` các hóa đơn **SellGold + SellSilver** đã `Completed` trong khoảng thời gian — **toàn hệ thống** (không lọc chi nhánh) |
| `totalPurchase` | `decimal` | Tổng `TotalAmount` các hóa đơn **BuyGold** đã `Completed` trong khoảng thời gian |
| `cancelledCount` | `int` | Số hóa đơn có trạng thái `Cancelled` được tạo (`TransactedAt`) trong khoảng thời gian |
| `from` | `string` | Thời điểm bắt đầu đã áp dụng (echo lại sau khi set default) |
| `to` | `string` | Thời điểm kết thúc đã áp dụng |

### Lưu ý thiết kế

**Dashboard không lọc theo chi nhánh** — luôn tổng hợp toàn hệ thống. Để lấy theo chi nhánh riêng, dùng `GET /api/reports/daily`.

**Công thức tính các trường:**
```
totalRevenue  = Σ TotalAmount  where Type IN (SellGold, SellSilver) AND Status = Completed
totalPurchase = Σ TotalAmount  where Type = BuyGold                 AND Status = Completed
cancelledCount = COUNT(*)      where Status = Cancelled             (lọc theo TransactedAt, không phải CancelledAt)
```

Các loại giao dịch **không tính** vào `totalRevenue`:
- `ExchangeGold`, `ExchangeFree` — đổi hàng (tính riêng trong `daily`)
- `ExchangeCurrency` — đổi ngoại tệ
- `BuyMoreGold`, `ExchangeToMoney` — mua thêm/bán lại

### Ví dụ: Dashboard 7 ngày

```
GET /api/reports/dashboard?from=2026-06-06T00:00:00Z&to=2026-06-12T23:59:59Z
```

### Ví dụ: Dashboard hôm nay (FE tự convert)

```typescript
const today = new Date();
const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // 00:00 local
const to   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

// Convert to UTC ISO string
fetch(`/api/reports/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`)
```

---

## 3. Báo cáo ngày — `GET /api/reports/daily`

### Endpoint

```
GET /api/reports/daily?branchId={uuid}
GET /api/reports/daily?branchId={uuid}&date=2026-06-12
Authorization: Bearer <token>  (policy: REPORT_DAILY)
```

### Query parameters

| Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | **Có** | ID chi nhánh cần báo cáo |
| `date` | `DateOnly` (`yyyy-MM-dd`) | Không | Ngày cần báo cáo. Mặc định: hôm nay (UTC) |

### Response `200 OK`

```json
{
  "date": "2026-06-12",
  "branchId": "bb5a8354-14c8-4a01-a0ae-ca79d60229e1",

  "doanhThuBan":    8_400_000_000,
  "chiPhiMua":      2_100_000_000,
  "doanhThuDoi":      950_000_000,
  "laiGopTamTinh":  6_300_000_000,

  "tongHoaDon":         47,
  "tongGiaoDichTrade":   5,

  "tonKho": {
    "itemsOnDisplay": 312,
    "totalWeightMg":  1170.0
  },

  "tonQuy": {
    "openingLak":   50_000_000,
    "collectedLak": 35_000_000,
    "paidLak":       8_000_000,
    "closingLak":   77_000_000
  }
}
```


---

### `GET /api/reports/currency-exchange`

Báo cáo thu đổi ngoại tệ trong kỳ: tổng hợp **tồn quỹ theo loại tiền** (Đầu kỳ / Thu vào / Chi ra / Cuối kỳ) và **danh sách giao dịch** chi tiết (`ExchangeCurrency`, trạng thái `Completed`).

**Yêu cầu policy:** `ReportDashboard` (Manager, SystemAdmin).

**Query params:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `from` | DateTime | Đầu kỳ (mặc định 00:00 hôm nay) |
| `to` | DateTime | Cuối kỳ (mặc định 23:59:59 hôm nay) |
| `branchId` | GUID | Lọc theo chi nhánh (tuỳ chọn) |
| `counterId` | GUID | Lọc theo quầy (tuỳ chọn) |

**Response `200 OK`:**

```json
{
  "from": "2026-06-14T00:00:00Z",
  "to": "2026-06-15T23:59:59Z",
  "branchId": null,
  "counterId": null,
  "balanceSummary": [
    {
      "currencyCode": "THB",
      "openingBalance": 80000,
      "totalIn": 8000,
      "totalOut": 9050,
      "closingBalance": 78950
    },
    {
      "currencyCode": "USD",
      "openingBalance": 5000,
      "totalIn": 1350,
      "totalOut": 276,
      "closingBalance": 6074
    }
  ],
  "totalTransactions": 5,
  "transactions": [
    {
      "id": "3fa85f64-...",
      "invoiceCode": "DNT-20260615-0001",
      "transactedAt": "2026-06-15T02:15:00Z",
      "customerName": "Tanaka K.",
      "sourceCurrency": "USD",
      "sourceAmount": 500,
      "targetCurrency": "JPY",
      "targetAmount": 78500,
      "displayRate": 157,
      "counterName": "Q1",
      "counterId": "...",
      "branchName": "Vientiane",
      "branchId": "...",
      "cashierName": "Lan",
      "status": "Completed"
    }
  ]
}
```

**Mô tả các trường:**

| Trường | Mô tả |
|---|---|
| `balanceSummary[].openingBalance` | Đầu kỳ — tổng tích lũy tất cả giao dịch **trước** `from` (thu vào − trả ra) của loại tiền này |
| `balanceSummary[].totalIn` | Σ Thu vào — tổng tiền **khách đưa** (source) trong kỳ |
| `balanceSummary[].totalOut` | Σ Chi ra — tổng tiền **cửa hàng trả** khách (target) trong kỳ |
| `balanceSummary[].closingBalance` | Cuối kỳ = Đầu kỳ + Thu vào − Chi ra |
| `transactions[].sourceAmount` | Số tiền khách đưa vào (đơn vị `sourceCurrency`) |
| `transactions[].targetAmount` | Số tiền khách nhận (đơn vị `targetCurrency`) |
| `transactions[].displayRate` | Tỷ giá hiển thị = `targetAmount / sourceAmount` (cross-rate) |

> **Lưu ý tính Đầu kỳ:** `openingBalance` được tính từ toàn bộ lịch sử giao dịch `ExchangeCurrency` trước ngày `from` (có áp dụng filter `branchId` / `counterId`). Không cần nhập số dư ban đầu — hệ thống tự tính từ dữ liệu tích lũy.

---

### Giải thích từng trường

#### Doanh thu & Lãi/Lỗ

| Trường | Kiểu | Công thức | Mô tả |
|---|---|---|---|
| `doanhThuBan` | `decimal` | `Σ TotalAmount` where `Type IN (SellGold, SellSilver)` | Tổng doanh thu bán vàng/bạc trong ngày |
| `chiPhiMua` | `decimal` | `Σ TotalAmount` where `Type = BuyGold` | Tổng chi phí mua vàng vào trong ngày |
| `doanhThuDoi` | `decimal` | `Σ TotalAmount` where `Type = ExchangeGold` | Tổng doanh thu từ giao dịch đổi hàng |
| `laiGopTamTinh` | `decimal` | `doanhThuBan - chiPhiMua` | Lãi gộp ước tính — **không trừ chi phí vận hành** |

> `laiGopTamTinh` chỉ tính `Bán - Mua`. Không bao gồm `doanhThuDoi`, `ExchangeCurrency`, hay chi phí nhân công.  
> Tất cả chỉ tính hóa đơn có `Status = Completed` và `TransactedAt` trong ngày của `branchId`.

#### Số lượng giao dịch

| Trường | Kiểu | Mô tả |
|---|---|---|
| `tongHoaDon` | `int` | Tổng số hóa đơn `Completed` trong ngày (mọi loại `TransactionType`) |
| `tongGiaoDichTrade` | `int` | Tổng số giao dịch mua/đổi từ bảng `TradeTxns` trong ngày (theo `NgayGio`) |

#### Tồn kho

| Trường | Kiểu | Mô tả |
|---|---|---|
| `tonKho.itemsOnDisplay` | `int` | Số lượng bản ghi `InventoryItem` có `TrangThai = TrenQuay` và `BranchId = branchId` |
| `tonKho.totalWeightMg` | `decimal` | Tổng `WeightGram` của các item trên — đơn vị là **gram** (tên field có thể gây nhầm, thực tế là gram) |

> **Lưu ý**: `tonKho.totalWeightMg` tên có "Mg" nhưng giá trị thực là **gram** (lấy từ cột `WeightGram` trong DB). FE hiển thị dưới dạng gram hoặc quy đổi tùy màn hình.

#### Tồn quỹ tiền mặt

Chỉ tính **tiền mặt (CASH)** bằng **LAK**. Không bao gồm chuyển khoản (BANK) hay ngoại tệ.

| Trường | Kiểu | Nguồn dữ liệu | Mô tả |
|---|---|---|---|
| `tonQuy.openingLak` | `decimal` | `DailyOpeningBalance.CashAmountLak` | Số dư đầu ngày ThuQuy nhập. `0` nếu chưa nhập |
| `tonQuy.collectedLak` | `decimal` | Bán vàng/bạc CASH + Thu thủ công CASH/IN | Tổng tiền mặt thu trong ngày |
| `tonQuy.paidLak` | `decimal` | Mua vàng CASH + Chi thủ công CASH/OUT | Tổng tiền mặt chi trong ngày |
| `tonQuy.closingLak` | `decimal` | `opening + collected - paid` | Tồn quỹ cuối ngày ước tính |

**Công thức tồn quỹ chi tiết:**

```
collectedLak = Σ TotalAmount (SellGold+SellSilver CASH Completed)
             + Σ AmountLak   (ManualCashEntry Direction=IN, Method=CASH)

paidLak      = Σ TotalAmount (BuyGold CASH Completed)
             + Σ AmountLak   (ManualCashEntry Direction=OUT, Method=CASH)

closingLak   = openingLak + collectedLak - paidLak
```

> Giao dịch `COMBINED` và `BANK` **không tính** vào `tonQuy` — chỉ tính `PaymentMethod = "CASH"`.  
> Doanh thu đổi hàng (`ExchangeGold`) cũng **không tính** vào `tonQuy`.

---

## 4. Mã lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `403` | `AUTH_FORBIDDEN` | Không có quyền `REPORT_DASHBOARD` hoặc `REPORT_DAILY` |
| `401` | `AUTH_TOKEN_EXPIRED` | Token hết hạn |

> Hai endpoint này **không throw** domain exception (NotFoundException, BusinessRuleException) vì luôn trả về kết quả dù không có dữ liệu (tổng = 0, count = 0).

---

## 5. Luồng tích hợp Frontend

### Dashboard page

```typescript
// Gọi khi mount — lấy số liệu hôm nay
const today = new Date();
const from = startOfDay(today).toISOString();   // "2026-06-12T00:00:00.000Z"
const to   = endOfDay(today).toISOString();     // "2026-06-12T23:59:59.999Z"

const { data } = await api.get(`/api/reports/dashboard?from=${from}&to=${to}`);

// Hiển thị
<StatCard label="Doanh thu bán"  value={formatLak(data.totalRevenue)}  />
<StatCard label="Chi phí mua"    value={formatLak(data.totalPurchase)} />
<StatCard label="Đã hủy"         value={data.cancelledCount}           />
```

### Daily report page

```typescript
// date: string "2026-06-12" (DateOnly — không cần UTC convert)
const { data } = await api.get(`/api/reports/daily?branchId=${branchId}&date=${date}`);

// Lãi/Lỗ
data.doanhThuBan       // Doanh thu bán
data.chiPhiMua         // Chi phí mua
data.laiGopTamTinh     // = doanhThuBan - chiPhiMua

// Tồn kho
data.tonKho.itemsOnDisplay   // Số item đang trưng bày
data.tonKho.totalWeightMg    // Tổng trọng lượng (gram — tên field gây nhầm)

// Sổ quỹ
data.tonQuy.openingLak       // Số dư đầu ngày
data.tonQuy.collectedLak     // Thu trong ngày (CASH)
data.tonQuy.paidLak          // Chi trong ngày (CASH)
data.tonQuy.closingLak       // Tồn quỹ cuối ngày
```

### Bộ lọc ngày tháng — Date picker

```typescript
// daily report: gửi DateOnly string, không cần timezone
const dateStr = format(selectedDate, "yyyy-MM-dd");  // "2026-06-12"
fetch(`/api/reports/daily?branchId=...&date=${dateStr}`)

// dashboard: gửi DateTime UTC
const fromISO = startOfDay(selectedDate).toISOString();
const toISO   = endOfDay(selectedDate).toISOString();
fetch(`/api/reports/dashboard?from=${fromISO}&to=${toISO}`)
```

---

## 6. Tóm tắt so sánh hai endpoint

| Tiêu chí | `dashboard` | `daily` |
|---|---|---|
| Phạm vi | **Toàn hệ thống** | **1 chi nhánh** |
| Filter thời gian | `from` + `to` (DateTime UTC) | `date` (DateOnly) |
| Tồn kho | Không có | Có (`tonKho`) |
| Tồn quỹ | Không có | Có (`tonQuy`) |
| Giao dịch Trade | Không có | Có (`tongGiaoDichTrade`) |
| Doanh thu đổi | Không tính | Có (`doanhThuDoi`) |
| Permission | `REPORT_DASHBOARD` | `REPORT_DAILY` |
