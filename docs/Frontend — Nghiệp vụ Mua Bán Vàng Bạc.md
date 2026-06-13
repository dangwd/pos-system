# Frontend — Nghiệp vụ Mua Bán Vàng & Bạc

> Tài liệu mô tả cách frontend triển khai nghiệp vụ POS: từ luồng dữ liệu, tính toán giá, đến tương tác API.  
> Stack: React + Zustand + Ant Design + TypeScript.

---

## Mục lục

1. [Các loại giao dịch](#1-các-loại-giao-dịch)
2. [Kiến trúc tổng quan](#2-kiến-trúc-tổng-quan)
3. [Luồng dữ liệu (POS Store)](#3-luồng-dữ-liệu-pos-store)
4. [Công thức tính giá](#4-công-thức-tính-giá)
5. [Màn hình POS — Bán vàng / Bán bạc](#5-màn-hình-pos--bán-vàng--bán-bạc)
6. [Màn hình POS — Mua vàng](#6-màn-hình-pos--mua-vàng)
7. [Màn hình POS — Thu đổi vàng cũ](#7-màn-hình-pos--thu-đổi-vàng-cũ)
8. [Màn hình POS — Đổi ngoại tệ](#8-màn-hình-pos--đổi-ngoại-tệ)
9. [Màn hình Trade — Mua thêm / Đổi hàng](#9-màn-hình-trade--mua-thêm--đổi-hàng)
10. [Gửi đơn lên backend](#10-gửi-đơn-lên-backend)
11. [In hóa đơn](#11-in-hóa-đơn)
12. [Quản lý khách hàng tại POS](#12-quản-lý-khách-hàng-tại-pos)

---

## 1. Các loại giao dịch

| `TransactionType` | Tên hiển thị | Hướng tồn kho | Trang |
|---|---|---|---|
| `SellGold` | Bán vàng | Kho **giảm** | `/pos` |
| `SellSilver` | Bán bạc | Kho **giảm** | `/pos` |
| `BuyGold` | Mua vàng | Kho **tăng** | `/pos` |
| `ExchangeGold` | Thu đổi vàng cũ | Kho tăng (vàng cũ IN) + giảm (vàng mới OUT) | `/pos` |
| `ExchangeCurrency` | Đổi ngoại tệ | Không ảnh hưởng kho | `/pos` |
| `MuaThem` | Mua thêm | Kho **tăng** | `/trade` |
| `DoiHang` | Đổi hàng (có giá) | IN + OUT | `/trade` |
| `DoiMienPhi` | Đổi miễn phí | IN + OUT | `/trade` |
| `DoiThanhTien` | Đổi thành tiền | Kho **tăng** | `/trade` |

---

## 2. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│  page.tsx (/pos)                                        │
│  ┌─────────────────────────┐  ┌────────────────────┐   │
│  │  Cột trái (chính)       │  │  Cột phải (sticky) │   │
│  │  ─────────────────────  │  │  ─────────────────  │   │
│  │  PosTopBar              │  │  PaymentDetailPanel│   │
│  │  ├─ Search sản phẩm     │  │  ├─ Chọn khách     │   │
│  │  ├─ Tabs hóa đơn draft  │  │  ├─ Bảng thanh toán│   │
│  │  └─ Chọn loại GD        │  │  ├─ Phương thức TT │   │
│  │                         │  │  └─ Nút submit     │   │
│  │  InvoiceItemsTable      │  └────────────────────┘   │
│  │  ├─ Danh sách items     │                            │
│  │  └─ Tổng tiền           │                            │
│  │                         │                            │
│  │  [ExchangeGold mode]    │                            │
│  │  ExchangeInvoiceLookup  │                            │
│  │  ExchangeNewItemSearch  │                            │
│  │                         │                            │
│  │  [FX mode]              │                            │
│  │  CurrencyExchangeForm   │                            │
│  └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────┘
              │ read/write
              ▼
        posStore (Zustand)
              │
              ▼
    transactionApi.create()
              │
              ▼
    POST /api/transactions
```

---

## 3. Luồng dữ liệu (POS Store)

File: `stores/posStore.ts`

### 3.1 Cấu trúc state

```
posStore
└── invoices: InvoiceSession[]          ← nhiều tab hóa đơn song song
    └── InvoiceSession
        ├── id, seq                     ← định danh tab
        ├── defaultType                 ← SellGold | BuyGold | ExchangeGold | ExchangeCurrency
        ├── customerId                  ← UUID khách hàng đã chọn
        ├── counterId                   ← UUID quầy (lấy từ JWT khi init)
        ├── items: PosItem[]            ← danh sách sản phẩm trong đơn
        ├── paymentMethod               ← CASH | BANK
        ├── deposit, voucher            ← đặt cọc, giảm giá
        ├── note                        ← ghi chú
        │
        ├── [ExchangeGold only]
        │   ├── linkedInvoiceCode       ← mã HĐ bán vàng cũ liên kết
        │   ├── linkedInvoiceItemKeys   ← keys của các item từ HĐ cũ
        │   └── linkedInvoiceTotalAmount
        │
        └── [FX only]
            ├── fxFromCurrency, fxToCurrency
            ├── fxFromAmount, fxToAmount
            └── fxLakAmount             ← giá trị quy LAK

PosItem
├── transactionType                     ← loại GD của riêng item này
├── productId, productName, productCode
├── quantity
├── weightInUnit                        ← số chỉ/baht/gram nhập vào
├── unit                                ← "chi" | "baht" | "g"
├── weightUnitId                        ← UUID đơn vị trọng lượng (gửi lên backend)
├── unitPriceLakPerUnit                 ← giá LAK / đơn vị
├── perItemLaborFee                     ← công thợ (LAK)
├── perItemStoneFee                     ← phí đá quý (LAK)
├── perItemDamage                       ← lỗi hỏng (LAK) — ExchangeGold
├── isDamaged                           ← cờ "có lỗi hỏng"
├── perItemWearChi                      ← hao hụt (chỉ) — ExchangeGold
└── isReadOnly                          ← item từ HĐ cũ, không sửa
```

### 3.2 Vòng đời một hóa đơn

```
addInvoice(type)
    │
    ▼
InvoiceSession được tạo (id = uuid, seq = N)
    │
    ├── addItem(product, price)         ← cashier click sản phẩm
    │       └── PosItem pushed vào items[]
    │
    ├── updateItem(key, patch)          ← chỉnh sửa: giá, cân, phí
    │
    ├── removeItem(key)
    │
    ├── setCustomerId(id)               ← chọn khách hàng
    │
    ├── setDeposit(amount)              ← đặt cọc
    │
    └── submit → toBackendItems()
                    └── CreateTransactionRequest gửi lên API
```

---

## 4. Công thức tính giá

### 4.1 Giá đơn vị

| Loại GD | Đơn vị giá gốc | `unitPriceLakPerUnit` mặc định |
|---|---|---|
| `SellGold` | LAK / Chỉ | `goldBuyPricePerChi` (giá bán ra cho khách) |
| `BuyGold` | LAK / Chỉ | `goldSellPricePerChi` (giá mua vào từ khách) |
| `ExchangeGold` — hàng mới | LAK / Chỉ | `goldBuyPricePerChi` |
| `ExchangeGold` — hàng cũ | LAK / Chỉ | `goldSellPricePerChi` |
| `SellSilver` | LAK / gram | `silverPricePerGram` |

> **Giá được snapshot tại thời điểm thêm item** vào đơn. Cashier có thể sửa tay.

### 4.2 Line total của một item

```
Bước 1: weightFactor
  ├── unit = "chi"  → weightFactor = weightInUnit
  ├── unit = "baht" → weightFactor = weightInUnit × (gramPerBath / gramPerChi)
  └── unit = "g"    → weightFactor = weightInUnit / gramPerChi

Bước 2: rawTotal = weightFactor × unitPriceLakPerUnit

Bước 3: adjustments
  ├── [ExchangeGold] wearDeduction = perItemWearChi × unitPriceLakPerUnit
  └── lineTotal = rawTotal + laborFee + stoneFee - damage - wearDeduction

  [SellSilver]
  └── lineTotal = weightInGram × unitPriceLakPerGram + laborFee + stoneFee
```

### 4.3 Tổng hóa đơn

```
totalA = Σ lineTotal của tất cả SellGold / SellSilver / ExchangeGold[Normal] items
totalB = Σ lineTotal của tất cả BuyGold / ExchangeGold[ExchangeIn] items

netTotal:
  ├── FX mode     → fxLakAmount
  └── Normal mode → totalA - totalB - voucher

Tiền thối = tiền khách đưa - (netTotal - deposit)
```

---

## 5. Màn hình POS — Bán vàng / Bán bạc

**Loại GD:** `SellGold`, `SellSilver`

### Luồng thao tác

```
1. Cashier chọn tab "Bán vàng" hoặc tạo HĐ mới loại SellGold/SellSilver
2. Gõ tên/mã sản phẩm vào PosTopBar → AutoComplete từ GET /api/products
3. Click chọn sản phẩm → addItem() vào store
4. Trong InvoiceItemsTable: chỉnh cân nặng, đơn giá, công thợ, phí đá
5. Chọn khách hàng (PaymentDetailPanel)
6. Nhập tiền mặt khách đưa → hiển thị tiền thối
7. Click "THANH TOÁN & IN" → submit
```

### Dữ liệu gửi lên API

```json
{
  "type": "SellGold",
  "paymentMethod": "CASH",
  "customerId": "uuid...",
  "items": [
    {
      "productId": "uuid...",
      "productName": "Vàng dây 9999 — 1 Cây",
      "quantity": 1,
      "weightUnitId": "uuid-cay",
      "unitPriceLak": 570000000,
      "itemRole": "Normal",
      "laborFee": 50000,
      "stoneFee": 0
    }
  ]
}
```

> `branchId`, `staffId`, `counterId` **không gửi** — backend lấy từ JWT claim.

---

## 6. Màn hình POS — Mua vàng

**Loại GD:** `BuyGold`

Cùng luồng với bán vàng, chỉ khác:
- `unitPriceLakPerUnit` mặc định = `goldSellPricePerChi` (thấp hơn giá bán)
- Hướng tồn kho: IN (nhập kho)
- Nhãn tổng tiền trên receipt: **"TỔNG CHI TRẢ KHÁCH"**

---

## 7. Màn hình POS — Thu đổi vàng cũ

**Loại GD:** `ExchangeGold`

Layout đặc biệt — 2 panel dọc:
- **Panel trên** (`filterByTypes=["ExchangeIn"]`): Hàng vàng cũ khách đổi vào
- **Panel dưới** (`filterByTypes=["SellGold"]`): Hàng vàng mới bán ra

### Luồng thao tác

```
1. Tạo HĐ loại ExchangeGold
2. [Tùy chọn] Tra HĐ bán vàng cũ qua ExchangeInvoiceLookup
   └── Gọi GET /api/transactions?invoiceCode=HD-xxx&type=SellGold
   └── setLinkedInvoice() → tự động load items với itemRole="ExchangeIn"
       ├── Giá mặc định: goldSellPricePerChi (giá mua vào)
       └── isReadOnly = true (không sửa được)
3. [Hoặc] Thêm tay vàng cũ vào panel trên
4. Thêm hàng vàng mới vào panel dưới (ExchangeNewItemSearch)
5. Nhập phí hao hụt (LAO SUT — chỉ) và lỗi hỏng (PHÍ KHÒ — kip) cho từng item cũ
6. Xem chênh lệch: netTotal = totalA (vàng mới) - totalB (vàng cũ)
   ├── Dương: Khách phải trả thêm
   └── Âm: Tiệm trả lại khách
7. Submit
```

### Cách encode PHÍ KHÒ / LAO SUT lên backend

Vì `TransactionItemRequest` không có trường riêng cho 2 phí này, frontend encode vào trường sẵn có:

```typescript
// posStore.ts — toBackendItems()
{
  laborFee: item.perItemDamage,       // PHÍ KHÒ (kip)
  haoHutGram: item.perItemWearChi * gramPerChi,  // LAO SUT → đổi sang gram
}
```

---

## 8. Màn hình POS — Đổi ngoại tệ

**Loại GD:** `ExchangeCurrency`

### UI

Thay thế `InvoiceItemsTable` bằng `CurrencyExchangeForm`:

```
┌──────────────────────────────────────────────────────┐
│  TIỀN KHÁCH ĐƯA        ⇄      TIỀN TRẢ KHÁCH        │
│  [100] [USD ▼]    1 USD = 14,300 ₭    [1,430,000 ₭] │
└──────────────────────────────────────────────────────┘
```

### Tính tỷ giá cross-rate

```
Nếu from = USD, to = THB:
  fxLakAmount = fromAmount × rateUSD.effectiveRate
  toAmount    = fxLakAmount / rateTHB.effectiveRate

Nếu from = USD, to = LAK:
  fxLakAmount = fromAmount × rateUSD.effectiveRate
  toAmount    = fxLakAmount
```

### Synthetic item gửi lên backend

```typescript
{
  productId:   "fx-exchange-product-id",
  productName: "100 USD → 1,430,000 LAK",
  quantity:    1,
  weightUnitId: chiUnit.id,     // đơn vị fallback
  unitPriceLak: fxLakAmount,
  itemRole:    "Normal"
}
```

---

## 9. Màn hình Trade — Mua thêm / Đổi hàng

File: `app/(main)/trade/page.tsx` — gọi `POST /api/trade` (khác endpoint với POS).

### 4 loại Trade

| `TradeType` | Mô tả | Có hàng cũ? | Có hàng mới? |
|---|---|---|---|
| `MuaThem` | Mua thêm từ khách | ✅ | ❌ |
| `DoiHang` | Đổi hàng có tính chênh lệch | ✅ | ✅ |
| `DoiMienPhi` | Đổi miễn phí (lỗi sản xuất) | ✅ | ✅ |
| `DoiThanhTien` | Đổi lấy tiền, không lấy hàng mới | ✅ | ❌ |

### Công thức tính chênh lệch

```
chenhLech = giaTriMoi + tienCong + tienHaoHut - giaTriCu - phiHuHai

giaTriCu  = weightCu  × goldSellPricePerChi   (giá mua vào)
giaTriMoi = weightMoi × goldBuyPricePerChi    (giá bán ra)
```

- `chenhLech > 0`: Khách trả thêm tiền
- `chenhLech < 0`: Tiệm trả tiền lại khách
- `DoiMienPhi`: Bắt buộc nhập `ngayMuaCu`, chênh lệch thường = 0

### Dữ liệu gửi lên API

```json
{
  "loai": "DoiHang",
  "itemCuId": "uuid...",
  "itemCuName": "Nhẫn vàng 18K",
  "itemCuWeightMg": 37500,
  "itemMoiId": "uuid...",
  "itemMoiName": "Vòng vàng 24K",
  "itemMoiWeightMg": 37500,
  "giaTriCu": 285000000,
  "giaTriMoi": 300000000,
  "phiHuHai": 0,
  "tienHaoHut": 5000000,
  "tienCong": 50000,
  "chenhLech": 70050000,
  "ngayMuaCu": null
}
```

---

## 10. Gửi đơn lên backend

File: `lib/api.ts` — `transactionApi.create()`

```typescript
// Mapping từ PosStore → CreateTransactionRequest
function toBackendRequest(session: InvoiceSession): CreateTransactionRequest {
  return {
    type:          session.defaultType,
    paymentMethod: session.paymentMethod,
    customerId:    session.customerId ?? undefined,
    deposit:       session.deposit,
    note:          session.note,
    referenceInvoiceCode: session.linkedInvoiceCode,
    items: session.items.map(item => ({
      productId:        item.productId,
      productName:      item.productName,
      quantity:         item.quantity,
      weightUnitId:     item.weightUnitId,      // UUID đơn vị (bắt buộc với vàng/bạc)
      weightGramOverride: item.unit === "g"
                          ? item.weightInUnit
                          : undefined,
      unitPriceLak:     item.unitPriceLakPerUnit,
      itemRole:         item.transactionType === "ExchangeGold"
                          && item.isReadOnly ? "ExchangeIn" : "Normal",
      laborFee:         item.perItemDamage,     // PHÍ KHÒ
      stoneFee:         item.perItemStoneFee,
      haoHutGram:       item.perItemWearChi * gramPerChi,
    }))
  };
}
```

### Xử lý response

| Kết quả | Hành động frontend |
|---|---|
| `201 Created` — trả `{ id }` | Gọi `GET /api/transactions/{id}` để load full → mở `ReceiptModal` |
| `422 COUNTER_NOT_FOUND` | User chưa được phân công quầy — báo lỗi |
| `422 PRODUCT_PRICE_NOT_CONFIGURED` | Thiếu `weightUnitId` hoặc bảng giá chưa cấu hình |
| `422 INVENTORY_NOT_FOUND` | Sản phẩm không có trong kho quầy này |
| `422 INVENTORY_INSUFFICIENT_STOCK` | Số lượng tồn kho không đủ |

---

## 11. In hóa đơn

Component: `components/pos/ReceiptModal.tsx`

Receipt được render theo loại giao dịch:

| Loại | Layout đặc biệt |
|---|---|
| `SellGold` / `SellSilver` | Items + tổng thu tiền |
| `BuyGold` | Items + tổng chi trả khách |
| `ExchangeGold` | 2 section: **Hàng đổi vào** (credit) + **Hàng bán ra** (debit) + chênh lệch |
| `ExchangeCurrency` | `100 USD → 1,430,000 LAK` + tỷ giá |

In bằng `window.print()` với CSS `@media print` (80mm thermal printer).

---

## 12. Quản lý khách hàng tại POS

Trong `PaymentDetailPanel`:

```
Search khách: GET /api/customers?q=<tên/sĐT>&limit=5
                └── AutoComplete dropdown
                        ├── Chọn → setCustomerId()
                        └── "Thêm mới" → Modal
                                ├── Nhập: name, phoneNumber, loyaltyTier
                                └── POST /api/customers
                                        └── setCustomerId(newId)
```

**Hạng thành viên** (`loyaltyTier`) hiển thị tag màu tại quầy:
- `silver` — Thành viên thường
- `gold` — Khách thân thiết
- `platinum` — VIP

---

## Sơ đồ trạng thái giao dịch

```
[POS tạo đơn]
      │
      ▼
   DRAFT ──► (hủy tab, không lưu DB)
      │
      │ submit
      ▼
  PENDING ──────────────────────────┐
      │                             │
      │ Manager Approve             │ Manager Reject
      ▼                             ▼
  APPROVED                      REJECTED
      │
      │ Complete (thanh toán)
      ▼
  COMPLETED ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (không thể sửa/xóa)
```

> Frontend POS tạo đơn ở trạng thái `PENDING` (hoặc `DRAFT` nếu đặt cọc).  
> Workflow phê duyệt thực hiện qua màn hình quản lý.
