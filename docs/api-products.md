# API Tài liệu — Module Products (`/api/products`)

> **Base URL**: `/api/products`
> **Phiên bản**: v1
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Products quản lý danh mục sản phẩm (categories) và sản phẩm (products) — là master data cho toàn hệ thống POS.

**Phân quyền**:

- `GET` (đọc): Mọi user đã đăng nhập
- `POST`, `PUT`, `DELETE` (ghi): Yêu cầu permission `PRODUCT_MANAGE`

---

## Schema

### Category Object

```json
{
  "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "code": "VANG",
  "name": "Vàng",
  "sortOrder": 1
}
```

### Product Object

```json
{
  "id": "p1q2r3s4-t5u6-7890-vwxy-z12345678901",
  "productCode": "VANG-24K-NHAN",
  "productName": "Nhẫn Vàng 24K",
  "category": {
    "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",
    "code": "VANG",
    "name": "Vàng"
  },
  "purity": "24K",
  "weightGram": 3.75,
  "weightUnitId": "wu-uuid-chi",
  "productType": "NguyenKhoi",
  "isActive": true
}
```

| Trường         | Kiểu           | Mô tả                                                  |
| -------------- | -------------- | ------------------------------------------------------ |
| `productCode`  | `string`       | Mã sản phẩm — duy nhất                                 |
| `productName`  | `string`       | Tên sản phẩm                                           |
| `category`     | `object`       | Danh mục (`id`, `code`, `name`)                        |
| `purity`       | `string`       | Hàm lượng vàng (ví dụ: `24K`, `18K`, `9999`)           |
| `weightGram`   | `decimal`      | Trọng lượng tham chiếu một đơn vị (gram)               |
| `weightUnitId` | `GUID \| null` | ID đơn vị trọng lượng tham chiếu                       |
| `productType`  | `string`       | `NguyenKhoi` hoặc `CanThucTe` (xem bảng enum bên dưới) |
| `isActive`     | `bool`         | Trạng thái hoạt động                                   |

### Enum `ProductType`

| Giá trị      | Mô tả                                                         |
| ------------ | ------------------------------------------------------------- |
| `NguyenKhoi` | Trọng lượng cố định — tính tự động từ `Quantity × weightGram` |
| `CanThucTe`  | Cân thực tế — nhân viên nhập trọng lượng thực khi giao dịch   |

---

## Endpoints — Danh mục (Categories)

### 1. Danh sách danh mục

```
GET /api/products/categories
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

```json
[
  { "id": "...", "code": "VANG", "name": "Vàng" },
  { "id": "...", "code": "BAC", "name": "Bạc" }
]
```

---

### 2. Tạo danh mục

```
POST /api/products/categories
```

**Quyền**: `PRODUCT_MANAGE`

#### Request Body

```json
{
  "code": "DA_QUY",
  "name": "Đá quý",
  "sortOrder": 3
}
```

| Trường      | Kiểu     | Bắt buộc | Mô tả                                          |
| ----------- | -------- | -------- | ---------------------------------------------- |
| `code`      | `string` | Có       | Mã danh mục — duy nhất, `SCREAMING_SNAKE_CASE` |
| `name`      | `string` | Có       | Tên hiển thị                                   |
| `sortOrder` | `int`    | Có       | Thứ tự hiển thị                                |

#### Response — 200 OK

```json
{ "id": "...", "code": "DA_QUY", "name": "Đá quý", "sortOrder": 3 }
```

#### Response — Lỗi

| HTTP  | `errorCode`                       | Nguyên nhân       |
| ----- | --------------------------------- | ----------------- |
| `422` | `PRODUCT_CATEGORY_CODE_DUPLICATE` | `code` đã tồn tại |

---

### 3. Cập nhật danh mục

```
PUT /api/products/categories/{id}
```

**Quyền**: `PRODUCT_MANAGE`

#### Request Body

```json
{ "name": "Đá quý & Ngọc", "sortOrder": 4 }
```

> Không cho phép đổi `code` sau khi tạo.

#### Response — 200 OK

Trả về Category Object đã cập nhật.

#### Response — Lỗi

| HTTP  | `errorCode`                  | Nguyên nhân             |
| ----- | ---------------------------- | ----------------------- |
| `404` | `PRODUCT_CATEGORY_NOT_FOUND` | Không tìm thấy danh mục |

---

### 4. Xóa danh mục

```
DELETE /api/products/categories/{id}
```

**Quyền**: `PRODUCT_MANAGE`

#### Response — 204 No Content

#### Response — Lỗi

| HTTP  | `errorCode`                     | Nguyên nhân                          |
| ----- | ------------------------------- | ------------------------------------ |
| `404` | `PRODUCT_CATEGORY_NOT_FOUND`    | Không tìm thấy danh mục              |
| `422` | `PRODUCT_CATEGORY_HAS_PRODUCTS` | Danh mục còn sản phẩm, không thể xóa |

---

## Endpoints — Sản phẩm (Products)

### 5. Danh sách sản phẩm

```
GET /api/products
```

**Quyền**: Mọi user đã đăng nhập

#### Query Parameters

| Tham số        | Kiểu     | Bắt buộc | Mô tả                                |
| -------------- | -------- | -------- | ------------------------------------ |
| `categoryCode` | `string` | Không    | Lọc theo mã danh mục (ví dụ: `VANG`) |

#### Response — 200 OK

```json
[
  {
    "id": "...",
    "productCode": "VANG-24K-NHAN",
    "productName": "Nhẫn Vàng 24K",
    "category": { "id": "...", "code": "VANG", "name": "Vàng" },
    "purity": "24K",
    "weightGram": 3.75,
    "weightUnitId": "wu-uuid-chi",
    "productType": "NguyenKhoi"
  }
]
```

---

### 6. Chi tiết sản phẩm

```
GET /api/products/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

