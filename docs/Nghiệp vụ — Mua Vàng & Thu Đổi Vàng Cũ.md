# Nghiệp vụ — Mua Vàng & Thu Đổi Vàng Cũ

> Tài liệu chi tiết end-to-end cho 2 màn hình: **Lập đơn Mua Vàng** (`BuyGold`) và **Thu Đổi Vàng Cũ** (`ExchangeGold`).  
> Bao gồm luồng UI, state management, công thức tính toán, request/response API và xử lý backend.

---

## Mục lục

1. [So sánh tổng quan 2 nghiệp vụ](#1-so-sánh-tổng-quan-2-nghiệp-vụ)
2. [Màn hình Mua Vàng — BuyGold](#2-màn-hình-mua-vàng--buygold)
   - 2.1 [Luồng UI](#21-luồng-ui)
   - 2.2 [State management](#22-state-management)
   - 2.3 [Tính toán giá](#23-tính-toán-giá)
   - 2.4 [Request gửi lên API](#24-request-gửi-lên-api)
3. [Màn hình Thu Đổi Vàng Cũ — ExchangeGold](#3-màn-hình-thu-đổi-vàng-cũ--exchangegold)
   - 3.1 [Luồng UI](#31-luồng-ui)
   - 3.2 [Tra cứu hóa đơn cũ](#32-tra-cứu-hóa-đơn-cũ)
   - 3.3 [State management](#33-state-management)
   - 3.4 [Tính toán giá — PHÍ KHÒ & LAO SUT](#34-tính-toán-giá--phí-khò--lao-sut)
   - 3.5 [Encoding PHÍ KHÒ / LAO SUT lên backend](#35-encoding-phí-khò--lao-sut-lên-backend)
   - 3.6 [Request gửi lên API](#36-request-gửi-lên-api)
4. [Backend — Validation](#4-backend--validation)
5. [Backend — Handler xử lý lệnh tạo GD](#5-backend--handler-xử-lý-lệnh-tạo-gd)
   - 5.1 [Kiểm tra điều kiện](#51-kiểm-tra-điều-kiện)
   - 5.2 [Xử lý từng item](#52-xử-lý-từng-item)
   - 5.3 [Tính tổng & cập nhật kho](#53-tính-tổng--cập-nhật-kho)
6. [Backend — Domain Entity](#6-backend--domain-entity)
7. [Backend — Database](#7-backend--database)
8. [In hóa đơn](#8-in-hóa-đơn)
9. [Mã lỗi & xử lý ngoại lệ](#9-mã-lỗi--xử-lý-ngoại-lệ)

---

## 1. So sánh tổng quan 2 nghiệp vụ

| Tiêu chí | Mua Vàng (`BuyGold`) | Thu Đổi Vàng Cũ (`ExchangeGold`) |
|---|---|---|
| **Mã hóa đơn** | `MV-YYYYMMDD-NNNN` | `DV-YYYYMMDD-NNNN` |
| **Ai trả tiền** | Tiệm trả tiền cho khách | Tính chênh lệch; khách trả thêm hoặc tiệm trả lại |
| **Hướng kho** | IN — nhập kho | IN (vàng cũ) + OUT (vàng mới) |
| **Giá áp dụng** | `goldSellPricePerChi` (giá mua vào) | ExchangeIn: `goldSellPricePerChi`; Normal: `goldBuyPricePerChi` |
| **ItemRole** | `Normal` | `ExchangeIn` (hàng cũ) + `Normal` (hàng mới) |
| **Hóa đơn liên kết** | ❌ Không | ✅ Tùy chọn — liên kết HĐ bán vàng cũ |
| **PHÍ KHÒ / LAO SUT** | ❌ Không | ✅ Có — nhập tay per item |
| **Layout POS** | Cột đơn tiêu chuẩn | **2 panel dọc** (hàng cũ + hàng mới) |
| **Tổng tiền hiển thị** | "TIỆM PHẢI CHI" | Có thể dương (thu thêm) hoặc âm (chi trả) |

---

## 2. Màn hình Mua Vàng — BuyGold

### 2.1 Luồng UI

```
PosTopBar
  └── Tạo HĐ mới → chọn "MUA VÀNG" (defaultType = "BuyGold")
          │
          ▼
  Gõ tên/mã sản phẩm vào ô tìm kiếm
  └── GET /api/products?search=...
  └── AutoComplete → click chọn → addItem() vào store
          │
          ▼
  InvoiceItemsTable — hiển thị danh sách items
  ├── Cân nặng (chỉnh sửa được)
  ├── Đơn giá (mặc định = goldSellPricePerChi, chỉnh sửa được)
  ├── Công thợ (hidden với BuyGold — tiệm mua không thu công)
  ├── Đá quý (hidden)
  └── Thành tiền (màu xanh #0277BD — "tiệm chi ra")
          │
          ▼
  PaymentDetailPanel (cột phải)
  ├── Chọn khách hàng (bắt buộc)
  ├── Tổng khách mua (A): 0
  ├── Căn trừ vàng cũ (B): tổng items (màu tím)
  ├── Voucher
  ├── "💵 TIỀN THỰC TIỆM TRẢ KHÁCH (CHI OUT):" = |netTotal|
  ├── Phương thức: CASH / BANK
  └── Nút "MUA VÀO & IN"
```

### 2.2 State management

File: `stores/posStore.ts`

```typescript
// Khi addItem() cho BuyGold:
{
  transactionType: "BuyGold",
  productId:       product.id,
  productName:     product.productName,
  productCode:     product.productCode,
  quantity:        1,
  weightInUnit:    product.weightPerUnitMg / UNIT_TO_MG["chi"],  // chuyển về chỉ
  unit:            "chi",
  weightUnitId:    product.weightUnitId,
  unitPriceLakPerUnit: prices.goldSellPricePerChi,  // giá mua vào
  perItemLaborFee: 0,
  perItemStoneFee: 0,
  perItemDamage:   0,
  perItemWearChi:  0,
  isDamaged:       false,
  isReadOnly:      false,
}
```

**Computed trong store:**

```typescript
// totalA() — chỉ tính SellGold / SellSilver / ExchangeCurrency
// → BuyGold KHÔNG vào totalA
totalA() = 0  // (khi đơn chỉ có BuyGold items)

// totalB() — tính BuyGold + ExchangeGold items
totalB() = Σ itemLineTotal(item)  // cho tất cả BuyGold items

// netTotal() = totalA - totalB - voucher
netTotal() = 0 - totalB - 0 = -totalB  // âm → tiệm phải trả

// PaymentDetailPanel hiển thị Math.abs(netTotal())
```

### 2.3 Tính toán giá

```
weightFactor:
  unit = "chi"  → weightFactor = weightInUnit
  unit = "baht" → weightFactor = weightInUnit × (gramPerBath / gramPerChi)
  unit = "g"    → weightFactor = weightInUnit / gramPerChi

itemLineTotal (BuyGold) =
  weightFactor × unitPriceLakPerUnit
  + perItemLaborFee      (thường = 0 khi mua vào)
  + perItemStoneFee      (thường = 0)
  - perItemDamage        (thường = 0)
  - (perItemWearChi × unitPriceLakPerUnit)  (thường = 0)

Tổng tiệm trả khách = totalB = Σ itemLineTotal
```

**Ví dụ thực tế:**

```
Mua 1 lượng vàng 9999, giá mua vào 3,800,000 ₭/chỉ
  weightFactor = 1 lượng = 10 chỉ
  itemLineTotal = 10 × 3,800,000 = 38,000,000 ₭
  totalB = 38,000,000 ₭
  netTotal = -38,000,000 ₭
  → Tiệm trả khách 38,000,000 ₭
```

### 2.4 Request gửi lên API

`POST /api/transactions`

```json
{
  "type": "BuyGold",
  "paymentMethod": "CASH",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "depositAmount": 0,
  "note": null,
  "items": [
    {
      "productId": "7b8bdd14-ce30-41c5-b2fb-dd4f2dbc1816",
      "productName": "Vàng miếng SJC 1 Lượng",
      "quantity": 1,
      "weightUnitId": "uuid-cua-don-vi-luong",
      "weightGramOverride": null,
      "unitPriceLak": 3800000,
      "itemRole": "Normal",
      "laborFee": 0,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

> **Lưu ý:** `branchId`, `staffId`, `counterId` **không gửi** — backend tự lấy từ JWT claim `sub`.

---

## 3. Màn hình Thu Đổi Vàng Cũ — ExchangeGold

### 3.1 Luồng UI

```
PosTopBar
  └── Tạo HĐ mới → chọn "THU ĐỔI VÀNG CŨ" (defaultType = "ExchangeGold")
          │
          ▼
  Layout 2 panel dọc:

  ┌─── PANEL TRÊN: "ĐỔI VÀNG — Sản phẩm từ hóa đơn cũ" ───────────┐
  │  ExchangeInvoiceLookup                                           │
  │  ├── Tìm HĐ bán vàng cũ theo mã (tùy chọn)                     │
  │  └── Load items cũ → ExchangeGold, isReadOnly = true            │
  │                                                                  │
  │  [Hoặc thêm tay vàng cũ]                                        │
  │                                                                  │
  │  InvoiceItemsTable (filterByTypes=["ExchangeGold"])              │
  │  ├── Items read-only (từ HĐ cũ) hoặc có thể sửa (thêm tay)      │
  │  ├── Cột "LỖI HỎNG" — checkbox kích hoạt PHÍ KHÒ               │
  │  ├── Cột "HAO HỤT/MÓP" — popover nhập PHÍ KHÒ + LAO SUT        │
  │  └── Footer: "TỔNG KHẨU TRỪ VÀNG CŨ: B₭"                      │
  └──────────────────────────────────────────────────────────────────┘

  ┌─── PANEL DƯỚI: "BÁN VÀNG / MUA THÊM" ──────────────────────────┐
  │  ExchangeNewItemSearch                                           │
  │  └── Tìm sản phẩm mới → addItem(SellGold)                      │
  │                                                                  │
  │  InvoiceItemsTable (filterByTypes=["SellGold","SellSilver"])     │
  │  └── Footer: "TỔNG HÀNG BÁN RA (A): A₭"                        │
  └──────────────────────────────────────────────────────────────────┘

          │
          ▼
  PaymentDetailPanel (cột phải)
  ├── Tổng khách mua (A): totalA
  ├── Căn trừ vàng cũ (B): totalB  (màu tím)
  ├── Voucher
  ├── [A > B] "★ TIỀN THỰC THU CỦA KHÁCH (THU IN):" = A - B
  │   [A < B] "💵 TIỆM PHẢI TRẢ THÊM CHO KHÁCH:" = B - A
  ├── Tra cứu HĐ cũ liên kết (đọc thêm thông tin)
  └── Nút "THANH TOÁN & IN"
```

### 3.2 Tra cứu hóa đơn cũ

Component: `components/pos/ExchangeInvoiceLookup.tsx`

```
1. Cashier gõ mã HĐ (ví dụ: "BV-20250615-0003")
   └── Debounce 400ms
   └── GET /api/transactions?invoiceCode=BV-20250615-0003

2. Backend trả về danh sách HĐ khớp (lọc loại SellGold)

3. Cashier chọn HĐ → handleSelect() chạy:
   ├── Lấy items từ transaction.items
   ├── Convert sang PosItem với:
   │     transactionType: "ExchangeGold"
   │     unitPriceLakPerUnit: prices.goldSellPricePerChi   ← giá mua vào
   │     isReadOnly: true                                   ← không sửa được
   │     weightInUnit: item.weightMg / 3750               ← đổi sang chỉ
   └── pos.setLinkedInvoice(code, items, total)

4. Hiển thị badge mã HĐ + nút [Xem HĐ] [✕ Xóa liên kết]
```

**Khi xóa liên kết:**
```typescript
pos.clearLinkedInvoice()
// → Xóa toàn bộ items có key nằm trong linkedInvoiceItemKeys
// → Reset linkedInvoiceCode, linkedInvoiceTotalAmount
```

**Lưu ý:** Khách có thể KHÔNG cần liên kết HĐ cũ — cashier có thể thêm vàng cũ tay trực tiếp.

### 3.3 State management

File: `stores/posStore.ts`

**InvoiceSession khi là ExchangeGold:**

```typescript
{
  defaultType: "ExchangeGold",
  items: [
    // Items từ HĐ cũ (ExchangeIn)
    {
      transactionType: "ExchangeGold",
      isReadOnly: true,
      itemRole: "ExchangeIn",           // gửi lên backend
      unitPriceLakPerUnit: goldSellPricePerChi,
      perItemDamage: 0,                 // PHÍ KHÒ (kip) — điền sau
      perItemWearChi: 0,                // LAO SUT (chỉ) — điền sau
      isDamaged: false,
    },
    // Items mới bán ra (Normal)
    {
      transactionType: "SellGold",
      isReadOnly: false,
      unitPriceLakPerUnit: goldBuyPricePerChi,
    }
  ],
  linkedInvoiceCode: "BV-20250615-0003",
  linkedInvoiceItemKeys: ["key1", "key2"],
  linkedInvoiceTotalAmount: 95000000,
}
```

**setLinkedInvoice():**

```typescript
setLinkedInvoice(code, newItems, total) {
  // 1. Xóa các items từ HĐ cũ trước đó (nếu có)
  const keysToRemove = active.linkedInvoiceItemKeys
  active.items = active.items.filter(i => !keysToRemove.includes(i.key))

  // 2. Thêm items mới từ HĐ cũ vào đầu mảng
  active.items = [...newItems, ...active.items]
  active.linkedInvoiceCode = code
  active.linkedInvoiceItemKeys = newItems.map(i => i.key)
  active.linkedInvoiceTotalAmount = total
}
```

### 3.4 Tính toán giá — PHÍ KHÒ & LAO SUT

**PHÍ KHÒ** (`perItemDamage`): Chi phí vàng bị hỏng, đúc lại — tính bằng **Kip**.

**LAO SUT** (`perItemWearChi`): Hao hụt trọng lượng do mài mòn — tính bằng **Chỉ**, sau đó nhân với giá để ra Kip.

```
itemLineTotal (ExchangeGold — ExchangeIn) =
  weightFactor × unitPriceLakPerUnit   ← giá trị vàng cũ
  - perItemDamage                       ← trừ PHÍ KHÒ (kip)
  - (perItemWearChi × unitPriceLakPerUnit)  ← trừ LAO SUT (chỉ → kip)

itemLineTotal (SellGold — Normal) =
  weightFactor × unitPriceLakPerUnit   ← giá vàng mới
  + perItemLaborFee
  + perItemStoneFee

totalA = Σ lineTotal của SellGold items
totalB = Σ lineTotal của ExchangeGold items

netTotal = totalA - totalB - voucher
  > 0  → khách trả thêm tiền
  < 0  → tiệm trả lại khách
  = 0  → hoà vốn (đổi ngang)
```

**Ví dụ thực tế:**

```
Khách đổi nhẫn vàng cũ 2 chỉ (có LAO SUT 0.2 chỉ, PHÍ KHÒ 50,000₭)
  goldSellPricePerChi = 3,700,000 ₭/chỉ
  
  itemLineTotal (ExchangeIn) =
    2 × 3,700,000
    - 50,000                           ← PHÍ KHÒ
    - (0.2 × 3,700,000)                ← LAO SUT = 740,000₭
    = 7,400,000 - 50,000 - 740,000
    = 6,610,000 ₭                      ← tiệm trả cho vàng cũ

Khách lấy vòng vàng mới 2 chỉ, công thợ 100,000₭
  goldBuyPricePerChi = 3,800,000 ₭/chỉ
  
  itemLineTotal (Normal) =
    2 × 3,800,000 + 100,000
    = 7,700,000 ₭

netTotal = 7,700,000 - 6,610,000 = 1,090,000 ₭
→ Khách trả thêm 1,090,000 ₭
```

### 3.5 Encoding PHÍ KHÒ / LAO SUT lên backend

`TransactionItemRequest` không có trường riêng cho PHÍ KHÒ và LAO SUT của ExchangeGold.  
Frontend encode như sau trong `posStore.toBackendItems()`:

```typescript
// ExchangeGold item → backend
{
  productId:        item.productId,
  productName:      item.productName
                    + (hasPhiKho || hasLaoSut
                       ? ` [PHÍ KHÒ: ${fmt(item.perItemDamage)}₭ | LAO SUT: ${item.perItemWearChi} Chỉ]`
                       : ""),
  quantity:         item.quantity,
  weightUnitId:     item.weightUnitId,

  // Trọng lượng NET sau khi trừ LAO SUT
  weightGramOverride: (item.weightInChi - item.perItemWearChi) * gramPerChi,

  unitPriceLak:     item.unitPriceLakPerUnit,
  itemRole:         "ExchangeIn",

  laborFee:         item.perItemDamage,    // PHÍ KHÒ encode vào laborFee
  stoneFee:         0,
  haoHutGram:       item.perItemWearChi * gramPerChi,  // LAO SUT → gram
  phiHuHai:         0,
}
```

> **Backend** lưu `haoHutGram` và `phiHuHai` vào `TransactionItem` entity (dùng cho báo cáo).  
> **ReceiptModal** parse lại chuỗi `[PHÍ KHÒ: ... | LAO SUT: ...]` để hiển thị đẹp trên phiếu.

### 3.6 Request gửi lên API

`POST /api/transactions`

```json
{
  "type": "ExchangeGold",
  "paymentMethod": "CASH",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "referenceInvoiceCode": "BV-20250615-0003",
  "depositAmount": 0,
  "note": "Đổi nhẫn cưới lấy vòng tay",
  "items": [
    {
      "productId": "aaa-bbb-ccc",
      "productName": "Nhẫn vàng 18K 2 chỉ [PHÍ KHÒ: 50,000₭ | LAO SUT: 0.2 Chỉ]",
      "quantity": 1,
      "weightUnitId": "uuid-don-vi-chi",
      "weightGramOverride": 6.75,
      "unitPriceLak": 3700000,
      "itemRole": "ExchangeIn",
      "laborFee": 50000,
      "stoneFee": 0,
      "haoHutGram": 0.75,
      "phiHuHai": 0
    },
    {
      "productId": "ddd-eee-fff",
      "productName": "Vòng vàng 24K 2 chỉ",
      "quantity": 1,
      "weightUnitId": "uuid-don-vi-chi",
      "weightGramOverride": null,
      "unitPriceLak": 3800000,
      "itemRole": "Normal",
      "laborFee": 100000,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

---

## 4. Backend — Validation

File: `Application/Validators/CreateTransactionValidator.cs`

| Rule | Điều kiện | Lỗi trả về |
|---|---|---|
| `Items.NotEmpty` | Phải có ít nhất 1 item | `VALIDATION_FAILED` |
| `Items.Count <= 50` | Tối đa 50 dòng | `VALIDATION_FAILED` |
| `PaymentMethod` | Phải là `"CASH"` hoặc `"BANK"` | `VALIDATION_FAILED` |
| `ProductId.NotEmpty` | Mỗi item có ProductId | `VALIDATION_FAILED` |
| `ProductName.MaxLength(200)` | Tên SP tối đa 200 ký tự | `VALIDATION_FAILED` |
| `Quantity > 0` | Số lượng dương | `VALIDATION_FAILED` |
| `UnitPriceLak >= 0` | Đơn giá không âm | `VALIDATION_FAILED` |
| `LaborFee >= 0` | Phí công không âm | `VALIDATION_FAILED` |
| `StoneFee >= 0` | Phí đá không âm | `VALIDATION_FAILED` |

> Validation chạy **trước** handler qua `ValidationBehavior` (MediatR pipeline).

---

## 5. Backend — Handler xử lý lệnh tạo GD

File: `Application/Features/Transactions/TransactionCommands.cs`

### 5.1 Kiểm tra điều kiện

```csharp
// Bước 1: Lấy thông tin nhân viên từ JWT
var staff = await userRepo.GetByIdAsync(command.CashierId, ct)
    ?? throw new NotFoundException("USER_NOT_FOUND");

// Bước 2: Nhân viên phải có quầy được phân công
if (staff.CounterId is null)
    throw new BusinessRuleException("COUNTER_NOT_FOUND");

var counter = await branchRepo.GetCounterByIdAsync(staff.CounterId.Value, ct)
    ?? throw new BusinessRuleException("COUNTER_NOT_FOUND");

var branchId = staff.BranchId;    // ← lấy từ nhân viên, không từ client

// Bước 3: ExchangeFree — kiểm tra HĐ tham chiếu (BuyGold & ExchangeGold bỏ qua bước này)
```

### 5.2 Xử lý từng item

```csharp
// Tạo Transaction entity
var transaction = Transaction.Create(req.Type, branchId, cashierId, cashierId, counter.Id);

// Load bảng giá hiện hành (dùng để tra tableUnitPriceLak)
var priceConfig = await configRepo.GetCurrentPricesAsync(ct);

foreach (var item in req.Items)
{
    var product = await productRepo.GetByIdAsync(item.ProductId, ct)
        ?? throw new NotFoundException("PRODUCT_NOT_FOUND");

    // Xác định effectiveUnitId và priceConfigItemId
    if (product.GoldPurityId is Guid gpId)
    {
        // Vàng/Bạc: bắt buộc có WeightUnitId
        if (item.WeightUnitId is not Guid selectedUnitId)
            throw new BusinessRuleException("PRODUCT_PRICE_NOT_CONFIGURED");

        // Tra dòng bảng giá khớp (GoldPurityId + WeightUnitId)
        priceConfigItemId = priceConfig.Items
            .FirstOrDefault(i => i.GoldPurityId == gpId && i.WeightUnitId == selectedUnitId)
            ?.Id ?? throw new BusinessRuleException("PRODUCT_PRICE_NOT_CONFIGURED");

        effectiveUnitId = selectedUnitId;
    }
    else
    {
        // Không phải vàng/bạc (đá, ngoại tệ): dùng ChỉUnit làm fallback
        effectiveUnitId = item.WeightUnitId ?? chiUnit.Id;
    }

    // Tính trọng lượng gram
    var weightGram = item.WeightGramOverride          // CanThucTe: ghi đè
                  ?? (item.Quantity * unit.GramPerUnit); // NguyenKhoi: tự tính

    // Tra giá bảng (snapshot — chỉ để lưu tham chiếu, không dùng tính tiền)
    var tableUnitPriceLak = ResolveTablePrice(product, item.WeightUnitId, req.Type, item.ItemRole);

    transaction.AddItem(TransactionItem.Create(
        transaction.Id, item.ProductId, item.ProductName,
        item.Quantity, unit.Id, unit.TenDonVi, weightGram,
        item.UnitPriceLak,       // ← giá cashier nhập (giá thị trường thực tế)
        tableUnitPriceLak,       // ← giá bảng (reference)
        item.ItemRole,
        item.LaborFee, item.StoneFee,
        item.HaoHutGram, item.PhiHuHai,
        priceConfigItemId));
}
```

**Giải thích `ResolveTablePrice`:**

```csharp
private decimal ResolveTablePrice(product, weightUnitId, type, role)
{
    // Không phải vàng/bạc → tablePrice = 0
    if (product.GoldPurityId is null) return 0m;

    var pci = currentPrices.Items.FirstOrDefault(i =>
        i.GoldPurityId == product.GoldPurityId && i.WeightUnitId == weightUnitId);
    if (pci is null) return 0m;

    bool isBuy = type is BuyGold or BuyMoreGold or ExchangeToMoney
              || (type is ExchangeGold or ExchangeFree && role == ExchangeIn);

    return isBuy ? pci.BuyPrice : pci.SellPrice;
    //  BuyGold      → BuyPrice  (giá mua vào — thấp hơn)
    //  ExchangeIn   → BuyPrice  (vàng cũ — tính giá mua vào)
    //  Normal       → SellPrice (vàng mới — tính giá bán ra)
}
```

### 5.3 Tính tổng & cập nhật kho

**Tính tổng (trong `Transaction.RecalculateTotals()`):**

```csharp
// SubtotalAmount = tổng các Normal items
SubtotalAmount = Items
    .Where(i => i.ItemRole == ItemRole.Normal)
    .Sum(i => i.LineTotal);

// Tổng bị cấn trừ (ExchangeIn items)
var exchangeInTotal = Items
    .Where(i => i.ItemRole == ItemRole.ExchangeIn)
    .Sum(i => i.LineTotal);

LaborFee  = Items.Sum(i => i.LaborFee);
StoneFee  = Items.Sum(i => i.StoneFee);

// TotalAmount = số tiền thực thu/chi
TotalAmount = SubtotalAmount - exchangeInTotal + LaborFee + StoneFee;
//  BuyGold:      0 - totalBuy + 0 + 0 = âm (tiệm chi)
//  ExchangeGold: totalSell - totalExchangeIn + fees = chênh lệch
```

**Cập nhật kho (`ApplyInventoryChangesAsync`):**

```csharp
// Ánh xạ hướng kho theo (TransactionType, ItemRole)
(BuyGold,      Normal)     → "IN"   // nhập kho vàng mua được
(ExchangeGold, ExchangeIn) → "IN"   // nhập kho vàng cũ đổi vào
(ExchangeGold, Normal)     → "OUT"  // xuất kho vàng mới bán ra
(SellGold,     Normal)     → "OUT"
(SellSilver,   Normal)     → "OUT"

// Nếu hướng OUT mà không có tồn kho → INVENTORY_NOT_FOUND (422)
// Nếu hướng IN mà chưa có tồn kho → tự tạo InventoryItem mới
```

---

## 6. Backend — Domain Entity

### Transaction

File: `Domain/Entities/Transaction.cs`

| Property | Kiểu | Ghi chú |
|---|---|---|
| `Id` | `Guid` | PK |
| `InvoiceCode` | `string` | Auto: `MV-YYYYMMDD-NNNN` (BuyGold), `DV-...` (ExchangeGold) |
| `Type` | `TransactionType` | `BuyGold` hoặc `ExchangeGold` |
| `Status` | `TransactionStatus` | `Draft` → `Pending` → `Approved` → `Completed` |
| `BranchId` | `Guid` | Lấy từ nhân viên đăng nhập |
| `CounterId` | `Guid` | Lấy từ nhân viên đăng nhập |
| `CashierId` | `Guid` | JWT `sub` |
| `SubtotalAmount` | `decimal` | Tổng Normal items |
| `TotalAmount` | `decimal` | Số tiền thực thu/chi sau cấn trừ |
| `ReferenceInvoiceCode` | `string?` | Mã HĐ gốc (ExchangeGold tùy chọn) |
| `DepositAmount` | `decimal` | Đặt cọc (nếu có) |
| `CustomerId` | `Guid?` | Khách hàng (tùy chọn nhưng khuyến nghị) |
| `TransactedAt` | `DateTime` | UTC, set khi Create |

### TransactionItem

File: `Domain/Entities/TransactionItem.cs`

| Property | Kiểu | Ghi chú |
|---|---|---|
| `ItemRole` | `ItemRole` | `Normal` hoặc `ExchangeIn` |
| `UnitPriceLak` | `decimal` | Giá cashier nhập — **snapshot tại thời điểm GD** |
| `TableUnitPriceLak` | `decimal` | Giá bảng reference (không tính tiền) |
| `WeightGram` | `decimal` | Trọng lượng thực (sau LAO SUT) |
| `LineTotal` | `decimal` | `Quantity × UnitPriceLak` |
| `HaoHutGram` | `decimal` | LAO SUT (gram) — ExchangeGold |
| `PhiHuHai` | `decimal` | PHÍ KHÒ (kip) — ExchangeGold |
| `PriceConfigItemId` | `Guid?` | FK → dòng bảng giá (nullable) |

---

## 7. Backend — Database

### Bảng `transactions`

```sql
CREATE TABLE transactions (
    id                    UUID PRIMARY KEY,
    invoice_code          VARCHAR(50) UNIQUE NOT NULL,
    type                  VARCHAR(30) NOT NULL,          -- 'BuyGold', 'ExchangeGold', ...
    status                VARCHAR(20) NOT NULL,          -- 'Pending', 'Completed', ...
    branch_id             UUID NOT NULL REFERENCES branches(id),
    counter_id            UUID NOT NULL REFERENCES counters(id),
    cashier_id            UUID NOT NULL REFERENCES users(id),
    subtotal_amount       DECIMAL(18,2) NOT NULL,
    total_amount          DECIMAL(18,2) NOT NULL,
    labor_fee             DECIMAL(18,2) DEFAULT 0,
    stone_fee             DECIMAL(18,2) DEFAULT 0,
    deposit_amount        DECIMAL(18,2) DEFAULT 0,
    currency              VARCHAR(10) NOT NULL DEFAULT 'LAK',
    exchange_rate         DECIMAL(18,4) DEFAULT 1,
    payment_method        VARCHAR(20),
    note                  TEXT,
    customer_id           UUID REFERENCES customers(id),
    reference_invoice_code VARCHAR(50),                 -- ExchangeGold: HĐ gốc
    transacted_at         TIMESTAMPTZ NOT NULL,
    approved_at           TIMESTAMPTZ,
    approved_by           UUID
);

-- Indexes
CREATE UNIQUE INDEX IX_transactions_InvoiceCode ON transactions(invoice_code);
CREATE INDEX IX_transactions_BranchId          ON transactions(branch_id);
CREATE INDEX IX_transactions_Status            ON transactions(status);
CREATE INDEX IX_transactions_TransactedAt      ON transactions(transacted_at);
CREATE INDEX IX_transactions_CounterId         ON transactions(counter_id);
```

### Bảng `transaction_items`

```sql
CREATE TABLE transaction_items (
    id                    UUID PRIMARY KEY,
    transaction_id        UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id            UUID NOT NULL,
    product_snapshot_name VARCHAR(200) NOT NULL,         -- tên SP tại thời điểm GD
    quantity              INT NOT NULL,
    weight_unit_id        UUID REFERENCES weight_units(id) ON DELETE SET NULL,
    weight_unit_name      VARCHAR(50) NOT NULL,           -- snapshot tên đơn vị
    weight_gram           DECIMAL(18,4) NOT NULL,
    unit_price_lak        DECIMAL(18,2) NOT NULL,        -- giá cashier nhập
    table_unit_price_lak  DECIMAL(18,2) NOT NULL DEFAULT 0,
    line_total            DECIMAL(18,2) NOT NULL,
    item_role             VARCHAR(20) NOT NULL DEFAULT 'Normal',
    labor_fee             DECIMAL(18,2) DEFAULT 0,
    stone_fee             DECIMAL(18,2) DEFAULT 0,
    hao_hut_gram          DECIMAL(18,4) DEFAULT 0,       -- LAO SUT
    phi_hu_hai            DECIMAL(18,2) DEFAULT 0,       -- PHÍ KHÒ
    price_config_item_id  UUID REFERENCES price_config_items(id) ON DELETE SET NULL
);
```

---

## 8. In hóa đơn

Component: `components/pos/ReceiptModal.tsx`

### BuyGold — Receipt

```
┌─────────────────────────────────────────┐
│  [LOGO]  KHAMPHUVONG GOLD & SILVER      │
│  PHIẾU MUA VÀNG                         │
│  MV-20250615-0023    15/06/2025 14:30   │
│─────────────────────────────────────────│
│  Khách hàng: Somchai Phommavong         │
│  Nhân viên: NV001                       │
│─────────────────────────────────────────│
│  Vàng miếng SJC 1 Lượng                │
│  1 lượng × 3,800,000 ₭                 │
│  ══════════════════════════════════════ │
│  TỔNG CHI TRẢ KHÁCH:    38,000,000 ₭   │
└─────────────────────────────────────────┘
```

### ExchangeGold — Receipt (2 section)

```
┌─────────────────────────────────────────┐
│  PHIẾU THU ĐỔI VÀNG CŨ                 │
│  DV-20250615-0024    15/06/2025 15:00   │
│─────────────────────────────────────────│
│  ↩ HÀNG ĐỔI VÀO — Vàng cũ khách trả   │
│  Nhẫn vàng 18K                          │
│  [PHÍ KHÒ: 50,000₭ | LAO SUT: 0.2 Chỉ]│
│  1.8 chỉ × 3,700,000 ₭ = 6,660,000 ₭  │
│  Trị giá vàng cũ đổi vào (B): -6,610,000₭│
│─────────────────────────────────────────│
│  🛍 HÀNG BÁN RA — Sản phẩm mới         │
│  Vòng vàng 24K                          │
│  2 chỉ × 3,800,000 ₭ = 7,600,000 ₭    │
│  Công thợ: +100,000 ₭                  │
│  Tổng hàng bán mới (A): +7,700,000 ₭  │
│─────────────────────────────────────────│
│  ★ KHÁCH THANH TOÁN TIỆM: 1,090,000 ₭  │
└─────────────────────────────────────────┘
```

**Logic nhãn tổng cuối:**

```typescript
// ReceiptModal.tsx
if (transaction.totalAmount >= 0)
  label = "★ KHÁCH THANH TOÁN TIỆM (THU IN):"
else
  label = "💵 TIỆM THANH TOÁN KHÁCH (CHI OUT):"

displayAmount = Math.abs(transaction.totalAmount)
```

---

## 9. Mã lỗi & xử lý ngoại lệ

| Mã lỗi | HTTP | Nguyên nhân | Cách sửa |
|---|---|---|---|
| `USER_NOT_FOUND` | 404 | JWT `sub` không khớp user trong DB | Đăng xuất & đăng nhập lại |
| `COUNTER_NOT_FOUND` | 422 | Nhân viên chưa được phân công quầy | Admin phân công quầy qua `PATCH /api/users/{id}/counter` |
| `PRODUCT_NOT_FOUND` | 404 | ProductId không tồn tại | Kiểm tra lại ID sản phẩm |
| `PRODUCT_PRICE_NOT_CONFIGURED` | 422 | Thiếu `weightUnitId` hoặc không có dòng bảng giá khớp (GoldPurityId + WeightUnitId) | Gửi đúng `weightUnitId`; kiểm tra bảng giá đã cấu hình đủ đơn vị chưa |
| `CONFIG_PRICE_NOT_FOUND` | 422 | Chưa có bảng giá vàng nào | Manager tạo bảng giá qua `PUT /api/config/prices` |
| `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị "Chỉ" chưa được seed | Seed lại dữ liệu |
| `INVENTORY_NOT_FOUND` | 422 | Sản phẩm không tồn tại trong kho quầy (chỉ khi OUT) | Kiểm tra tồn kho quầy |
| `INVENTORY_INSUFFICIENT_STOCK` | 422 | Tồn kho không đủ số lượng | Kiểm tra & nhập thêm hàng |
| `VALIDATION_FAILED` | 422 | Dữ liệu request không hợp lệ | Xem `errors[]` trong response |

**Format response lỗi:**

```json
{
  "status": 422,
  "errorCode": "COUNTER_NOT_FOUND"
}
```

```json
{
  "status": 422,
  "errorCode": "VALIDATION_FAILED",
  "errors": {
    "Items[0].WeightUnitId": ["WeightUnitId không hợp lệ."],
    "PaymentMethod": ["Phương thức thanh toán phải là CASH hoặc BANK."]
  }
}
```
