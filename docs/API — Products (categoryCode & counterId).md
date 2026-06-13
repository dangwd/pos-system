# API Products — categoryCode & counterId

> Tài liệu tập trung vào hai query params quan trọng nhất của module Products:  
> `categoryCode` (lọc theo danh mục) và `counterId` (lọc tồn kho theo quầy).  
> Cập nhật: 2026-06-12

---

## 1. Tổng quan các endpoint

| Method | URL | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/products/categories` | Bearer | Danh sách danh mục (id, code, name) |
| `POST` | `/api/products/categories` | `PRODUCT_MANAGE` | Tạo danh mục mới |
| `PUT` | `/api/products/categories/{id}` | `PRODUCT_MANAGE` | Cập nhật tên & sortOrder |
| `DELETE` | `/api/products/categories/{id}` | `PRODUCT_MANAGE` | Xóa danh mục (nếu không có sản phẩm) |
| `GET` | `/api/products` | Bearer | Danh sách sản phẩm, filter + phân trang |
| `GET` | `/api/products/with-stock` | Bearer | Sản phẩm kèm tồn kho (dùng cho POS) |
| `GET` | `/api/products/{id}` | Bearer | Chi tiết sản phẩm |
| `POST` | `/api/products` | `PRODUCT_MANAGE` | Tạo sản phẩm mới |
| `PUT` | `/api/products/{id}` | `PRODUCT_MANAGE` | Cập nhật sản phẩm |
| `DELETE` | `/api/products/{id}` | `PRODUCT_MANAGE` | Vô hiệu hóa sản phẩm (soft delete) |

---

## 2. categoryCode — Mã danh mục

### Khái niệm

`categoryCode` là **chuỗi định danh ngắn** của danh mục sản phẩm (ví dụ: `"VANG"`, `"BAC"`, `"DA"`). Được dùng làm filter trên hai endpoint:

- `GET /api/products?categoryCode=VANG`
- `GET /api/products/with-stock?categoryCode=VANG`

### Lấy danh sách danh mục

```
GET /api/products/categories
GET /api/products/categories?search=vàng
Authorization: Bearer <token>
```

Response `200 OK`:
```json
[
  { "id": "uuid-1", "code": "VANG",   "name": "Vàng" },
  { "id": "uuid-2", "code": "BAC",    "name": "Bạc" },
  { "id": "uuid-3", "code": "DA",     "name": "Đá quý" },
  { "id": "uuid-4", "code": "NGOAITE","name": "Ngoại tệ" }
]
```

> Danh sách sắp xếp theo `sortOrder` tăng dần.  
> `code` là **immutable** — không thể thay đổi sau khi tạo.

### Tạo danh mục mới

```
POST /api/products/categories
Authorization: Bearer <token>  (policy: PRODUCT_MANAGE)
```

```json
{
  "code": "VANG",
  "name": "Vàng",
  "sortOrder": 1
}
```

Response `200 OK`:
```json
{ "id": "uuid...", "code": "VANG", "name": "Vàng", "sortOrder": 1 }
```

**Lỗi:**

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `422` | `PRODUCT_CATEGORY_CODE_DUPLICATE` | `code` đã tồn tại trong hệ thống |

### Cập nhật danh mục

```
PUT /api/products/categories/{id}
```

```json
{ "name": "Vàng bạc", "sortOrder": 2 }
```

> Chỉ `name` và `sortOrder` được cập nhật. `code` **không thể thay đổi**.

**Lỗi:** `PRODUCT_CATEGORY_NOT_FOUND` (404)

### Xóa danh mục

```
DELETE /api/products/categories/{id}
→ 204 No Content
```

**Lỗi:**

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `PRODUCT_CATEGORY_NOT_FOUND` | Danh mục không tồn tại |
| `422` | `PRODUCT_CATEGORY_HAS_PRODUCTS` | Danh mục đang có ít nhất 1 sản phẩm `isActive=true` |

### Dùng categoryCode làm filter

```
GET /api/products?categoryCode=VANG
GET /api/products/with-stock?categoryCode=VANG
```

> **Lưu ý**: `categoryCode` là **case-sensitive** — gửi `"VANG"` khác với `"vang"`.  
> Nên lấy giá trị từ `GET /api/products/categories`, không hardcode.

---

## 3. counterId — Lọc tồn kho theo quầy

### Khái niệm

`counterId` chỉ dùng trong endpoint `GET /api/products/with-stock`. Nó quyết định **tồn kho của quầy nào** được trả về kèm theo sản phẩm.

### `GET /api/products/with-stock`

```
GET /api/products/with-stock
GET /api/products/with-stock?counterId={uuid}
GET /api/products/with-stock?counterId={uuid}&categoryCode=VANG&search=nhẫn
Authorization: Bearer <token>
```

#### Query parameters

| Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `counterId` | `uuid` | Không | UUID quầy cần lấy tồn kho. Nếu bỏ trống → tổng hợp toàn hệ thống |
| `categoryCode` | `string` | Không | Lọc theo mã danh mục (case-sensitive) |
| `search` | `string` | Không | Tìm theo `productName` hoặc `productCode` (case-insensitive) |

#### Hành vi theo `counterId`

| `counterId` | `stockQuantity` & `stockWeightGram` |
|---|---|
| **Có giá trị** | Tồn kho của **riêng quầy đó** |
| **Không truyền** | Tổng tồn kho **gộp tất cả quầy** trong hệ thống |

#### Response `200 OK`

```json
[
  {
    "id": "ca57010b-aea7-4692-961f-df6b419466a2",
    "productCode": "NV24K-001",
    "productName": "Nhẫn vàng 24K Trơn",
    "categoryId": "uuid-category",
    "categoryCode": "VANG",
    "categoryName": "Vàng",
    "goldPurityId": "d3f7f010-b282-4c60-87a5-0518dfbeb7ad",
    "purity": "9999",
    "weightGram": 3.75,
    "weightUnitId": "61573924-f174-428f-be44-34778d69a65b",
    "productType": "NguyenKhoi",
    "isActive": true,
    "stockQuantity": 109,
    "stockWeightGram": 408.75
  },
  {
    "id": "uuid-bac",
    "productCode": "DAY-BAC-001",
    "productName": "Dây chuyền bạc 925",
    "categoryId": "uuid-category-bac",
    "categoryCode": "BAC",
    "categoryName": "Bạc",
    "goldPurityId": null,
    "purity": null,
    "weightGram": 5.0,
    "weightUnitId": null,
    "productType": "GiaDinh",
    "isActive": true,
    "stockQuantity": 15,
    "stockWeightGram": 75.0
  }
]
```

> Endpoint này **không phân trang** — luôn trả về toàn bộ sản phẩm đang `isActive=true`.  
> Dùng cho màn hình **POS chọn hàng** và **Tồn kho quầy**.

#### Ví dụ — Cashier mở POS

Cashier đã đăng nhập có `counterId = "0ae5e371-..."`. FE gọi:

```
GET /api/products/with-stock?counterId=0ae5e371-3ffb-4ed2-9e9d-4b8e549f0bfd
```

→ `stockQuantity` là số lượng hàng **còn ở quầy của cashier** đó, dùng để hiển thị lên màn hình chọn hàng POS và kiểm tra trước khi lập đơn.

---

## 4. Danh sách sản phẩm cơ bản — `GET /api/products`

```
GET /api/products
GET /api/products?categoryCode=VANG&search=nhẫn&isActive=true&page=1&pageSize=20
Authorization: Bearer <token>
```

#### Query parameters

| Tên | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `categoryCode` | `string` | — | Lọc theo mã danh mục |
| `search` | `string` | — | Tìm trong `productName` hoặc `productCode` |
| `isActive` | `bool` | — | `true` = chỉ active, `false` = chỉ inactive, bỏ trống = tất cả |
| `page` | `int` | — | Nếu có → phân trang. Nếu bỏ → trả toàn bộ |
| `pageSize` | `int` | `20` | Số bản ghi mỗi trang (chỉ dùng khi có `page`) |

#### Response — Không phân trang (bỏ `page`)

```json
[
  {
    "id": "uuid...",
    "productCode": "NV24K-001",
    "productName": "Nhẫn vàng 24K Trơn",
    "category": { "id": "uuid...", "code": "VANG", "name": "Vàng" },
    "goldPurityId": "uuid...",
    "purity": "9999",
    "weightGram": 3.75,
    "weightUnitId": "uuid...",
    "productType": "NguyenKhoi",
    "isActive": true
  }
]
```

#### Response — Có phân trang (`page=1`)

```json
{
  "data": [ /* mảng sản phẩm */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 85,
    "totalPages": 5
  }
}
```

> Sắp xếp: active lên trước → theo `sortOrder` của danh mục → theo `productName`.

---

## 5. Tạo & cập nhật sản phẩm

### `POST /api/products`

```json
{
  "productCode": "NV24K-002",
  "productName": "Nhẫn vàng 24K Trơn 2 chỉ",
  "productCategoryId": "uuid-category-vang",
  "goldPurityId": "uuid-9999",
  "weightGram": 7.5,
  "weightUnitId": "uuid-chi",
  "productType": "NguyenKhoi"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `productCode` | `string` | Có | Mã sản phẩm — **duy nhất toàn hệ thống** |
| `productName` | `string` | Có | Tên hiển thị |
| `productCategoryId` | `uuid` | Có | FK → `product_categories.id` |
| `goldPurityId` | `uuid\|null` | Không | FK → `gold_purities.id`. Null cho hàng không có hàm lượng (đá, ngoại tệ) |
| `weightGram` | `decimal` | Có | Trọng lượng mặc định (gram) |
| `weightUnitId` | `uuid\|null` | Có nếu `goldPurityId` có giá trị | FK → `weight_units.id`. **Bắt buộc** khi sản phẩm có `goldPurityId` |
| `productType` | `string` | Không | `"NguyenKhoi"` (mặc định) hoặc `"GiaDinh"` |

Response `201 Created`: `{ "id": "uuid...", "productCode": "NV24K-002" }`

**Sau khi tạo thành công**: Backend tự động seed bản ghi `inventory_items` (qty=0) cho **tất cả quầy** trong hệ thống (chạy bất đồng bộ — FE không cần chờ).

**Lỗi:**

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `422` | `PRODUCT_CODE_DUPLICATE` | `productCode` đã tồn tại |
| `404` | `PRODUCT_CATEGORY_NOT_FOUND` | `productCategoryId` không tồn tại |
| `404` | `CONFIG_GOLD_PURITY_NOT_FOUND` | `goldPurityId` không tồn tại |
| `404` | `CONFIG_WEIGHT_UNIT_NOT_FOUND` | `weightUnitId` không tồn tại |
| `422` | `PRODUCT_WEIGHT_UNIT_REQUIRED` | `goldPurityId` có giá trị nhưng `weightUnitId` = null |

### `PUT /api/products/{id}`

```json
{
  "productName": "Nhẫn vàng 24K Trơn (mới)",
  "productCategoryId": "uuid-category",
  "goldPurityId": "uuid-9999",
  "weightGram": 7.5,
  "weightUnitId": "uuid-chi",
  "productType": "NguyenKhoi"
}
```

> `productCode` **không được phép thay đổi** qua PUT. Để đổi code phải deactivate rồi tạo mới.

**Lỗi:** Tương tự POST, thêm `PRODUCT_NOT_FOUND` (404) nếu `id` không tồn tại.

### `DELETE /api/products/{id}` — Soft delete

```
DELETE /api/products/{id}
→ 204 No Content
```

Chỉ đặt `isActive = false`. Sản phẩm vẫn tồn tại trong DB, vẫn hiển thị trong lịch sử giao dịch, không xuất hiện ở POS.

**Lỗi:** `PRODUCT_NOT_FOUND` (404)

---

## 6. Quy tắc nghiệp vụ quan trọng

### `goldPurityId` + `weightUnitId` phải đi đôi

```
goldPurityId = null  → weightUnitId có thể null (hàng không vàng: đá, ngoại tệ)
goldPurityId = uuid  → weightUnitId PHẢI có giá trị (PRODUCT_WEIGHT_UNIT_REQUIRED)
```

Lý do: `weightUnitId` dùng để khớp bảng giá (`price_config_items`) theo hàm lượng + đơn vị khi lập đơn POS.

### `productType` — Loại sản phẩm

| Giá trị | Ý nghĩa |
|---|---|
| `"NguyenKhoi"` | Vàng/bạc nguyên khối, thanh, nhẫn trơn — mặc định |
| `"GiaDinh"` | Vàng gia đình / trang sức gia công — tính thêm phí gia công |

### `categoryCode` là case-sensitive

```
categoryCode=VANG   ✅ khớp danh mục code="VANG"
categoryCode=vang   ❌ không khớp
```

Luôn lấy `code` từ `GET /api/products/categories` thay vì hardcode.

### Auto-seed inventory khi tạo sản phẩm mới

Sau `POST /api/products` thành công, hệ thống chạy background task tạo `inventory_items` (qty=0) cho mọi quầy hiện có. FE có thể gọi `GET /api/products/with-stock?counterId=...` sau vài giây để thấy sản phẩm mới với `stockQuantity=0`.

---

## 7. Tóm tắt luồng FE thường dùng

### Màn hình POS — Chọn hàng

```
1. Lấy danh mục:  GET /api/products/categories
2. Hiển thị tab danh mục → khi chọn tab:
   GET /api/products/with-stock?counterId={cashier.counterId}&categoryCode={tab.code}
3. Cashier tìm kiếm:
   GET /api/products/with-stock?counterId={...}&search={keyword}
4. Dùng stockQuantity để disable nút "Thêm vào đơn" nếu = 0
```

### Màn hình Quản lý sản phẩm (Manager)

```
1. Danh sách:  GET /api/products?categoryCode=VANG&page=1&pageSize=20
2. Tạo mới:    GET /api/products/categories  (lấy categoryId)
               GET /api/config/gold-purities  (lấy goldPurityId)
               GET /api/config/weight-units   (lấy weightUnitId)
               POST /api/products
3. Sửa:        PUT /api/products/{id}
4. Ẩn:         DELETE /api/products/{id}
```

### Màn hình Tồn kho (không lọc quầy)

```
GET /api/products/with-stock?categoryCode=VANG
→ stockQuantity = tổng tất cả quầy
```
