# API Tài liệu — Module Trade (`/api/trade`)

> **Base URL**: `/api/trade`
> **Phiên bản**: v1
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Trade xử lý các giao dịch **mua vào / đổi hàng** phức tạp: khách hàng mang vàng đến để mua thêm, đổi mẫu, đổi miễn phí trong tháng, hoặc đổi thành tiền mặt.

**Phân quyền**:

- `GET`: Mọi user đã đăng nhập
- `POST` (tạo giao dịch): Yêu cầu `TRADE_CREATE`

---

## Enums

### `TradeType` — Loại giao dịch đổi hàng

| Giá trị              | Tên            | Mô tả                                                    |
| -------------------- | -------------- | -------------------------------------------------------- |
| `1` / `MuaThem`      | Mua thêm       | Khách đổi vàng quán, trả thêm chênh lệch                 |
| `2` / `DoiHang`      | Đổi hàng       | Đổi sang loại khác, tính phí hủy hoại/hao hụt            |
| `3` / `DoiMienPhi`   | Đổi miễn phí   | Cùng giá trị, trong 1 tháng kể từ ngày mua, không có lỗi |
| `4` / `DoiThanhTien` | Đổi thành tiền | Định giá theo giá mua vào, chi tiền mặt cho khách        |

---

## Schema

### TradeTxnResponse Object

```json
{
  "id": "trd-0001-xxxx",
  "txnCode": "TRD-20260610-001",
  "loai": "DoiHang",
  "branchId": "7c9e6679-...",
  "employeeId": "3fa85f64-...",
  "customerId": "cust-xxxx",
  "itemCuId": "inv-old-xxxx",
  "itemCuName": "Nhẫn Vàng 24K (cũ)",
  "itemCuWeightGram": 3750.0,
  "itemMoiId": "inv-new-xxxx",
  "itemMoiName": "Dây Chuyền Vàng 18K (mới)",
  "itemMoiWeightGram": 4000.0,
  "phiHuHai": 50000000,
  "tienHaoHut": 10000000,
  "tienCong": 30000000,
  "chenhLech": 90000000,
  "note": null,
  "ngayGio": "2026-06-10T09:30:00Z"
}
```

| Trường             | Kiểu           | Mô tả                                                              |
| ------------------ | -------------- | ------------------------------------------------------------------ |
| `txnCode`          | `string`       | Mã giao dịch đổi hàng                                              |
| `loai`             | `string`       | Loại (`TradeType`)                                                 |
| `itemCuId`         | `GUID`         | Item cũ khách mang đến                                             |
| `itemCuWeightGram` | `decimal`      | Trọng lượng item cũ (gram)                                         |
| `itemMoiId`        | `GUID \| null` | Item mới cửa hàng xuất (null nếu `DoiThanhTien`)                   |
| `phiHuHai`         | `decimal`      | Phí hủy hoại (LAK)                                                 |
| `tienHaoHut`       | `decimal`      | Tiền hao hụt (LAK)                                                 |
| `tienCong`         | `decimal`      | Tiền công gia công (LAK)                                           |
| `chenhLech`        | `decimal`      | Chênh lệch (LAK). `> 0`: khách trả thêm; `< 0`: cửa hàng hoàn tiền |

---

## Endpoints

### 1. Tạo giao dịch đổi hàng

```
POST /api/trade
```

**Quyền**: `TRADE_CREATE`

#### Request Body

```json
{
  "loai": "DoiHang",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "employeeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "itemCuId": "inv-old-xxxx-xxxx",
  "itemMoiId": "inv-new-xxxx-xxxx",
  "phiHuHai": 50000000,
  "haoHutGram": 0.1,
  "tienCong": 30000000,
  "customerId": null,
  "ngayMuaCu": null,
  "note": "Khách đổi sang dây chuyền"
}
```

