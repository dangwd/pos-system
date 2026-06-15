# API Tài liệu — Module Inventory (`/api/inventory`)

> **Base URL**: `/api/inventory`
> **Phiên bản**: v1
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Inventory quản lý tồn kho — từng item vật lý trong kho của chi nhánh. Hỗ trợ điều chỉnh số lượng, cập nhật trạng thái và tra cứu lịch sử thay đổi.

**Phân quyền**:
- `GET` (đọc): Mọi user đã đăng nhập
- `POST adjust`, `PATCH status` (ghi): Yêu cầu permission `INVENTORY_MANAGE`

---

## Enums

### `ItemTrangThai` — Trạng thái item

| Giá trị | Mô tả |
|---|---|
| `TiepNhan` | Vừa tiếp nhận, chưa định giá |
| `DaDinhGia` | Đã định giá |
| `TrenQuay` | Đang trưng bày, có thể bán |
| `ChuyenXuong` | Chuyển xuống xưởng (vàng ngoài hoặc lỗi) |
| `DaBan` | Đã bán ra |

### `ItemNguonGoc` — Nguồn gốc item

| Giá trị | Mô tả |
|---|---|
| `Quan` | Vàng của quán (có ký hiệu) — được phép mua thêm / đổi hàng / đổi miễn phí |
| `Ngoai` | Vàng ngoài — chỉ xử lý theo luồng mua vào, chuyển xuống |

---

## Schema

### InventoryItem Object

```json
{
  "id": "inv-0001-xxxx-xxxx",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "productCode": "VANG-24K-NHAN",
  "productName": "Nhẫn Vàng 24K",
  "category": "VANG",
  "purity": "24K",
  "trayId": "TRAY-A1",
  "quantity": 5,
  "weightGram": 18750.0,
  "lastUpdatedAt": "2026-06-10T08:00:00Z"
}
```

### AdjustmentLog Object

```json
{
  "id": "log-0001-xxxx",
  "adjustmentCode": "ADJ-20260610-001",
  "branchId": "7c9e6679-...",
  "branchName": "Chi nhánh Vientiane Center",
  "inventoryItemId": "inv-0001-xxxx",
  "productName": "Nhẫn Vàng 24K",
  "direction": "IN",
  "quantity": 2,
  "reason": "Nhập hàng từ nhà cung cấp",
  "createdAt": "2026-06-10T08:00:00Z"
}
```

---

## Endpoints

### 1. Danh sách tồn kho

```
GET /api/inventory
```

**Quyền**: Mọi user đã đăng nhập

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Không | Lọc theo chi nhánh |
| `category` | `string` | Không | Lọc theo mã danh mục (ví dụ: `VANG`) |
| `trayId` | `string` | Không | Lọc theo ID khay/kệ |
| `status` | `string` | Không | Lọc theo `ItemTrangThai` (không phân biệt hoa/thường) |
| `nguonGoc` | `string` | Không | Lọc theo `ItemNguonGoc`: `Quan` hoặc `Ngoai` |

#### Response — 200 OK

Mảng InventoryItem Object.

---

### 2. Chi tiết item tồn kho

```
GET /api/inventory/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

Trả về InventoryItem Object.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `INVENTORY_NOT_FOUND` | Không tìm thấy item |

---

### 3. Điều chỉnh tồn kho

```
POST /api/inventory/{id}/adjust
```

**Quyền**: `INVENTORY_MANAGE`

Tăng hoặc giảm số lượng item, tạo audit log.

#### Request Body

```json
{
  "direction": "IN",
  "quantity": 3,
  "reason": "Nhập hàng bổ sung từ kho trung tâm"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `direction` | `string` | Có | `IN` (nhập) hoặc `OUT` (xuất) |
| `quantity` | `int` | Có | Số lượng điều chỉnh (luôn dương) |
| `reason` | `string` | Có | Lý do điều chỉnh (ghi vào audit log) |

#### Response — 200 OK

```json
{
  "item": { /* InventoryItem Object sau điều chỉnh */ },
  "log":  { /* AdjustmentLog Object vừa tạo */ }
}
```

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `INVENTORY_NOT_FOUND` | Không tìm thấy item |
| `422` | `INVENTORY_INSUFFICIENT_STOCK` | Xuất (`OUT`) vượt quá số lượng hiện có |

---

### 4. Cập nhật trạng thái item

```
PATCH /api/inventory/{id}/status
```

**Quyền**: `INVENTORY_MANAGE`

#### Request Body

```json
{
  "trangThai": "TrenQuay"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `trangThai` | `string` | Có | Giá trị `ItemTrangThai` mới |

#### Response — 200 OK

```json
{
  "id": "inv-0001-xxxx",
  "trangThai": "TrenQuay"
}
```

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `INVENTORY_NOT_FOUND` | Không tìm thấy item |

---

### 5. Lịch sử điều chỉnh tồn kho

```
GET /api/inventory/adjustments
```

**Quyền**: Mọi user đã đăng nhập

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Không | Lọc theo chi nhánh |
| `limit` | `int` | Không | Số kết quả tối đa (mặc định `20`) |

#### Response — 200 OK

Mảng AdjustmentLog Object, sắp xếp mới nhất trước.

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| `GET` | `/api/inventory` | Danh sách tồn kho | `[Authorize]` |
| `GET` | `/api/inventory/{id}` | Chi tiết item | `[Authorize]` |
| `POST` | `/api/inventory/{id}/adjust` | Điều chỉnh số lượng | `INVENTORY_MANAGE` |
| `PATCH` | `/api/inventory/{id}/status` | Cập nhật trạng thái | `INVENTORY_MANAGE` |
| `GET` | `/api/inventory/adjustments` | Lịch sử điều chỉnh | `[Authorize]` |