Trả về Product Object đầy đủ (bao gồm `isActive`).

#### Response — Lỗi

| HTTP  | `errorCode`         | Nguyên nhân             |
| ----- | ------------------- | ----------------------- |
| `404` | `PRODUCT_NOT_FOUND` | Không tìm thấy sản phẩm |

---

### 7. Tạo sản phẩm

```
POST /api/products
```

**Quyền**: `PRODUCT_MANAGE`

#### Request Body

```json
{
  "productCode": "VANG-18K-DAY",
  "productName": "Dây Chuyền Vàng 18K",
  "productCategoryId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "purity": "18K",
  "weightGram": 2.5,
  "weightUnitId": "wu-uuid-chi",
  "productType": "NguyenKhoi"
}
```

| Trường              | Kiểu      | Bắt buộc | Mô tả                                          |
| ------------------- | --------- | -------- | ---------------------------------------------- |
| `productCode`       | `string`  | Có       | Mã sản phẩm — duy nhất                         |
| `productName`       | `string`  | Có       | Tên sản phẩm                                   |
| `productCategoryId` | `GUID`    | Có       | ID danh mục                                    |
| `purity`            | `string`  | Có       | Hàm lượng (ví dụ: `24K`, `18K`, `9999`, `925`) |
| `weightGram`        | `decimal` | Có       | Trọng lượng tham chiếu một đơn vị (gram)       |
| `weightUnitId`      | `GUID`    | Không    | ID đơn vị trọng lượng (mặc định `null`)        |
| `productType`       | `string`  | Không    | `NguyenKhoi` (mặc định) hoặc `CanThucTe`       |

#### Response — 201 Created

```json
{ "id": "...", "productCode": "VANG-18K-DAY" }
```

#### Response — Lỗi

| HTTP  | `errorCode`                  | Nguyên nhân                       |
| ----- | ---------------------------- | --------------------------------- |
| `422` | `PRODUCT_CODE_DUPLICATE`     | `productCode` đã tồn tại          |
| `404` | `PRODUCT_CATEGORY_NOT_FOUND` | `productCategoryId` không tồn tại |

---

### 8. Cập nhật sản phẩm

```
PUT /api/products/{id}
```

**Quyền**: `PRODUCT_MANAGE`

#### Request Body

```json
{
  "productName": "Dây Chuyền Vàng 18K (Mẫu mới)",
  "productCategoryId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "purity": "18K",
  "weightGram": 2.8,
  "weightUnitId": "wu-uuid-chi",
  "productType": "NguyenKhoi"
}
```

> `productCode` không thay đổi được sau khi tạo.

#### Response — 200 OK

Trả về Product Object đã cập nhật.

#### Response — Lỗi

| HTTP  | `errorCode`                  | Nguyên nhân                |
| ----- | ---------------------------- | -------------------------- |
| `404` | `PRODUCT_NOT_FOUND`          | Không tìm thấy sản phẩm    |
| `404` | `PRODUCT_CATEGORY_NOT_FOUND` | Danh mục mới không tồn tại |

---

### 9. Vô hiệu hóa sản phẩm

```
DELETE /api/products/{id}
```

**Quyền**: `PRODUCT_MANAGE`

> Tên endpoint là `DELETE` nhưng thực chất là **deactivate** (`isActive = false`), không xóa khỏi DB.

#### Response — 204 No Content

#### Response — Lỗi

| HTTP  | `errorCode`         | Nguyên nhân             |
| ----- | ------------------- | ----------------------- |
| `404` | `PRODUCT_NOT_FOUND` | Không tìm thấy sản phẩm |

---

## Tóm tắt Endpoints

| Method   | Path                            | Mô tả                | Quyền            |
| -------- | ------------------------------- | -------------------- | ---------------- |
| `GET`    | `/api/products/categories`      | Danh sách danh mục   | `[Authorize]`    |
| `POST`   | `/api/products/categories`      | Tạo danh mục         | `PRODUCT_MANAGE` |
| `PUT`    | `/api/products/categories/{id}` | Cập nhật danh mục    | `PRODUCT_MANAGE` |
| `DELETE` | `/api/products/categories/{id}` | Xóa danh mục         | `PRODUCT_MANAGE` |
| `GET`    | `/api/products`                 | Danh sách sản phẩm   | `[Authorize]`    |
| `GET`    | `/api/products/{id}`            | Chi tiết sản phẩm    | `[Authorize]`    |
| `POST`   | `/api/products`                 | Tạo sản phẩm         | `PRODUCT_MANAGE` |
| `PUT`    | `/api/products/{id}`            | Cập nhật sản phẩm    | `PRODUCT_MANAGE` |
| `DELETE` | `/api/products/{id}`            | Vô hiệu hóa sản phẩm | `PRODUCT_MANAGE` |
