# Nghiệp vụ Kho & Tồn kho — Khamphuvong POS

> **Phạm vi**: Module `Inventory` — quản lý tồn kho đa quầy cho vàng, bạc, đá quý.  
> **Cập nhật**: 2026-06-12

---

## 1. Tổng quan luồng

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Tạo sản phẩm                                                    │
│     POST /api/products                                              │
│     └─► Tự động tạo InventoryItem qty=0 cho mọi quầy đang hoạt động│
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  2. Tạo quầy mới                                                    │
│     POST /api/branches/{id}/counters                                │
│     └─► Tự động tạo InventoryItem qty=0 cho mọi sản phẩm hiện có   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
          ┌───────────────────▼─────────────────────┐
          │  Ma trận tồn kho: ProductId × CounterId  │
          │  Mỗi cặp: qty=0, TrangThai=TiepNhan      │
          └───────────────────┬─────────────────────┘
                              │
          ┌───────────────────▼─────────────────────┐
          │  3. Nhập / Xuất kho thủ công             │
          │  POST /api/inventory/{id}/adjust          │
          │  Hướng IN (nhập) hoặc OUT (xuất)         │
          └───────────────────┬─────────────────────┘
                              │
          ┌───────────────────▼─────────────────────┐
          │  4. Cập nhật trạng thái (vòng đời)       │
          │  PATCH /api/inventory/{id}/status         │
          └─────────────────────────────────────────┘
```

**Quy tắc liên kết tự động với giao dịch:**  
Khi tạo giao dịch bán/mua/đổi qua `POST /api/transactions`, hệ thống tự động gọi `Increase`/`Decrease` và ghi log `ADJ-xxx` mà không cần gọi `/adjust` thủ công.

---

## 2. Vòng đời trạng thái (`ItemTrangThai`)

```
  TiepNhan (1)
      │
      │  [Định giá xong]
      ▼
  DaDinhGia (2)
      │
      │  [Đưa lên quầy trưng bày]
      ▼
  TrenQuay (3)
      │
      ├──► DaBan (5)       — đã bán qua giao dịch SellGold / SellSilver
      ├──► DoiRa (6)       — đã đổi ra qua giao dịch ExchangeGold / ExchangeFree
      └──► ChuyenXuong (4) — chuyển xuống xưởng / vàng ngoài bị lỗi
```

| Trạng thái | Giá trị | Mô tả | Có thể bán? |
|---|---|---|---|
| `TiepNhan` | 1 | Vừa nhận, chưa định giá | Không |
| `DaDinhGia` | 2 | Đã có giá, chưa lên quầy | Không |
| `TrenQuay` | 3 | Đang trưng bày | **Có** |
| `ChuyenXuong` | 4 | Gửi xưởng / loại bỏ | Không (cuối) |
| `DaBan` | 5 | Đã bán | Không (cuối) |
| `DoiRa` | 6 | Đã đổi ra (trade-out) | Không (cuối) |

> **Quan trọng**: Chuyển trạng thái chỉ được đi một chiều — không được quay ngược.  
> Mọi transition ngoài bảng trên sẽ bị từ chối với lỗi `INVENTORY_INVALID_STATUS_TRANSITION`.

---

## 3. API — Sản phẩm & Quầy (khởi tạo tồn kho)

### 3.1 Tạo sản phẩm mới
```
POST /api/products
Authorization: Bearer <token>  (Manager hoặc SystemAdmin)

Body:
{
  "productCode": "NH-9999-1C",
  "productName": "Nhẫn vàng 9999 1 Chỉ",
  "productCategoryId": "<uuid>",
  "goldPurityId": "<uuid>",        // bắt buộc khi có hàm lượng
  "weightGram": 3.75,              // grams/đơn vị — cố định sau khi tạo
  "weightUnitId": "<uuid>",        // bắt buộc khi có goldPurityId
  "productType": "NguyenKhoi"
}

Kết quả: 201 Created + Product object
Tự động: tạo InventoryItem qty=0 cho mọi quầy đang active
```

> `weightGram` và `weightUnitId` cố định từ lúc tạo — không thay đổi sau đó.  
> Đây là nguồn sự thật để tính `deltaWeightGram` khi nhập/xuất kho.

### 3.2 Tạo quầy mới
```
POST /api/branches/{branchId}/counters
Authorization: Bearer <token>  (SystemAdmin)

Body: { "counterName": "Quầy 2" }

