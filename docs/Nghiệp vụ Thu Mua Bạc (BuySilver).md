# Nghiệp vụ Thu Mua Bạc — BuySilver

> Tài liệu mô tả chi tiết API và luồng nghiệp vụ cho giao dịch thu mua bạc.  
> Endpoint gốc: `POST /api/transactions` (type = `BuySilver`)  
> Xác thực: **JWT Bearer Token**

---

## Tổng quan

Giao dịch `BuySilver` ghi nhận việc **cửa hàng mua bạc từ khách hàng**. Cửa hàng chi tiền ra, bạc đi vào kho. Luồng này đối xứng với `SellSilver` (bán bạc), nhưng chiều tiền và chiều kho ngược lại.

**Ví dụ nghiệp vụ:**
- Khách mang 100g bạc 925 đến bán → tiệm trả tiền theo giá mua vào, tăng tồn kho bạc
- Khách bán 50g bạc nguyên khối → tiệm định giá theo bảng giá bạc hiện tại, thanh toán CASH hoặc BANK

---

## Đặc điểm kỹ thuật

| Đặc điểm | Giá trị |
|---|---|
| `TransactionType` | `BuySilver` |
| Mã hóa đơn prefix | `MB` — ví dụ: `MB000001`, `MB000002` |
| Đơn vị giá | **LAK/gram** (khác vàng — vàng tính theo Chỉ) |
| Giá tham chiếu | `BuyPrice` của `PriceConfigItem` category `Silver` |
| Thanh toán | `CASH` \| `BANK` \| `COMBINED` |
| Khách hàng | **Bắt buộc** (`customerId` không được null/empty) |
| Bảng giá | **Bắt buộc** (`priceTableId` phải truyền) |
| Trạng thái phiếu | Tạo thẳng → `Completed` (không qua `Pending`) |
| Ảnh hưởng tồn kho | **IN** — bạc đi vào kho (tăng `quantity`, `weightGram`) |
| Sổ quỹ | **OUT** — tiệm chi tiền ra (sign = −1) |

---

## `POST /api/transactions`

### Request mẫu

```json
{
  "type": "BuySilver",
  "paymentMethod": "CASH",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "priceTableId": "aabbccdd-0000-0000-0000-000000000001",
  "note": "Khách bán bạc 925",
  "items": [
    {
      "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "productName": "Bạc miếng 925",
      "quantity": 1,
      "weightUnitId": null,
      "weightGramOverride": 100.0,
      "unitPriceLak": 38000,
      "itemRole": "Normal",
      "laborFee": 0,
      "stoneFee": 0,
      "haoHutGram": 0,
      "phiHuHai": 0
    }
  ]
}
```

> `weightGramOverride = 100.0` → backend dùng giá trị thực cân được thay vì tính từ `quantity × unit.gramPerUnit`.  
> `unitPriceLak = 38000` → giá snapshot tại thời điểm tạo phiếu, LAK/gram.

### Schema trường quan trọng cho BuySilver

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `type` | ✅ | Phải là `"BuySilver"` |
| `customerId` | ✅ | ID khách hàng — bắt buộc (không được bỏ trống) |
| `priceTableId` | ✅ | ID bảng giá đang áp dụng — dùng để truy vết |
| `paymentMethod` | ✅ | `CASH` \| `BANK` \| `COMBINED` |
| `cashAmount` | ✅* | Số tiền mặt (LAK). Bắt buộc khi `COMBINED` |
| `bankAmount` | ✅* | Số tiền chuyển khoản (LAK). Bắt buộc khi `COMBINED` |
| `items` | ✅ | Danh sách mặt hàng bạc (1–50 item) |
| `items[].productId` | ✅ | ID sản phẩm bạc (category = `Silver`) |
| `items[].unitPriceLak` | ✅ | Giá mua vào (LAK/gram) — snapshot tại thời điểm tạo phiếu |
| `items[].weightGramOverride` | ✅* | Trọng lượng thực đo (grams). Bắt buộc khi sản phẩm `CanThucTe` |
| `items[].weightUnitId` | ❌ | Tùy chọn — không ảnh hưởng khi đã truyền `weightGramOverride` |
| `items[].haoHutGram` | ❌ | Hao hụt (grams). Mặc định 0. Khi > 0 backend điều chỉnh đơn giá theo tỷ lệ trọng lượng |
| `items[].phiHuHai` | ❌ | Phí hư hại (LAK). Mặc định 0 |

