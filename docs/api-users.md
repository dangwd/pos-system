# API Tài liệu — Module Users (`/api/users`)

> **Base URL**: `/api/users`
> **Phiên bản**: v1
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Users quản lý tài khoản nhân viên trong hệ thống: tạo mới, cập nhật thông tin, đổi role, kích hoạt/vô hiệu hóa, và reset mật khẩu.

**Phân quyền toàn controller**: Tất cả endpoint yêu cầu permission `USER_MANAGE`.
Trong thực tế, chỉ **SystemAdmin** được cấp quyền này.

---

## Schema User Object

Đối tượng user trả về trong các response GET:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeCode": "NV001",
  "username": "NV001",
  "fullName": "Nguyễn Văn A",
  "phone": "0201234567",
  "email": "nva@example.com",
  "address": "Vientiane, Lào",
  "dateOfBirth": "1990-05-15",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "counterId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "counterName": "Quầy 1",
  "role": {
    "id": "a1b2c3d4-...",
    "code": "Cashier",
    "name": "Nhân viên bán hàng"
  },
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "lastLoginAt": "2026-06-10T08:30:00Z"
}
```

| Trường         | Kiểu               | Mô tả                                     |
| -------------- | ------------------ | ----------------------------------------- |
| `id`           | `GUID`             | ID duy nhất                               |
| `employeeCode` | `string`           | Mã nhân viên (ví dụ: `NV001`)             |
| `username`     | `string`           | Tên đăng nhập (mặc định = `employeeCode`) |
| `fullName`     | `string`           | Họ và tên                                 |
| `phone`        | `string`           | Số điện thoại                             |
| `email`        | `string \| null`   | Email (tùy chọn)                          |
| `address`      | `string \| null`   | Địa chỉ (tùy chọn)                        |
| `dateOfBirth`  | `date \| null`     | Ngày sinh `YYYY-MM-DD` (tùy chọn)         |
| `branchId`     | `GUID`             | Chi nhánh được gán                        |
| `counterId`    | `GUID \| null`     | Quầy giao dịch được phân công             |
| `counterName`  | `string \| null`   | Tên quầy giao dịch                        |
| `role`         | `object`           | Thông tin role (`id`, `code`, `name`)     |
| `isActive`     | `bool`             | Trạng thái hoạt động                      |
| `createdAt`    | `ISO 8601`         | Thời điểm tạo (UTC)                       |
| `lastLoginAt`  | `ISO 8601 \| null` | Lần đăng nhập cuối (UTC)                  |

---

## Endpoints

### 1. Danh sách người dùng

```
GET /api/users
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Query Parameters

| Tham số    | Kiểu   | Bắt buộc | Mô tả                                     |
| ---------- | ------ | -------- | ----------------------------------------- |
| `branchId` | `GUID` | Không    | Lọc theo chi nhánh. Bỏ trống = lấy tất cả |

#### Response — 200 OK

Trả về mảng User Object (chỉ các user đang hoạt động — `isActive = true`).

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "employeeCode": "NV001",
    "username": "NV001",
    "fullName": "Nguyễn Văn A",
    "phone": "0201234567",
    "email": null,
    "address": null,
    "dateOfBirth": null,
    "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "role": { "id": "...", "code": "Cashier", "name": "Nhân viên bán hàng" },
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "lastLoginAt": "2026-06-10T08:30:00Z"
  }
]
```

---

### 2. Chi tiết người dùng

```
GET /api/users/{id}
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Path Parameters

| Tham số | Kiểu   | Mô tả         |
| ------- | ------ | ------------- |
| `id`    | `GUID` | ID người dùng |

#### Response — 200 OK

Trả về một User Object đầy đủ (xem schema ở trên).

#### Response — Lỗi

| HTTP  | `errorCode`      | Nguyên nhân                       |
| ----- | ---------------- | --------------------------------- |
| `404` | `USER_NOT_FOUND` | Không tìm thấy user với ID đã cho |

---

### 3. Tạo người dùng mới