Tự động: tạo InventoryItem qty=0 cho mọi sản phẩm đang active
```

---

## 4. API — Nhập / Xuất kho thủ công

### 4.1 Điều chỉnh đơn lẻ
```
POST /api/inventory/{inventoryItemId}/adjust
Authorization: Bearer <token>  (Manager, SystemAdmin — policy: InventoryManage)

Body:
{
  "direction":     "IN",            // "IN" = nhập | "OUT" = xuất
  "quantity":      10,              // số lượng (số nguyên, > 0)
  "weightGram":    37.5,            // tổng trọng lượng điều chỉnh (grams, > 0)
  "reason":        "Nhập hàng mới",
  "nguonGoc":      "Quan",          // BẮT BUỘC khi IN: "Quan" | "Ngoai" — bỏ qua khi OUT
  "paymentMethod": "CASH",          // tuỳ chọn: "CASH" | "BANK"
  "actualValue":   5000000,         // tuỳ chọn: giá trị thực tế lô hàng (LAK)
  "documentRef":   null,            // tuỳ chọn: số chứng từ / hóa đơn nhập — mở rộng sau
  "supplier":      null             // tuỳ chọn: nhà cung cấp / nguồn nhập — mở rộng sau
}

Response 200:
{
  "item": { ...InventoryItemDto },
  "log":  { ...InventoryAdjustmentLogDto }
}
```

**Nguồn gốc lô hàng (`nguonGoc`):**

| Giá trị | Ý nghĩa |
|---|---|
| `"Quan"` | Vàng của cửa hàng (vàng nội bộ, có thể mua/đổi/trao đổi tự do) |
| `"Ngoai"` | Vàng bên ngoài mang vào (chỉ xử lý qua mua hoặc chuyển giao) |

**Tính `weightGram` trên frontend:**
```
weightGram = quantity × product.weightGram
// Ví dụ: 10 nhẫn × 3.75 g/chỉ = 37.5 g
```

**Luồng IN (nhập kho):**
- `nguonGoc` bắt buộc, phải là `"Quan"` hoặc `"Ngoai"` → lỗi `INVENTORY_NGUON_GOC_REQUIRED` nếu thiếu/sai
- `item.Increase(quantity, weightGram)` + ghi log `ADJ-xxx` với `NguonGocLo`

**Luồng OUT (xuất kho):**
- `nguonGoc` bị bỏ qua hoàn toàn — không cần gửi
- Nếu `item.quantity < request.quantity` → lỗi `INVENTORY_INSUFFICIENT_STOCK`
- Nếu đủ hàng → `item.Decrease(quantity, weightGram)` + ghi log `ADJ-xxx`

### 4.2 Điều chỉnh hàng loạt
```
POST /api/inventory/bulk-adjust
Authorization: Bearer <token>  (InventoryManage)

Body:
{
  "items": [
    {
      "id":          "<inventoryItemId>",
      "direction":   "IN",
      "quantity":    5,
      "weightGram":  18.75,
      "reason":      "Nhập bổ sung",
      "nguonGoc":    "Quan",        // BẮT BUỘC khi direction=IN
      "documentRef": null,
      "supplier":    null
    },
    {
      "id":        "<inventoryItemId>",
      "direction": "OUT",
      "quantity":  2,
      "weightGram": 7.5,
      "reason":    "Kiểm kê cuối ngày"
    }
  ]
}

Response 200:
{
  "adjustedCount":       1,
  "notFoundIds":         [],
  "insufficientStockIds": []
}
```

> **Partial success**: item không đủ tồn kho bị ghi vào `insufficientStockIds` và bỏ qua,  
> không ảnh hưởng các item còn lại trong batch.  
> Lỗi input (direction/quantity/weight/nguonGoc sai) → fail toàn batch.

### 4.3 Mã điều chỉnh (ADJ-xxx)
Mỗi lần nhập/xuất sinh mã tuần tự `ADJ-001`, `ADJ-002`... tự động — không cần truyền từ client.

---

## 5. API — Vòng đời trạng thái

### 5.1 Cập nhật trạng thái đơn lẻ
```
PATCH /api/inventory/{id}/status
Authorization: Bearer <token>  (InventoryManage)

Body: { "trangThai": "DaDinhGia" }

Response 200: { "id": "<uuid>", "trangThai": "DaDinhGia" }

Lỗi:
  - "INVENTORY_INVALID_STATUS"            → tên trạng thái không hợp lệ
  - "INVENTORY_INVALID_STATUS_TRANSITION" → chuyển không được phép theo sơ đồ
  - "INVENTORY_NOT_FOUND"                 → không tìm thấy item
```

### 5.2 Cập nhật hàng loạt
```
PATCH /api/inventory/bulk
Authorization: Bearer <token>  (InventoryManage)