### Response `201 Created`

```json
{
  "id": "aaaaaaaa-0000-0000-0000-000000000001"
}
```

Trả về UUID của phiếu vừa tạo. Dùng `GET /api/transactions/{id}` để lấy chi tiết đầy đủ (kèm `invoiceCode`, `totalAmount`, `items[]`).

---

## Logic tính toán (backend)

### Tính `weightGram`

```
weightGram = weightGramOverride ?? (quantity × unit.gramPerUnit)
```

### Tính đơn giá khi có hao hụt

Khi `haoHutGram > 0` và `weightGramOverride` được truyền, đơn giá được điều chỉnh theo tỷ lệ trọng lượng thực/chuẩn:

```
fullWeightGram      = quantity × unit.gramPerUnit
effectiveUnitPrice  = unitPriceLak × (weightGramOverride / fullWeightGram)
```

> Ví dụ: mua 1 miếng bạc tiêu chuẩn 100g nhưng cân thực tế chỉ 97g (hao 3g):  
> `effectiveUnitPrice = 38.000 × (97 / 100) = 36.860 LAK/gram`

### Tính `lineTotal`

```
lineTotal = weightGram × unitPriceLak - phiHuHai
```

*(`laborFee` và `stoneFee` không dùng cho giao dịch mua bạc, mặc định 0)*

### Tính `totalAmount`

```
totalAmount = Σ lineTotal(Normal items)  [làm tròn nguyên LAK]
```

### Giá tham chiếu (`tableUnitPriceLak`)

Backend tự động tra `BuyPrice` của `PriceConfigItem` (category = `Silver`) từ bảng giá đang active, sau đó quy đổi về LAK/gram:

```
tableUnitPriceLak = pci.BuyPrice / pci.GramPerUnit × unit.gramPerUnit
```

Trường này chỉ lưu để đối soát — **không ghi đè** `unitPriceLak` do cashier nhập.

---

## Ảnh hưởng tồn kho

Khi phiếu `BuySilver` được tạo thành công, backend tự động:

1. Tìm `InventoryItem` theo `(productId, counterId)`.
2. Nếu chưa tồn tại → tạo mới `InventoryItem` với `quantity` và `weightGram` từ phiếu.
3. Nếu đã tồn tại → gọi `Increase(quantity, weightGram)`.
4. Tạo phiếu nhập kho `PNK{seq:D5}` (ví dụ: `PNK00123`) với `direction = IN`, `reason = "Giao dịch MB000001"`.

**Khi hủy phiếu** (`POST /api/transactions/{id}/cancel`): thao tác đảo ngược — gọi `Decrease(quantity, weightGram)` và tạo phiếu xuất kho `PXK{seq:D5}`.

---

## Sổ quỹ (Cash Ledger)

Mỗi phiếu `BuySilver` tạo **1 bút toán** (hoặc 2 nếu `COMBINED`):

| Trường | Giá trị |
|---|---|
| `direction` | `OUT` — tiệm chi tiền |
| `entryType` | `BuySilver` |
| `description` | `[MB000001] Chi trả thu bạc: Bạc miếng 925 (1 cái) - Khách Nguyễn Văn A` |
| `currency` | `LAK` |
| `amount` | `totalAmount` |

**Khi `paymentMethod = COMBINED`** → 2 bút toán riêng:
- OUT CASH: `cashAmount` LAK
- OUT BANK: `bankAmount` LAK

**Khi hủy phiếu** → bút toán đảo chiều `IN` (thu tiền lại):
- Phiếu gốc `OUT` → hủy tạo `IN` cùng số tiền.

---

## Ví dụ — Mua bạc thanh toán kết hợp