```
POST /api/users
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Request Body

```json
{
  "employeeCode": "NV002",
  "fullName": "Trần Thị B",
  "phone": "0207654321",
  "password": "Cashier@123",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "ttb@example.com",
  "address": "Vientiane, Lào",
  "dateOfBirth": "1995-08-20"
}
```

| Trường         | Kiểu     | Bắt buộc | Mô tả                                                           |
| -------------- | -------- | -------- | --------------------------------------------------------------- |
| `employeeCode` | `string` | Có       | Mã nhân viên — duy nhất trong hệ thống, đồng thời là `username` |
| `fullName`     | `string` | Có       | Họ và tên                                                       |
| `phone`        | `string` | Có       | Số điện thoại                                                   |
| `password`     | `string` | Có       | Mật khẩu ban đầu (được hash BCrypt trước khi lưu)               |
| `branchId`     | `GUID`   | Có       | ID chi nhánh — phải tồn tại và đang hoạt động                   |
| `roleId`       | `GUID`   | Có       | ID role — phải tồn tại trong hệ thống                           |
| `email`        | `string` | Không    | Email                                                           |
| `address`      | `string` | Không    | Địa chỉ                                                         |
| `dateOfBirth`  | `date`   | Không    | Ngày sinh `YYYY-MM-DD`                                          |
| `counterId`    | `GUID`   | Không    | Quầy giao dịch được phân công ngay khi tạo                      |

#### Response — 201 Created

```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "employeeCode": "NV002",
  "username": "NV002",
  "fullName": "Trần Thị B"
}
```

Header `Location: /api/users/{id}`

#### Response — Lỗi

| HTTP  | `errorCode`                    | Nguyên nhân                                             |
| ----- | ------------------------------ | ------------------------------------------------------- |
| `422` | `USER_EMPLOYEE_CODE_DUPLICATE` | `employeeCode` đã tồn tại trong hệ thống                |
| `404` | `BRANCH_NOT_FOUND`             | `branchId` không tồn tại hoặc chi nhánh không hoạt động |
| `404` | `ROLE_NOT_FOUND`               | `roleId` không tồn tại                                  |
| `422` | `VALIDATION_FAILED`            | Dữ liệu đầu vào không hợp lệ                            |

---

### 4. Cập nhật thông tin người dùng

```
PUT /api/users/{id}
```

**Quyền yêu cầu**: `USER_MANAGE`

> Chỉ cập nhật thông tin cá nhân. Để đổi role hoặc mật khẩu dùng endpoint riêng.

#### Path Parameters

| Tham số | Kiểu   | Mô tả         |
| ------- | ------ | ------------- |
| `id`    | `GUID` | ID người dùng |

#### Request Body

```json
{
  "fullName": "Trần Thị B (đã cập nhật)",
  "phone": "0209999999",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "email": "ttb_new@example.com",
  "address": "Luang Prabang, Lào",
  "dateOfBirth": "1995-08-20"
}
```

| Trường        | Kiểu     | Bắt buộc | Mô tả                                          |
| ------------- | -------- | -------- | ---------------------------------------------- |
| `fullName`    | `string` | Có       | Họ và tên mới                                  |
| `phone`       | `string` | Có       | Số điện thoại mới                              |
| `branchId`    | `GUID`   | Có       | Chi nhánh mới — phải tồn tại và đang hoạt động |
| `email`       | `string` | Không    | Email mới                                      |
| `address`     | `string` | Không    | Địa chỉ mới                                    |
| `dateOfBirth` | `date`   | Không    | Ngày sinh `YYYY-MM-DD`                         |

#### Response — 204 No Content

#### Response — Lỗi

| HTTP  | `errorCode`         | Nguyên nhân                                   |
| ----- | ------------------- | --------------------------------------------- |
| `404` | `USER_NOT_FOUND`    | Không tìm thấy user                           |
| `404` | `BRANCH_NOT_FOUND`  | `branchId` không tồn tại hoặc không hoạt động |
| `422` | `VALIDATION_FAILED` | Dữ liệu đầu vào không hợp lệ                  |

---

### 5. Phân công quầy giao dịch

```
PATCH /api/users/{id}/counter
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Request Body

```json
{ "counterId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

Truyền `null` để hủy phân công quầy cho nhân viên.

| Trường      | Kiểu           | Bắt buộc | Mô tả                                     |
| ----------- | -------------- | -------- | ----------------------------------------- |
| `counterId` | `GUID \| null` | Có       | ID quầy cần phân công, hoặc `null` để hủy |

#### Response — 204 No Content

#### Response — Lỗi

| HTTP  | `errorCode`      | Nguyên nhân         |
| ----- | ---------------- | ------------------- |
| `404` | `USER_NOT_FOUND` | Không tìm thấy user |

---

### 6. Đổi Role

```
PATCH /api/users/{id}/role
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Path Parameters

| Tham số | Kiểu   | Mô tả         |
| ------- | ------ | ------------- |
| `id`    | `GUID` | ID người dùng |

#### Request Body

```json
{
  "roleId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

| Trường   | Kiểu   | Bắt buộc | Mô tả       |
| -------- | ------ | -------- | ----------- |
| `roleId` | `GUID` | Có       | ID role mới |

#### Response — 204 No Content

#### Response — Lỗi

| HTTP  | `errorCode`      | Nguyên nhân            |
| ----- | ---------------- | ---------------------- |
| `404` | `USER_NOT_FOUND` | Không tìm thấy user    |
| `404` | `ROLE_NOT_FOUND` | `roleId` không tồn tại |

---

### 6. Kích hoạt tài khoản

```
PATCH /api/users/{id}/activate
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Path Parameters

| Tham số | Kiểu   | Mô tả         |
| ------- | ------ | ------------- |
| `id`    | `GUID` | ID người dùng |

