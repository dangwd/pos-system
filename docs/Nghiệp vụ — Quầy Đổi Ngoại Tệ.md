# Nghiệp vụ — Quầy Đổi Ngoại Tệ (ExchangeCurrency)

> Tài liệu chi tiết end-to-end cho màn hình **Đổi Ngoại Tệ**: cấu hình tỷ giá, UI tính toán, luồng tạo giao dịch, và xử lý backend.

---

## Mục lục

1. [Tổng quan nghiệp vụ](#1-tổng-quan-nghiệp-vụ)
2. [Quản lý tỷ giá](#2-quản-lý-tỷ-giá)
   - 2.1 [Domain Entity — ExchangeRate](#21-domain-entity--exchangerate)
   - 2.2 [API tỷ giá](#22-api-tỷ-giá)
   - 2.3 [Lịch sử tỷ giá — append-only](#23-lịch-sử-tỷ-giá--append-only)
3. [Frontend — Màn hình POS FX](#3-frontend--màn-hình-pos-fx)
   - 3.1 [Layout tổng thể](#31-layout-tổng-thể)
   - 3.2 [CurrencyExchangeForm — UI tính toán](#32-currencyexchangeform--ui-tính-toán)
   - 3.3 [Công thức tính cross-rate](#33-công-thức-tính-cross-rate)
   - 3.4 [State management (posStore)](#34-state-management-posstore)
   - 3.5 [PaymentDetailPanel — FX mode](#35-paymentdetailpanel--fx-mode)
4. [Encoding FX lên backend](#4-encoding-fx-lên-backend)
5. [Request gửi lên API](#5-request-gửi-lên-api)
6. [Backend — Xử lý giao dịch FX](#6-backend--xử-lý-giao-dịch-fx)
   - 6.1 [Tạo transaction](#61-tạo-transaction)
   - 6.2 [Bỏ qua kho hàng](#62-bỏ-qua-kho-hàng)
   - 6.3 [Tổng tiền lưu DB](#63-tổng-tiền-lưu-db)
7. [In phiếu FX (ReceiptModal)](#7-in-phiếu-fx-receiptmodal)
8. [Database](#8-database)
9. [Mã lỗi & xử lý ngoại lệ](#9-mã-lỗi--xử-lý-ngoại-lệ)

---

## 1. Tổng quan nghiệp vụ

| Tiêu chí | Giá trị |
|---|---|
| `TransactionType` | `ExchangeCurrency` |
| Mã phiếu | `NT-YYYYMMDD-NNNN` |
| Hướng kho | **Không ảnh hưởng** — bỏ qua hoàn toàn |
| Giá trị lưu | Quy đổi về LAK (`fxLakAmount`) |
| Số item trong đơn | **Luôn 1** — synthetic item mã hóa thông tin FX |
| Phí gia công / đá | Không áp dụng |
| Phân quyền tạo | `TRANSACTION_CREATE` (Cashier trở lên) |
| Phân quyền cập nhật tỷ giá | `CONFIG_PRICE` (Manager trở lên) |

**Luồng tóm tắt:**

```
Manager cập nhật tỷ giá
         │  PUT /api/config/exchange-rates
         ▼
Cashier mở POS → chọn loại "ĐỔI NGOẠI TỆ"
         │
         ▼
CurrencyExchangeForm hiển thị (thay thế InvoiceItemsTable)
  ├── Chọn loại tiền khách đưa (USD, THB, ...)
  ├── Nhập số tiền
  └── Hiển thị tiền trả lại (tự tính)
         │
         ▼
PaymentDetailPanel → "LẬP KHAI & PHÁT HÀNH PHIẾU FX"
         │  POST /api/transactions
         ▼
Backend lưu 1 synthetic item, bỏ qua kho
         │
         ▼
In phiếu FX
```

---

## 2. Quản lý tỷ giá

### 2.1 Domain Entity — ExchangeRate

File: `Domain/Entities/ExchangeRate.cs`

```csharp
public class ExchangeRate
{
    public Guid     Id           { get; private set; }
    public string   CurrencyCode { get; private set; }  // "USD", "THB", "CNY", ...
    public decimal  RateToLak    { get; private set; }  // 1 ngoại tệ = X LAK (tỷ giá gốc)
    public decimal  Adjustment   { get; private set; }  // Biên độ điều chỉnh (spread)
    public Guid     UpdatedBy    { get; private set; }
    public DateTime UpdatedAt    { get; private set; }
    public DateTime EffectiveFrom{ get; private set; }  // Timestamp tạo bản ghi

    // Tỷ giá thực áp dụng = gốc + spread
    public decimal EffectiveRate => RateToLak + Adjustment;
}
```

**Ví dụ:**
```
RateToLak  = 14,200  (tỷ giá thị trường: 1 USD = 14,200 ₭)
Adjustment =    100  (spread tiệm thu thêm)
EffectiveRate = 14,300  (tỷ giá thực áp dụng cho khách: 1 USD = 14,300 ₭)
```

### 2.2 API tỷ giá

**Lấy tỷ giá hiện hành (FE gọi khi khởi tạo POS):**

```
GET /api/config/exchange-rates
Authorization: Bearer <token>
```

Response `200 OK`:
```json
[
  {
    "id": "uuid...",
    "currencyCode": "USD",
    "rateToLak": 14200,
    "adjustment": 100,
    "effectiveRate": 14300,
    "effectiveFrom": "2025-06-10T08:00:00Z"
  },
  {
    "id": "uuid...",
    "currencyCode": "THB",
    "rateToLak": 395,
    "adjustment": 5,
    "effectiveRate": 400,
    "effectiveFrom": "2025-06-10T08:00:00Z"
  }
]
```

**Cập nhật tỷ giá (Manager):**

```
POST /api/config/exchange-rates
Authorization: Bearer <token>  (policy: CONFIG_PRICE — Manager trở lên)
```

Request body:
```json
{
  "currencyCode": "USD",
  "rateToLak": 14250,
  "adjustment": 150
}
```

Response `200 OK`: Trả về bản ghi `ExchangeRate` vừa tạo.

> Mỗi lần gọi endpoint này đều **tạo bản ghi mới** (append-only) — không ghi đè bản ghi cũ.  
> Backend tự lấy bản ghi mới nhất theo `effectiveFrom` khi cashier dùng POS.

### 2.3 Lịch sử tỷ giá — append-only

Mỗi lần cập nhật **tạo bản ghi mới**, không ghi đè bản ghi cũ. Backend lấy tỷ giá hiện hành bằng cách:

```csharp
// ConfigRepository.cs
public async Task<List<ExchangeRate>> GetLatestExchangeRatesAsync(CancellationToken ct)
{
    var all = await db.ExchangeRates
        .OrderByDescending(r => r.EffectiveFrom)
        .ToListAsync(ct);

    // Lấy bản ghi mới nhất theo từng loại tiền
    return all.GroupBy(r => r.CurrencyCode)
              .Select(g => g.First())
              .ToList();
}
```

> Tỷ giá cũ giữ nguyên trong DB — dùng để tra cứu lịch sử và đối chiếu.

---

## 3. Frontend — Màn hình POS FX

### 3.1 Layout tổng thể

File: `app/(main)/pos/page.tsx`

```
POS Page (khi defaultType = "ExchangeCurrency")
┌──────────────────────────────────────┬──────────────────────┐
│  CurrencyExchangeForm                │  PaymentDetailPanel  │
│  (thay thế InvoiceItemsTable)        │  FX mode             │
│                                      │                      │
│  [USD ▼] [100      ]                 │  Chọn khách hàng     │
│          ⇄  1 USD = 14,300 ₭        │                      │
│  [LAK  ] [1,430,000₭]               │  Khách nộp quầy:     │
│                                      │  100 USD             │
│  Bảng tỷ giá:                        │  Tỷ suất: 14,300     │
│  1 USD = 14,300 ₭                   │  Khách nhận:         │
│  1 THB = 400 ₭                      │  1,430,000 ₭         │
│                                      │                      │
│                                      │  [LẬP KHAI & PHÁT   │
│                                      │   HÀNH PHIẾU FX]    │
└──────────────────────────────────────┴──────────────────────┘
```

Điều kiện render FX form:
```typescript
// page.tsx
const hasExchangeCurrency =
  inv.items.some(i => i.transactionType === "ExchangeCurrency")
  || inv.defaultType === "ExchangeCurrency";

{hasExchangeCurrency && <CurrencyExchangeForm rates={rates} counterName={counterName} />}
```

### 3.2 CurrencyExchangeForm — UI tính toán

File: `components/pos/CurrencyExchangeForm.tsx`

**3 cột layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  TIỀN KHÁCH ĐƯA          ⇄ tỷ giá      TIỀN TRẢ KHÁCH     │
│  ┌──────────┐  ┌──────┐              ┌──────────┐          │
│  │  100     │  │ USD ▼│  1 USD =     │ 1,430,000│  [LAK ▼] │
│  │          │  │      │  14,300 ₭   │          │          │
│  └──────────┘  └──────┘              └──────────┘          │
│                                      (ô hiển thị, readonly)│
│─────────────────────────────────────────────────────────────│
│  📋 1 USD = 14,300 ₭  |  1 THB = 400 ₭                    │
│  ✓ 100 USD → 1,430,000 ₭                                   │
└─────────────────────────────────────────────────────────────┘
```

**Dropdown tiền tệ:**
- Lấy từ `rates[]` + luôn có `LAK` dù không có trong bảng tỷ giá
- `toCurrency` tự động loại trừ `fromCurrency` (không cho chọn giống nhau)

**Ô nhập:**
- Cashier nhập số → format có dấu phẩy ngàn (controlled input)
- Ô kết quả: readonly, tự tính lại mỗi khi thay đổi

### 3.3 Công thức tính cross-rate

```typescript
// CurrencyExchangeForm.tsx
function getRateLak(currency: string): number {
  if (currency === "LAK") return 1;
  return rates.find(r => r.currencyCode === currency)?.effectiveRate ?? 1;
}

const fromRateLak = getRateLak(fromCurrency);  // 1 USD = 14,300 ₭
const toRateLak   = getRateLak(toCurrency);    // 1 LAK = 1 ₭  (hoặc 1 THB = 400 ₭)

const crossRate = fromRateLak / toRateLak;
// USD→LAK:  14,300 / 1      = 14,300
// USD→THB:  14,300 / 400    = 35.75
// THB→USD:  400    / 14,300 = 0.027972...

const toAmount  = fromAmount * crossRate;   // tiền khách nhận
const lakAmount = fromAmount * fromRateLak; // giá trị quy LAK (dùng ghi sổ)
```

**Các trường hợp:**

| From | To | crossRate | toAmount | lakAmount |
|---|---|---|---|---|
| USD | LAK | 14,300 | fromAmt × 14,300 | fromAmt × 14,300 |
| USD | THB | 35.75 | fromAmt × 35.75 | fromAmt × 14,300 |
| THB | LAK | 400 | fromAmt × 400 | fromAmt × 400 |
| THB | USD | 0.02797 | fromAmt × 0.02797 | fromAmt × 400 |
| LAK | USD | 0.00007 | fromAmt × 0.00007 | fromAmt × 1 |

> `lakAmount` luôn = `fromAmount × fromRateLak` — dùng để ghi `TotalAmount` trong DB (đơn vị kế toán là LAK).

### 3.4 State management (posStore)

File: `stores/posStore.ts`

**FX fields trong `InvoiceSession`:**

```typescript
fxFromCurrency: string;   // mặc định "USD"
fxToCurrency:   string;   // mặc định "LAK"
fxFromAmount:   number;   // số tiền khách đưa
fxToAmount:     number;   // số tiền khách nhận
fxLakAmount:    number;   // giá trị quy LAK
```

**Cập nhật khi cashier thao tác (useEffect trong form):**

```typescript
// mỗi khi fromCurrency, toCurrency, fromAmount thay đổi
pos.setFxData(fromCurrency, toCurrency, fromAmount, toAmount, lakAmount);
pos.setCurrency(fromCurrency, fromRateLak);  // lưu currency + exchangeRate vào session
```

**netTotal trong FX mode:**

```typescript
netTotal: () => {
  const inv = get().active();
  // FX: bỏ qua items, trả thẳng lakAmount
  if (inv.defaultType === "ExchangeCurrency") return inv.fxLakAmount;
  // Normal: totalA - totalB - voucher
  return get().totalA() - get().totalB() - inv.voucher;
}
```

> `toBackendItems()` **không tạo item nào** cho FX — item được tạo thủ công trong `PaymentDetailPanel`.

### 3.5 PaymentDetailPanel — FX mode

File: `components/pos/PaymentDetailPanel.tsx`

**Phân biệt hiển thị:**

```typescript
const isFxMode = inv.defaultType === "ExchangeCurrency";
```

**UI FX (thay thế bảng tính tiền thông thường):**

```
┌─────────────────────────────────────────┐
│  Khách nộp quầy:    100 USD             │
│  Tỷ suất quy đổi:   14,300             │
│  Khách hàng thực nhận: 1,430,000 ₭     │
│─────────────────────────────────────────│
│  ℹ Các bút toán hoán đổi ngoại tệ đã   │
│    giao tự động lên Sổ Quỹ Kết.        │
└─────────────────────────────────────────┘
```

Trong FX mode:
- Ẩn dropdown phương thức thanh toán (mặc định CASH)
- Ẩn ô "Tiền mặt khách đưa" và "Tiền thối"
- Nút submit đổi thành **"LẬP KHAI & PHÁT HÀNH PHIẾU FX (F9)"** màu teal `#00897B`
- Disable khi `inv.fxFromAmount <= 0`

**Validation trước submit (FX):**

```typescript
if (!inv.customerId)      → "Vui lòng chọn khách hàng"
if (inv.fxFromAmount <= 0) → "Vui lòng nhập số tiền cần đổi"
```

---

## 4. Encoding FX lên backend

Vì `TransactionItemRequest` không có trường riêng cho FX, frontend **mã hóa** thông tin FX vào 1 synthetic item.

> **Lưu ý quan trọng**: Với `TransactionType = ExchangeCurrency`, backend **luôn đặt `weightGram = 0`** bất kể `weightGramOverride` gửi lên là gì. `LineTotal` được tính bằng `Quantity × UnitPriceLak`. Vì vậy, để `TotalAmount` bằng giá trị LAK thực tế, `unitPriceLak` phải bằng **toàn bộ giá trị LAK** (`lakAmount`), không phải tỷ giá đơn thuần.

```typescript
// PaymentDetailPanel.tsx — handleSubmit
const fxItem = {
  productId:   fxProductId,   // UUID của product có code "FX-EXCHANGE" (seed sẵn)
  productName: `Ngoại tệ ${fromAmount.toLocaleString()} ${fromCurrency} → ${toCurrency}`,
  quantity:    1,
  weightUnitId: chiUnitId,    // đơn vị fallback (Chỉ)

  // Backend bỏ qua weightGramOverride cho ExchangeCurrency (đặt về 0)
  weightGramOverride: null,

  // LineTotal = Quantity × UnitPriceLak = 1 × lakAmount = lakAmount ✓
  unitPriceLak: lakAmount,   // = fromAmount × fromRateLak (giá trị LAK đầy đủ, VD: 1,430,000)

  itemRole:  "Normal",
  laborFee:  0,
  stoneFee:  0,
  haoHutGram: 0,
  phiHuHai:   0,
};

transactionApi.create({
  type:         "ExchangeCurrency",
  items:        [fxItem],
  currency:     fromCurrency !== "LAK" ? fromCurrency : undefined,
  exchangeRate: fromCurrency !== "LAK" ? fromRateLak : undefined,  // lưu tỷ giá để hiển thị
  note:         `FX: ${fromAmount.toLocaleString()} ${fromCurrency} → ${toAmount.toLocaleString("en", { maximumFractionDigits: 2 })} ${toCurrency}`,
  customerId:   inv.customerId,
  paymentMethod: "CASH",  // hoặc "BANK" nếu khách thanh toán qua tài khoản
});
```

**Bảng mã hoá:**

| Trường | Giá trị thực | Cách mã hoá |
|---|---|---|
| Số tiền khách đưa | `fromAmount` | Mã hóa trong `productName` và `note` |
| Giá trị quy LAK | `lakAmount` = `fromAmount × fromRateLak` | **`unitPriceLak = lakAmount`** |
| `LineTotal` (tự tính) | `lakAmount` | `Quantity(1) × UnitPriceLak(lakAmount)` |
| `TotalAmount` trong DB | `lakAmount` | Bằng `LineTotal` của item duy nhất |
| Tỷ giá tham chiếu | `fromRateLak` (VD: 14,300) | `exchangeRate` field của transaction |
| Loại tiền khách đưa | `"USD"`, `"THB"` | `currency` field của transaction |
| Mô tả giao dịch | `"100 USD → 1,430,000 ₭"` | `note` — parse lại khi in phiếu |

---

## 5. Request gửi lên API

`POST /api/transactions`

**Ví dụ: Khách đổi 100 USD lấy LAK (tỷ giá hiệu lực 14,300)**

```json
{
  "type": "ExchangeCurrency",
  "paymentMethod": "CASH",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "currency": "USD",
  "exchangeRate": 14300,
  "note": "FX: 100 USD → 1,430,000 LAK",
  "items": [
    {
      "productId": "fx-exchange-product-uuid",
      "productName": "Ngoại tệ 100 USD → LAK",
      "quantity": 1,
      "weightUnitId": "uuid-don-vi-chi",
      "weightGramOverride": null,
      "unitPriceLak": 1430000,
      "itemRole": "Normal",
      "laborFee": 0,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

> `unitPriceLak = 1,430,000` = `100 × 14,300` — **toàn bộ giá trị LAK**, không phải tỷ giá.  
> Backend sẽ tính `LineTotal = 1 × 1,430,000 = 1,430,000`, và `TotalAmount = 1,430,000 ✓`

**Ví dụ: Khách đổi 1,000 THB lấy USD (cross-rate)**

```json
{
  "type": "ExchangeCurrency",
  "paymentMethod": "CASH",
  "customerId": "...",
  "currency": "THB",
  "exchangeRate": 400,
  "note": "FX: 1,000 THB → 27.97 USD",
  "items": [
    {
      "productId": "fx-exchange-product-uuid",
      "productName": "Ngoại tệ 1,000 THB → USD",
      "quantity": 1,
      "weightUnitId": "uuid-don-vi-chi",
      "weightGramOverride": null,
      "unitPriceLak": 400000,
      "itemRole": "Normal",
      "laborFee": 0,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

> `unitPriceLak = 400,000` = `1,000 × 400` — giá trị LAK tương đương 1,000 THB.

> `branchId`, `staffId`, `counterId` không gửi — backend lấy từ JWT `sub`.  
> `paymentMethod` nhận `"CASH"` hoặc `"BANK"` (không dùng `COMBINED` cho FX vì thường là 1 chiều).

---

## 6. Backend — Xử lý giao dịch FX

File: `Application/Features/Transactions/TransactionCommands.cs`

### 6.1 Tạo transaction

```csharp
// Bước 1-2: Kiểm tra nhân viên & quầy (giống mọi loại GD)
var staff   = await userRepo.GetByIdAsync(command.CashierId, ct) ?? throw ...;
var counter = await branchRepo.GetCounterByIdAsync(staff.CounterId.Value, ct) ?? throw ...;

// Bước 3: Tạo Transaction entity
var transaction = Transaction.Create(
    TransactionType.ExchangeCurrency, staff.BranchId,
    command.CashierId, command.CashierId, counter.Id);

// Bước 4: Xử lý item FX
// Sản phẩm FX-EXCHANGE không có GoldPurityId → không tìm giá bảng
foreach (var item in req.Items)
{
    var product = await productRepo.GetByIdAsync(item.ProductId, ct)
        ?? throw new NotFoundException("PRODUCT_NOT_FOUND");

    // effectiveUnitId = item.WeightUnitId ?? chiUnit.Id (FX-EXCHANGE không có purity)
    var effectiveUnitId = item.WeightUnitId ?? chiUnit.Id;

    // weightGram = 0 cho ExchangeCurrency (không có hàng vật lý — bỏ qua weightGramOverride)
    var weightGram = req.Type == TransactionType.ExchangeCurrency
        ? 0m
        : item.WeightGramOverride ?? (item.Quantity * unit.GramPerUnit);
    // → weightGram = 0 dù frontend gửi weightGramOverride bao nhiêu

    // LineTotal = Quantity × UnitPriceLak = 1 × lakAmount = lakAmount
    transaction.AddItem(TransactionItem.Create(
        transaction.Id, item.ProductId, item.ProductName,
        item.Quantity, unit.Id, unit.TenDonVi,
        weightGram: 0,                   // ← luôn 0
        unitPriceLak: item.UnitPriceLak, // ← phải = lakAmount (VD: 1,430,000)
        tableUnitPriceLak: 0,
        item.ItemRole, ...));
}

// Bước 5: Gắn tỷ giá vào transaction (để lưu context, không ảnh hưởng TotalAmount)
if (req.Currency is not null && req.ExchangeRate.HasValue)
    transaction.SetExchangeRate(req.Currency, req.ExchangeRate.Value);
// → transactions.currency = "USD", transactions.exchange_rate = 14300

// Bước 6: Xác nhận thanh toán
transaction.FinalizePayment(req.PaymentMethod, req.CashAmount, req.BankAmount);

// Bước 7: Lưu DB
await repo.CreateAsync(transaction, ct);

// Bước 8: Cập nhật kho → BỎ QUA hoàn toàn (xem 6.2)
await ApplyInventoryChangesAsync(transaction, ct);
```

### 6.2 Bỏ qua kho hàng

```csharp
private async Task ApplyInventoryChangesAsync(Transaction transaction, CancellationToken ct)
{
    // ExchangeCurrency không có hàng vật lý → bỏ qua hoàn toàn
    if (transaction.Type == TransactionType.ExchangeCurrency)
        return;
    // ...
}
```

Khi hủy phiếu FX — phần đảo kho cũng bỏ qua:
```csharp
private async Task ReverseInventoryChangesAsync(Transaction transaction, ...)
{
    if (transaction.Type == TransactionType.ExchangeCurrency)
        return;  // Không có gì để hoàn kho
}
```

### 6.4 Hủy hóa đơn FX

`POST /api/transactions/{id}/cancel` hoạt động với phiếu FX:

- **Kho**: bỏ qua hoàn toàn (không có hàng vật lý)
- **Sổ quỹ**: vẫn tạo bút toán hoàn tiền nếu `TotalAmount > 0`
  - `ExchangeCurrency` thuộc nhóm "cửa hàng nhận tiền" → chiều hủy = **OUT** (hoàn tiền cho khách)
  - Ví dụ: huỷ phiếu `NT-20260612-XXXX` (100 USD, 1,430,000 ₭) → tạo 1 bút toán `CASH / OUT / 1,430,000 ₭`

```
POST /api/transactions/{id}/cancel
{ "reason": "Nhập sai số tiền" }
→ 204 No Content
→ Sổ quỹ: OUT CASH 1,430,000 ₭ "Hoàn tiền – hủy hóa đơn NT-..."
```

### 6.3 Tổng tiền lưu DB

`Transaction.RecalculateTotals()`:
```csharp
// Backend luôn đặt weightGram = 0 cho ExchangeCurrency:
// var weightGram = req.Type == TransactionType.ExchangeCurrency ? 0m : ...

// LineTotal = Quantity × UnitPriceLak
//           = 1 × lakAmount          (VD: 1 × 1,430,000)
//           = 1,430,000 ✓

// SubtotalAmount = Σ Normal items = 1,430,000
// TotalAmount    = SubtotalAmount - ExchangeIn + LaborFee + StoneFee
//               = 1,430,000 - 0 + 0 + 0 = 1,430,000 ✓
```

**Quan trọng**: `unitPriceLak` trong request phải bằng **giá trị LAK đầy đủ** (`fromAmount × fromRateLak`), không phải tỷ giá đơn thuần (`fromRateLak`). Ví dụ:
- ✅ Đúng: `unitPriceLak = 1,430,000` → `TotalAmount = 1,430,000 ₭`
- ❌ Sai: `unitPriceLak = 14,300` → `TotalAmount = 14,300 ₭` (chỉ bằng tỷ giá)

---

## 7. In phiếu FX (ReceiptModal)

File: `components/pos/ReceiptModal.tsx`

**Header phiếu:**
```
CURRENCY EXCHANGE BILL / PHIẾU ĐỔI NGOẠI TỆ
NT-20250615-0018        15/06/2025 14:45
Khách hàng: Somchai Phommavong
Nhân viên: NV001 — Quầy 1
```

**Nội dung giao dịch (parse từ `note`):**

```typescript
// Parse: "FX: 100 USD → 1,430,000 LAK"
function parseFxNote(note: string) {
  // regex: /FX:\s*([\d,\.]+)\s+(\w+)\s+→\s+([\d,\.]+)\s+(\w+)/
  const [_, fromAmt, fromCurr, toAmt, toCurr] = note.match(regex);
  return { fromAmt, fromCurr, toAmt, toCurr };
}

// Hiển thị:
"100 USD  →  1,430,000 ₭"
// hoặc cross-rate:
"1,000 THB  →  27.97 USD"
```

**Tổng tiền:**
```
TỔNG QUY ĐỔI TIỀN TỆ LAK:    1,430,000 ₭
```

**Phiếu mẫu:**

```
┌─────────────────────────────────────────┐
│  [LOGO]  KHAMPHUVONG GOLD & SILVER      │
│  ══════ PHIẾU ĐỔI NGOẠI TỆ ══════     │
│  NT-20250615-0018    15/06/2025 14:45  │
│─────────────────────────────────────────│
│  Khách hàng: Somchai Phommavong        │
│  Nhân viên: NV001                      │
│  Quầy: Quầy đổi tiền                  │
│─────────────────────────────────────────│
│                                         │
│    100 USD  →  1,430,000 ₭            │
│                                         │
│─────────────────────────────────────────│
│  TỔNG QUY ĐỔI TIỀN TỆ LAK:            │
│                    1,430,000 ₭         │
│─────────────────────────────────────────│
│  Tỷ giá: 1 USD = 14,300 ₭             │
│  Xin cảm ơn quý khách!                 │
└─────────────────────────────────────────┘
```

---

## 8. Database

### Bảng `exchange_rates`

```sql
CREATE TABLE exchange_rates (
    id              UUID PRIMARY KEY,
    currency_code   VARCHAR(10) NOT NULL,       -- "USD", "THB", "CNY", ...
    rate_to_lak     DECIMAL(18,4) NOT NULL,     -- tỷ giá gốc
    adjustment      DECIMAL(18,4) NOT NULL DEFAULT 0,  -- spread
    updated_by      UUID NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL,
    effective_from  TIMESTAMPTZ NOT NULL
);

-- Index tra cứu nhanh theo loại tiền + thời gian
CREATE INDEX IX_exchange_rates_CurrencyCode_EffectiveFrom
    ON exchange_rates(currency_code, effective_from DESC);
```

**Ví dụ dữ liệu:**

| currency_code | rate_to_lak | adjustment | effective_rate | effective_from |
|---|---|---|---|---|
| USD | 14,200 | 100 | 14,300 | 2025-06-10 08:00 |
| THB | 395 | 5 | 400 | 2025-06-10 08:00 |
| USD | 14,250 | 150 | 14,400 | 2025-06-11 09:30 |

> Query lấy tỷ giá hiện hành: lấy bản ghi mới nhất (theo `effective_from`) của mỗi `currency_code`.

### Bảng `transactions` — fields liên quan FX

| Column | Giá trị khi FX |
|---|---|
| `type` | `'ExchangeCurrency'` |
| `invoice_code` | `NT-YYYYMMDD-NNNN` |
| `currency` | `'USD'`, `'THB'`, ... |
| `exchange_rate` | Tỷ giá (VD: 14300) |
| `total_amount` | Giá trị quy LAK |
| `labor_fee` | `0` |
| `stone_fee` | `0` |
| `note` | `"FX: 100 USD → 1,430,000 LAK"` |
| `reference_invoice_code` | `NULL` |

---

## 9. Mã lỗi & xử lý ngoại lệ

| Mã lỗi | HTTP | Nguyên nhân | Cách sửa |
|---|---|---|---|
| `USER_NOT_FOUND` | 404 | JWT `sub` không tồn tại | Đăng xuất & đăng nhập lại |
| `COUNTER_NOT_FOUND` | 422 | Cashier chưa được phân công quầy | Admin phân công qua `PATCH /api/users/{id}/counter` |
| `PRODUCT_NOT_FOUND` | 404 | Product `FX-EXCHANGE` chưa được seed | Chạy lại DbSeeder |
| `CONFIG_RATE_NOT_FOUND` | 404 | Không có tỷ giá nào cho loại tiền này | Manager tạo tỷ giá qua `POST /api/config/exchange-rates` |
| `VALIDATION_FAILED` | 422 | `fxFromAmount <= 0` hoặc thiếu customer | Nhập đủ thông tin trước khi submit |
| `AUTH_FORBIDDEN` | 403 | Không có quyền `CONFIG_PRICE` khi cập nhật tỷ giá | Dùng tài khoản Manager trở lên |

**Lưu ý quan trọng cho frontend:**

Khi `fxFromAmount = 0` hoặc form chưa điền đầy đủ, nút submit bị disable — không cần báo lỗi từ API.  
Nếu backend trả 422 `COUNTER_NOT_FOUND`, hiển thị thông báo: *"Tài khoản của bạn chưa được phân công quầy. Vui lòng liên hệ quản lý."*