| Trường       | Kiểu        | Bắt buộc | Mô tả                                                                                 |
| ------------ | ----------- | -------- | ------------------------------------------------------------------------------------- |
| `loai`       | `TradeType` | Có       | Loại giao dịch                                                                        |
| `branchId`   | `GUID`      | Có       | Chi nhánh thực hiện                                                                   |
| `employeeId` | `GUID`      | Có       | ID nhân viên                                                                          |
| `itemCuId`   | `GUID`      | Có       | ID inventory item cũ khách mang đến                                                   |
| `itemMoiId`  | `GUID`      | Không    | ID inventory item mới cửa hàng xuất (bắt buộc với `MuaThem`, `DoiHang`, `DoiMienPhi`) |
| `phiHuHai`   | `decimal`   | Có       | Phí hủy hoại (LAK, có thể `0`)                                                        |
| `haoHutGram` | `decimal`   | Có       | Hao hụt trọng lượng (gram, có thể `0`)                                                |
| `tienCong`   | `decimal`   | Có       | Tiền công gia công (LAK, có thể `0`)                                                  |
| `customerId` | `GUID`      | Không    | ID khách hàng                                                                         |
| `ngayMuaCu`  | `DateTime`  | Không    | Ngày mua ban đầu — **bắt buộc** với `DoiMienPhi` để kiểm tra điều kiện 1 tháng        |
| `note`       | `string`    | Không    | Ghi chú                                                                               |

#### Response — 200 OK

Trả về `TradeTxnResponse` đầy đủ.

#### Response — Lỗi

| HTTP  | `errorCode`                  | Nguyên nhân                                                     |
| ----- | ---------------------------- | --------------------------------------------------------------- |
| `404` | `INVENTORY_NOT_FOUND`        | `itemCuId` hoặc `itemMoiId` không tồn tại                       |
| `422` | `TRADE_ITEM_NOT_QUAN`        | Item cũ có nguồn gốc `Ngoai` — không được đổi miễn phí/mua thêm |
| `422` | `TRADE_DOI_MIEN_PHI_EXPIRED` | `DoiMienPhi`: đã quá 1 tháng kể từ `ngayMuaCu`                  |
| `422` | `VALIDATION_FAILED`          | Dữ liệu không hợp lệ                                            |

---

### 2. Chi tiết giao dịch đổi hàng

```
GET /api/trade/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

Trả về `TradeTxnResponse`.

#### Response — Lỗi

| HTTP  | `errorCode`          | Nguyên nhân              |
| ----- | -------------------- | ------------------------ |
| `404` | `RESOURCE_NOT_FOUND` | Không tìm thấy giao dịch |

---

### 3. Danh sách giao dịch đổi hàng

```
GET /api/trade
```

**Quyền**: Mọi user đã đăng nhập

#### Query Parameters

| Tham số    | Kiểu       | Bắt buộc | Mô tả                                   |
| ---------- | ---------- | -------- | --------------------------------------- |
| `branchId` | `GUID`     | Không    | Lọc theo chi nhánh                      |
| `loai`     | `string`   | Không    | Lọc theo `TradeType` (ví dụ: `DoiHang`) |
| `from`     | `DateTime` | Không    | Từ ngày (ISO 8601)                      |
| `to`       | `DateTime` | Không    | Đến ngày (ISO 8601)                     |
| `page`     | `int`      | Không    | Trang hiện tại (mặc định `1`)           |
| `limit`    | `int`      | Không    | Số item mỗi trang (mặc định `20`)       |

#### Response — 200 OK

```json
{
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "data": [
    /* TradeTxnResponse[] */
  ]
}
```

---

## Tóm tắt Endpoints

| Method | Path              | Mô tả                  | Quyền          |
| ------ | ----------------- | ---------------------- | -------------- |
| `POST` | `/api/trade`      | Tạo giao dịch đổi hàng | `TRADE_CREATE` |
| `GET`  | `/api/trade/{id}` | Chi tiết giao dịch     | `[Authorize]`  |
| `GET`  | `/api/trade`      | Danh sách (phân trang) | `[Authorize]`  |

---

## Ghi chú nghiệp vụ

- Logic tính `chenhLech`, `tienHaoHut` và kiểm tra điều kiện nằm trong `TradeService` (`Application/Services/`) — không đặt trong handler.
- **`DoiMienPhi`**: bắt buộc truyền `ngayMuaCu`. Hệ thống kiểm tra: `today - ngayMuaCu <= 30 ngày`.
- **`DoiThanhTien`**: `itemMoiId` là `null` — cửa hàng chi tiền mặt dựa trên giá mua vào hiện tại.
- **Item nguồn gốc `Ngoai`**: chỉ xử lý được `DoiThanhTien` hoặc chuyển xưởng, không được `MuaThem`/`DoiHang`/`DoiMienPhi`.