#### Response — 204 No Content

Đặt `isActive = true`. User có thể đăng nhập trở lại.

#### Response — Lỗi

| HTTP  | `errorCode`      | Nguyên nhân         |
| ----- | ---------------- | ------------------- |
| `404` | `USER_NOT_FOUND` | Không tìm thấy user |

---

### 7. Vô hiệu hóa tài khoản

```
PATCH /api/users/{id}/deactivate
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Path Parameters

| Tham số | Kiểu   | Mô tả         |
| ------- | ------ | ------------- |
| `id`    | `GUID` | ID người dùng |

#### Response — 204 No Content

Đặt `isActive = false`. User không thể đăng nhập, các token hiện tại vẫn hợp lệ đến khi hết hạn (cần logout để thu hồi refresh token).

#### Response — Lỗi

| HTTP  | `errorCode`      | Nguyên nhân         |
| ----- | ---------------- | ------------------- |
| `404` | `USER_NOT_FOUND` | Không tìm thấy user |

---

### 8. Reset mật khẩu

```
POST /api/users/{id}/reset-password
```

**Quyền yêu cầu**: `USER_MANAGE`

#### Path Parameters

| Tham số | Kiểu   | Mô tả         |
| ------- | ------ | ------------- |
| `id`    | `GUID` | ID người dùng |

#### Request Body

```json
{
  "newPassword": "NewPassword@456"
}
```

| Trường        | Kiểu     | Bắt buộc | Mô tả                                         |
| ------------- | -------- | -------- | --------------------------------------------- |
| `newPassword` | `string` | Có       | Mật khẩu mới (được hash BCrypt trước khi lưu) |

#### Response — 204 No Content

#### Response — Lỗi

| HTTP  | `errorCode`      | Nguyên nhân         |
| ----- | ---------------- | ------------------- |
| `404` | `USER_NOT_FOUND` | Không tìm thấy user |

---

## Tóm tắt Endpoints

| Method  | Path                             | Mô tả                                     | Response           |
| ------- | -------------------------------- | ----------------------------------------- | ------------------ |
| `GET`   | `/api/users`                     | Danh sách user (có filter theo chi nhánh) | `200` mảng User    |
| `GET`   | `/api/users/{id}`                | Chi tiết một user                         | `200` User         |
| `POST`  | `/api/users`                     | Tạo user mới                              | `201` + `Location` |
| `PUT`   | `/api/users/{id}`                | Cập nhật thông tin cá nhân                | `204`              |
| `PATCH` | `/api/users/{id}/counter`        | Phân công quầy giao dịch                  | `204`              |
| `PATCH` | `/api/users/{id}/role`           | Đổi role                                  | `204`              |
| `PATCH` | `/api/users/{id}/activate`       | Kích hoạt tài khoản                       | `204`              |
| `PATCH` | `/api/users/{id}/deactivate`     | Vô hiệu hóa tài khoản                     | `204`              |
| `POST`  | `/api/users/{id}/reset-password` | Reset mật khẩu                            | `204`              |

---

## Cấu trúc Response Lỗi

```json
{
  "status": 404,
  "errorCode": "USER_NOT_FOUND"
}
```

---

## Ví dụ sử dụng (cURL)

### Lấy danh sách user theo chi nhánh

```bash
curl "http://localhost:5000/api/users?branchId=7c9e6679-7425-40de-944b-e07fc1f90ae7" \
  -H "Authorization: Bearer <accessToken>"
```

### Tạo user mới

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeCode": "NV002",
    "fullName": "Trần Thị B",
    "phone": "0207654321",
    "password": "Cashier@123",
    "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

### Vô hiệu hóa tài khoản

```bash
curl -X PATCH "http://localhost:5000/api/users/3fa85f64-5717-4562-b3fc-2c963f66afa6/deactivate" \
  -H "Authorization: Bearer <accessToken>"
```

### Reset mật khẩu

```bash
curl -X POST "http://localhost:5000/api/users/3fa85f64-5717-4562-b3fc-2c963f66afa6/reset-password" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "NewPassword@456"}'
```

---

## Ghi chú nghiệp vụ

- **`username` không thay đổi được** qua API này — mặc định bằng `employeeCode` lúc tạo. Để đổi username cần thao tác trực tiếp DB hoặc thêm endpoint riêng.
- **Vô hiệu hóa không thu hồi token ngay**: access token còn hiệu lực đến khi hết hạn (mặc định 480 phút). Nên gọi `POST /api/auth/logout` trước hoặc sau khi deactivate nếu cần ngắt phiên ngay.
- **Mật khẩu** được hash bằng BCrypt trước khi lưu vào DB — không bao giờ lưu plaintext.
- **`GET /api/users`** chỉ trả về user `isActive = true`. Để xem user đã bị vô hiệu hóa cần truy vấn trực tiếp DB.