Body:
{
  "items": [
    { "id": "<uuid>", "trangThai": "TrenQuay" },
    { "id": "<uuid>", "trangThai": "TrenQuay" }
  ]
}

Response 200:
{
  "updatedCount": 2,
  "notFoundIds":  []
}
```

> Nếu bất kỳ item nào có transition không hợp lệ → toàn batch thất bại (`INVENTORY_INVALID_STATUS_TRANSITION`).

---

## 6. API — Tra cứu

### 6.1 Danh sách tồn kho
```
GET /api/inventory
  ?branchId=<uuid>
  &counterId=<uuid>
  &category=<string>
  &status=TrenQuay        // TiepNhan|DaDinhGia|TrenQuay|ChuyenXuong|DaBan|DoiRa
  &nguonGoc=Quan          // Quan|Ngoai
  &keyword=<string>
  &page=1
  &pageSize=20

Response: PagedResult<InventoryItemDto>
```

**`InventoryItemDto`:**
```json
{
  "id":            "<uuid>",
  "branchId":      "<uuid>",
  "counterId":     "<uuid>",
  "counterName":   "Quầy 1",
  "productCode":   "NH-9999-1C",
  "productName":   "Nhẫn vàng 9999 1 Chỉ",
  "category":      "Nhẫn",
  "purity":        "9999",
  "trayId":        "T-A1",
  "quantity":      10,
  "weightGram":    37.5,
  "lastUpdatedAt": "2026-06-12T10:00:00Z",
  "trangThai":     "TrenQuay",
  "nguonGoc":      "Quan"
}
```

### 6.2 Chi tiết item
```
GET /api/inventory/{id}
Response: InventoryItemDto (như trên)
```

### 6.3 Lịch sử điều chỉnh
```
GET /api/inventory/adjustments
  ?branchId=<uuid>
  &counterId=<uuid>
  &keyword=<string>       // mã ADJ, tên SP, lý do, tên chi nhánh
  &page=1
  &pageSize=20