Khách bán 200g bạc 925, giá thỏa thuận 38.000 LAK/gram. Thanh toán: 5.000.000 LAK tiền mặt + 2.600.000 LAK chuyển khoản.

```json
{
  "type": "BuySilver",
  "paymentMethod": "COMBINED",
  "cashAmount": 5000000,
  "bankAmount": 2600000,
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "priceTableId": "aabbccdd-0000-0000-0000-000000000001",
  "items": [
    {
      "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "productName": "Bạc 925 nguyên khối",
      "quantity": 1,
      "weightGramOverride": 200.0,
      "unitPriceLak": 38000,
      "itemRole": "Normal"
    }
  ]
}
```

**Backend tính:**
```
weightGram  = 200.0 g
lineTotal   = 200.0 × 38.000 = 7.600.000 ₭
totalAmount = 7.600.000 ₭
cashAmount + bankAmount = 5.000.000 + 2.600.000 = 7.600.000 ✅
```

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `CUSTOMER_REQUIRED` | 422 | `customerId` bị bỏ trống — bắt buộc với BuySilver |
| `COUNTER_NOT_FOUND` | 422 | Nhân viên đăng nhập chưa được gán quầy giao dịch |
| `PRICE_TABLE_REQUIRED` | 422 | `priceTableId` bị bỏ trống |
| `PRICE_TABLE_NOT_FOUND` | 404 | `priceTableId` không tồn tại trong hệ thống |
| `PRICE_TABLE_INACTIVE` | 422 | Bảng giá được truyền đã bị vô hiệu hóa |
| `PRODUCT_NOT_FOUND` | 404 | `productId` trong items không tồn tại |
| `PRODUCT_PRICE_NOT_CONFIGURED` | 422 | Sản phẩm có `goldPurityId` nhưng không tìm thấy dòng giá tương ứng trong bảng giá hiện tại |
| `CONFIG_WEIGHT_UNIT_NOT_FOUND` | 404 | Đơn vị trọng lượng `chi` chưa được seed vào DB |
| `VALIDATION_FAILED` | 422 | Items rỗng, `unitPriceLak ≤ 0`, `quantity ≤ 0`, `paymentMethod` không hợp lệ |
| `PAYMENT_COMBINED_AMOUNTS_REQUIRED` | 422 | Thiếu `cashAmount` hoặc `bankAmount` khi `COMBINED` |
| `PAYMENT_COMBINED_AMOUNTS_INVALID` | 422 | `cashAmount` hoặc `bankAmount` là số âm |
| `PAYMENT_COMBINED_AMOUNTS_MISMATCH` | 422 | `cashAmount + bankAmount ≠ totalAmount` |

---

## So sánh với BuyGold

| Điểm khác biệt | `BuyGold` | `BuySilver` |
|---|---|---|
| Prefix hóa đơn | `MV` | `MB` |
| Đơn vị giá | LAK / Chỉ (3.75g) | LAK / gram |
| Bảng giá tham chiếu | `BuyPrice` của `GoldPurity` | `BuyPrice` của `GoldPurity` (category Silver) |
| Mặt hàng | Sản phẩm vàng (category Gold) | Sản phẩm bạc (category Silver) |
| Thanh toán | CASH \| BANK \| COMBINED | CASH \| BANK \| COMBINED |
| Khách hàng | Bắt buộc | Bắt buộc |
| Tồn kho | IN | IN |
| Sổ quỹ | OUT (chi) | OUT (chi) |

---

## Liên quan

- [API Reference](./API%20Reference.md) — mục 8: Transactions (POST /api/transactions)
- [Tài liệu Nghiệp vụ & Luồng Quy trình POS Khamphuvong](./Tài%20liệu%20Nghiệp%20vụ%20&%20Luồng%20Quy%20trình%20POS%20Khamphuvong.md) — bảng TransactionType
- [Nghiệp vụ Đổi Ngoại Tệ (ExchangeCurrency)](./Nghiệp%20vụ%20Đổi%20Ngoại%20Tệ%20(ExchangeCurrency).md) — tài liệu cùng format
