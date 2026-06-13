# API Tài liệu — Module Customers (`/api/customers`)

> **Base URL**: `/api/customers`  
> **Phiên bản**: v1  
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Customers quản lý danh sách khách hàng, hỗ trợ tìm kiếm nhanh khi lập đơn POS và lưu thông tin tích điểm loyalty.

**Phân quyền**: Mọi user đã đăng nhập (`[Authorize]`) — không yêu cầu permission riêng.

---

## Schema — Customer Object

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Nguyễn Thị C",
  "phoneNumber": "0201112222",
  "email": "ntc@example.com",
  "loyaltyTier": "Silver",
  "accumulatedPoints": 1500,
  "isActive": true,
  "createdAt": "2025-03-01T00:00:00Z"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | `GUID` | ID duy nhất |
| `name` | `string` | Họ và tên khách hàng |
| `phoneNumber` | `string \| null` | Số điện thoại |
| `email` | `string \| null` | Email |
| `loyaltyTier` | `string \| null` | Hạng thành viên (ví dụ: `Bronze`, `Silver`, `Gold`) |
| `accumulatedPoints` | `int` | Điểm tích lũy |
| `isActive` | `bool` | Trạng thái hoạt động |
| `createdAt` | `ISO 8601` | Thời điểm tạo (UTC) |

---

## Endpoints

### 1. Tìm kiếm khách hàng

```
GET /api/customers
```

**Quyền**: Mọi user đã đăng nhập  
Dùng để tìm kiếm nhanh khi lập đơn POS (gõ tên hoặc số điện thoại).

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `q` | `string` | Không | Từ khóa tìm theo tên hoặc số điện thoại |
| `limit` | `int` | Không | Số kết quả tối đa (mặc định `10`) |

#### Response — 200 OK

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Nguyễn Thị C",
    "phoneNumber": "0201112222",
    "email": null,
    "loyaltyTier": "Silver",
    "accumulatedPoints": 1500,
    "isActive": true,
    "createdAt": "2025-03-01T00:00:00Z"
  }
]
```

---

### 2. Chi tiết khách hàng

```
GET /api/customers/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Path Parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `GUID` | ID khách hàng |

#### Response — 200 OK

Trả về Customer Object đầy đủ.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CUSTOMER_NOT_FOUND` | Không tìm thấy khách hàng |

---

### 3. Tạo khách hàng mới

```
POST /api/customers
```

**Quyền**: Mọi user đã đăng nhập

#### Request Body

```json
{
  "name": "Trần Văn D",
  "phoneNumber": "0203334444",
  "loyaltyTier": "Bronze",
  "email": "tvd@example.com",
  "address": "Vientiane",
  "dateOfBirth": "1985-06-15"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `name` | `string` | Có | Họ và tên |
| `phoneNumber` | `string` | Không | Số điện thoại — nếu cung cấp phải duy nhất |
| `loyaltyTier` | `string` | Không | Hạng thành viên ban đầu |
| `email` | `string` | Không | Email |
| `address` | `string` | Không | Địa chỉ |
| `dateOfBirth` | `date` | Không | Ngày sinh `YYYY-MM-DD` |

#### Response — 200 OK

Trả về Customer Object vừa tạo.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `422` | `CUSTOMER_PHONE_DUPLICATE` | Số điện thoại đã tồn tại |
| `422` | `VALIDATION_FAILED` | Dữ liệu không hợp lệ |

---

### 4. Cập nhật khách hàng

```
PUT /api/customers/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Request Body

Cùng cấu trúc với `CreateCustomerRequest`.

```json
{
  "name": "Trần Văn D (cập nhật)",
  "phoneNumber": "0203334444",
  "loyaltyTier": "Silver",
  "email": "tvd_new@example.com",
  "address": "Luang Prabang",
  "dateOfBirth": "1985-06-15"
}
```

#### Response — 200 OK

Trả về Customer Object đã cập nhật.

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CUSTOMER_NOT_FOUND` | Không tìm thấy khách hàng |
| `422` | `CUSTOMER_PHONE_DUPLICATE` | Số điện thoại đã được dùng bởi khách hàng khác |
| `422` | `VALIDATION_FAILED` | Dữ liệu không hợp lệ |

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Response |
|---|---|---|---|
| `GET` | `/api/customers?q=&limit=` | Tìm kiếm khách hàng | `200` mảng |
| `GET` | `/api/customers/{id}` | Chi tiết khách hàng | `200` object |
| `POST` | `/api/customers` | Tạo khách hàng | `200` object |
| `PUT` | `/api/customers/{id}` | Cập nhật khách hàng | `200` object |

---

## Ghi chú nghiệp vụ

- Khách hàng là **tùy chọn** khi lập đơn — giao dịch không bắt buộc phải có `customerId`.
- `GET /api/customers?q=` trả về tối đa `limit` kết quả, phù hợp dùng cho autocomplete ở màn hình POS.
- Điểm tích lũy (`accumulatedPoints`) được cập nhật bởi backend sau mỗi giao dịch hoàn tất, không có endpoint cập nhật trực tiếp.