Response: PagedResult<InventoryAdjustmentLogDto>
```

**`InventoryAdjustmentLogDto`:**
```json
{
  "id":              "<uuid>",
  "adjustmentCode":  "ADJ-001",
  "branchId":        "<uuid>",
  "branchName":      "Chi nhánh Vientiane",
  "counterId":       "<uuid>",
  "counterName":     "Quầy 1",
  "inventoryItemId": "<uuid>",
  "productName":     "Nhẫn vàng 9999 1 Chỉ",
  "direction":       "IN",
  "quantity":        10,
  "weightGram":      37.5,
  "nguonGocLo":      "Quan",          // "Quan"|"Ngoai" khi IN, null khi OUT
  "documentRef":     null,            // số chứng từ — mở rộng sau
  "supplier":        null,            // nhà cung cấp — mở rộng sau
  "reason":          "Nhập hàng mới",
  "createdAt":       "2026-06-12T10:00:00Z",
  "paymentMethod":   "CASH",
  "actualValue":     5000000
}
```

---

## 7. Mã lỗi liên quan

| `errorCode` | HTTP | Nguyên nhân |
|---|---|---|
| `INVENTORY_NOT_FOUND` | 404 | InventoryItem không tồn tại |
| `INVENTORY_INSUFFICIENT_STOCK` | 422 | Số lượng xuất > tồn hiện tại |
| `INVENTORY_INVALID_DIRECTION` | 422 | `direction` không phải `"IN"` hoặc `"OUT"` |
| `INVENTORY_INVALID_QUANTITY` | 422 | `quantity` ≤ 0 |
| `INVENTORY_INVALID_WEIGHT` | 422 | `weightGram` ≤ 0 |
| `INVENTORY_NGUON_GOC_REQUIRED` | 422 | `nguonGoc` thiếu hoặc sai khi `direction=IN` |
| `INVENTORY_REASON_REQUIRED` | 422 | `reason` trống |
| `INVENTORY_INVALID_STATUS` | 422 | Tên trạng thái không hợp lệ |
| `INVENTORY_INVALID_STATUS_TRANSITION` | 422 | Chuyển trạng thái không được phép |
| `INVENTORY_BULK_EMPTY` | 422 | Danh sách bulk rỗng |

---

## 8. Nghiệp vụ UI cần triển khai

### 8.1 Màn hình Danh sách Tồn kho

**Vị trí**: `/inventory`  
**Quyền**: Cashier (xem), Manager/SystemAdmin (chỉnh sửa)

**Bố cục**:
- **Filter bar** (trên cùng):
  - Chọn Chi nhánh → Chọn Quầy (cascade dropdown)
  - Chọn Trạng thái (`TrangThai`)
  - Chọn Nguồn gốc (`NguonGoc`: Quan / Ngoài)
  - Chọn Danh mục sản phẩm
  - Ô tìm kiếm (mã SP, tên SP, tên quầy)
- **Bảng danh sách** (phân trang 20 dòng):

| Cột | Hiển thị |
|---|---|
| Mã SP | `productCode` |
| Tên hàng | `productName` |
| Hàm lượng | `purity` |
| Quầy | `counterName` |
| Nguồn gốc | Badge: Quan / Ngoài |
| SL (Cái) | `quantity` |
| KL (Gram) | `weightGram` — format `37.50 g` |
| Trạng thái | Badge màu theo `trangThai` |
| Cập nhật | `lastUpdatedAt` — format ngày giờ |
| Thao tác | Nút Nhập / Xuất / Đổi trạng thái |

**Badge màu trạng thái**:
```
TiepNhan    → xám         (Tiếp nhận)
DaDinhGia   → xanh dương  (Đã định giá)
TrenQuay    → xanh lá     (Trên quầy)
ChuyenXuong → cam         (Chuyển xưởng)
DaBan       → đỏ          (Đã bán)
DoiRa       → tím         (Đã đổi ra)
```

**Nút hành động** (chỉ hiện với Manager/SystemAdmin):
- Nút **"Nhập kho"** → mở Modal 8.2
- Nút **"Xuất kho"** → mở Modal 8.3
- Nút đổi trạng thái (tuỳ `trangThai` hiện tại):
  - `TiepNhan` → nút "Định giá" (→ `DaDinhGia`)
  - `DaDinhGia` → nút "Lên quầy" (→ `TrenQuay`)
  - `TrenQuay` → nút "Chuyển xưởng" (→ `ChuyenXuong`)
  - Trạng thái cuối (DaBan / DoiRa / ChuyenXuong) → không hiện nút

---

### 8.2 Modal Nhập kho (IN)

**Trigger**: Nút "Nhập kho" trên dòng item.

**Form fields**:

| Field | Loại | Ghi chú |
|---|---|---|
| Sản phẩm | readonly | Tên SP từ item đã chọn |
| Quầy | readonly | Tên quầy |
| Hàm lượng | readonly | Purity, ví dụ "9999" |
| Đơn vị | readonly | WeightUnit, ví dụ "Chỉ (3.75 g)" |
| Số lượng | input số nguyên > 0 | Hiển thị phụ: `= X.XX g` (tự tính) |
| **Nguồn gốc** | **select bắt buộc** | **"Vàng Quán" (Quan) \| "Vàng Ngoài" (Ngoai)** |
| Lý do | text/dropdown | "Nhập hàng", "Kiểm kê điều chỉnh", "Khác…" |
| Thanh toán | select tuỳ chọn | CASH \| BANK \| để trống |
| Giá trị thực | number tuỳ chọn | Số tiền LAK của lô hàng |
| Số chứng từ | text tuỳ chọn | Hiển thị placeholder "Mở rộng sau" — lưu nhưng không validate |
| Nhà cung cấp | text tuỳ chọn | Hiển thị placeholder "Mở rộng sau" — lưu nhưng không validate |

**Khi Submit**:
1. Validate: `nguonGoc` phải chọn (client-side)
2. Tính `weightGram = quantity × product.weightGram`
3. Gọi `POST /api/inventory/{id}/adjust` với `direction: "IN"`, `nguonGoc`
4. Thành công → toast thông báo, reload dòng trong bảng

---

### 8.3 Modal Xuất kho (OUT)

**Form fields**:

| Field | Loại | Ghi chú |
|---|---|---|
| Sản phẩm | readonly | |
| Quầy | readonly | |
| Tồn hiện tại | readonly | `X cái / Y.XX g` |
| Số lượng | input số nguyên > 0 | Cảnh báo đỏ nếu > tồn hiện tại |
| Lý do | text/dropdown | "Xuất bán", "Kiểm kê điều chỉnh", "Hỏng/mất", "Khác…" |
| Thanh toán | select tuỳ chọn | CASH \| BANK \| để trống |
| Giá trị thực | number tuỳ chọn | |

> `nguonGoc` **không hiển thị** trong form OUT.

**Validation phía client**:
- `quantity` > 0
- `quantity` ≤ `item.quantity` — cảnh báo sớm, không cần chờ API

**Lỗi `INVENTORY_INSUFFICIENT_STOCK`**: "Tồn kho không đủ. Hiện còn X cái."

---

### 8.4 Modal Đổi trạng thái

**Trigger**: Nút "Định giá" / "Lên quầy" / "Chuyển xưởng" trên dòng item.

**Form** (đơn giản — chỉ xác nhận):
```
Hàng hóa:           [readonly — tên SP + quầy]
Trạng thái hiện tại: [Badge readonly]
Chuyển sang:         [Badge readonly — trạng thái đích]
[Nút xác nhận]
```

**Bảng nút theo trạng thái hiện tại**:

| `trangThai` hiện tại | Nút hiển thị | Đích |
|---|---|---|
| `TiepNhan` | "Xác nhận định giá" | `DaDinhGia` |
| `DaDinhGia` | "Lên quầy trưng bày" | `TrenQuay` |
| `TrenQuay` | "Chuyển xuống xưởng" | `ChuyenXuong` |
| `DaBan` / `DoiRa` / `ChuyenXuong` | _(ẩn nút)_ | — |

> `DaBan` và `DoiRa` chỉ được set tự động qua giao dịch POS — không cho phép set thủ công từ UI.

**Khi Submit**: `PATCH /api/inventory/{id}/status`

---

### 8.5 Màn hình Lịch sử Điều chỉnh

**Vị trí**: `/inventory/adjustments`  
**Quyền**: Manager, SystemAdmin

**Filter**: Chi nhánh, Quầy, Hướng (IN/OUT), từ khóa (mã ADJ, tên SP, lý do)

**Bảng**:

| Cột | Hiển thị |
|---|---|
| Mã ADJ | `adjustmentCode` |
| Hướng | Badge: IN ↑ (xanh) / OUT ↓ (đỏ) |
| Sản phẩm | `productName` |
| Quầy | `counterName` |
| SL | `quantity` |
| KL (g) | `weightGram` |
| Nguồn gốc lô | `nguonGocLo` — chỉ hiện khi IN |
| Số chứng từ | `documentRef` — nếu có |
| Nhà cung cấp | `supplier` — nếu có |
| Giá trị | `actualValue` — format LAK |
| Lý do | `reason` |
| Thời gian | `createdAt` |

---

### 8.6 Lưu ý đặc biệt

#### Đá quý — không có luồng kho riêng
- Đá quý (Sapphire, Ruby…) **không phát sinh InventoryItem**.
- `StoneFee` nhập tay trực tiếp trên dòng giao dịch bán vàng (`TransactionItem.StoneFee`).
- UI: trường "Tiền đá" trên form POS bán hàng — không liên quan màn hình kho.

#### Thu đổi ngoại tệ — bỏ qua kho
- Giao dịch `ExchangeCurrency` không tạo/thay đổi InventoryItem.
- Xử lý hoàn toàn ở luồng kế toán / sổ quỹ.

#### Giao dịch tự động cập nhật kho
Khi nhân viên tạo giao dịch bán/mua/đổi, **hệ thống tự động**:
- `SellGold / SellSilver` → `OUT` khỏi kho quầy
- `BuyGold / BuyMoreGold` → `IN` vào kho quầy
- `ExchangeGold` (item đổi vào) → `IN`; (item bán ra) → `OUT`
- `ExchangeToMoney` → `IN` (thu vàng từ khách)

> Nhân viên **không cần** vào màn hình kho để điều chỉnh thủ công khi tạo giao dịch POS.

---

## 9. Phân quyền theo Role

| Thao tác | Cashier | ThuQuy | Manager | SystemAdmin |
|---|---|---|---|---|
| Xem danh sách tồn kho | ✅ | ✅ | ✅ | ✅ |
| Xem lịch sử ADJ | ❌ | ✅ | ✅ | ✅ |
| Nhập / Xuất kho thủ công | ❌ | ❌ | ✅ | ✅ |
| Cập nhật trạng thái | ❌ | ❌ | ✅ | ✅ |
| Bulk adjust / bulk status | ❌ | ❌ | ✅ | ✅ |

---

## 10. Các trường mở rộng trong tương lai

| Trường | Vị trí | Trạng thái | Kế hoạch |
|---|---|---|---|
| `documentRef` | `InventoryAdjustmentLog` | Lưu DB, không validate | Khi có nghiệp vụ Phiếu nhập kho chính thức |
| `supplier` | `InventoryAdjustmentLog` | Lưu DB, không validate | Khi có danh mục nhà cung cấp |
| Phiếu nhập kho | Endpoint mới | Chưa có | `POST /api/inventory/receipts` — nhập theo lô có đầy đủ chứng từ |
