# API Tài liệu — Module Transactions (`/api/transactions`)

> **Base URL**: `/api/transactions`  
> **Phiên bản**: v1  
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Transactions xử lý toàn bộ giao dịch bán hàng POS: Bán Vàng, Bán Bạc, Mua Vàng, Thu Đổi Vàng, Thu Đổi Ngoại Tệ.

**Phân quyền**: Mọi user đã đăng nhập (`[Authorize]`) — không yêu cầu permission riêng cho `GET` và `POST`.  
Duyệt/từ chối giao dịch yêu cầu `TRANSACTION_APPROVE` (xử lý ở tầng handler).

---

## Enums

### `TransactionType` — Loại giao dịch

| Giá trị | Tên | Mô tả |
|---|---|---|
| `1` / `SellGold` | Bán Vàng | Cửa hàng bán vàng cho khách |
| `2` / `SellSilver` | Bán Bạc | Cửa hàng bán bạc cho khách |
| `3` / `BuyGold` | Mua Vàng | Cửa hàng mua vàng từ khách |
| `4` / `ExchangeGold` | Thu Đổi Vàng | Trade-in: khách đổi vàng |
| `5` / `ExchangeCurrency` | Thu Đổi Ngoại Tệ | Đổi ngoại tệ |

### `TransactionStatus` — Trạng thái

| Giá trị | Tên | Mô tả |
|---|---|---|
| `0` / `Draft` | Nháp | Đang soạn |
| `1` / `Pending` | Chờ duyệt | Đã gửi, chờ Manager phê duyệt |
| `2` / `Approved` | Đã duyệt | Manager đã duyệt |
| `3` / `Rejected` | Từ chối | Manager từ chối |
| `4` / `Completed` | Hoàn tất | Đã thu tiền, không được sửa |

**State machine**:
```
DRAFT → PENDING → APPROVED → COMPLETED
                ↘ REJECTED
```

### `ItemRole` — Vai trò của item trong đơn

| Giá trị | Mô tả |
|---|---|
| `Normal` | Item thông thường |
| `TradeIn` | Item được đổi vào (trade-in) |
| `TradeOut` | Item xuất ra đổi |

---

## Schema

### TransactionListItem Object (trong danh sách)

```json
{
  "id": "txn-0001-xxxx",
  "invoiceCode": "INV-20260610-001",
  "type": "SellGold",
  "status": "Completed",
  "branchId": "7c9e6679-...",
  "branchName": "Chi nhánh Vientiane Center",
  "counterId": "CTR-001",
  "counterName": "Quầy 1",
  "cashierId": "3fa85f64-...",
  "cashierName": "Nguyễn Văn A",
  "subtotalAmount": 1800000000,
  "laborFee": 50000000,
  "stoneFee": 0,
  "totalAmount": 1850000000,
  "depositAmount": 0,
  "currency": "LAK",
  "paymentMethod": "CASH",
  "note": null,
  "transactedAt": "2026-06-10T09:00:00Z",
  "customer": {
    "id": "...",
    "name": "Nguyễn Thị C",
    "phoneNumber": "0201112222"
  },
  "items": [ /* TransactionItemResponse[] */ ],
  "referenceInvoiceCode": null
}
```

### TransactionItem Object

```json
{
  "id": "item-0001-xxxx",
  "productId": "p1q2r3s4-...",
  "productSnapshotName": "Nhẫn Vàng 24K",
  "quantity": 1,
  "weightMg": 3750.0,
  "priceTableUnitPriceLak": 1900000000,
  "unitPriceLak": 1800000000,
  "lineTotal": 1800000000,
  "itemRole": "Normal",
  "laborFee": 50000000,
  "stoneFee": 0
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `priceTableUnitPriceLak` | `decimal` | Giá từ bảng giá tại thời điểm lập đơn (snapshot) |
| `unitPriceLak` | `decimal` | Giá thực tế nhân viên nhập (có thể khác giá bảng) |
| `lineTotal` | `decimal` | `unitPriceLak × quantity` |
| `laborFee` | `decimal` | Phí gia công (LAK) |
| `stoneFee` | `decimal` | Phí đá (LAK) |

---

## Endpoints

### 1. Tạo giao dịch mới

```
POST /api/transactions
```

**Quyền**: Mọi user đã đăng nhập  
`cashierId` được lấy tự động từ JWT claim — client không truyền.

#### Request Body

```json
{
  "type": "SellGold",
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "staffId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": "CTR-001",
  "items": [
    {
      "productId": "p1q2r3s4-t5u6-7890-vwxy-z12345678901",
      "productName": "Nhẫn Vàng 24K",
      "quantity": 1,
      "weightMg": 3750.0,
      "unitPriceLak": 1800000000,
      "itemRole": "Normal",
      "laborFee": 50000000,
      "stoneFee": 0
    }
  ],
  "paymentMethod": "CASH",
  "currency": "LAK",
  "exchangeRate": null,
  "note": null,
  "customerId": null,
  "depositAmount": 0,
  "referenceInvoiceCode": null
}
```

**CreateTransactionRequest**:

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `type` | `TransactionType` | Có | Loại giao dịch |
| `branchId` | `GUID` | Có | Chi nhánh |
| `staffId` | `GUID` | Có | Nhân viên bán hàng |
| `counterId` | `string` | Có | Mã quầy |
| `items` | `TransactionItemRequest[]` | Có | Danh sách sản phẩm |
| `paymentMethod` | `string` | Có | Phương thức: `CASH`, `BANK`, `TRANSFER` |
| `currency` | `string` | Không | `LAK` (mặc định), `THB`, `USD` |
| `exchangeRate` | `decimal` | Không | Tỷ giá nếu thanh toán ngoại tệ |
| `note` | `string` | Không | Ghi chú |
| `customerId` | `GUID` | Không | ID khách hàng |
| `depositAmount` | `decimal` | Không | Tiền cọc (mặc định `0`) |
| `referenceInvoiceCode` | `string` | Không | Mã hóa đơn tham chiếu (đảo phiếu) |

**TransactionItemRequest**:

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `productId` | `GUID` | Có | ID sản phẩm |
| `productName` | `string` | Có | Tên sản phẩm (snapshot) |
| `quantity` | `int` | Có | Số lượng |
| `weightMg` | `decimal` | Có | Trọng lượng (mg) |
| `unitPriceLak` | `decimal` | Có | Đơn giá (LAK) do nhân viên nhập |
| `itemRole` | `ItemRole` | Không | Mặc định `Normal` |
| `laborFee` | `decimal` | Không | Phí gia công (mặc định `0`) |
| `stoneFee` | `decimal` | Không | Phí đá (mặc định `0`) |

> `priceTableUnitPriceLak` **không nhận từ client** — backend tự snapshot từ `PriceConfig` hiện tại.

#### Response — 201 Created

Trả về `GUID` của giao dịch vừa tạo.

```json
"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
```

Header `Location: /api/transactions/{id}`

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `CONFIG_PRICE_NOT_FOUND` | Chưa có bảng giá hiện hành |
| `404` | `PRODUCT_NOT_FOUND` | Sản phẩm không tồn tại |
| `422` | `INVENTORY_INSUFFICIENT_STOCK` | Không đủ tồn kho |
| `422` | `VALIDATION_FAILED` | Dữ liệu đầu vào không hợp lệ |

---

### 2. Chi tiết giao dịch

```
GET /api/transactions/{id}
```

**Quyền**: Mọi user đã đăng nhập

#### Response — 200 OK

Trả về `TransactionListItemDto` đầy đủ (bao gồm `items[]`).

#### Response — Lỗi

| HTTP | `errorCode` | Nguyên nhân |
|---|---|---|
| `404` | `TRANSACTION_NOT_FOUND` | Không tìm thấy giao dịch |

---

### 3. Danh sách giao dịch

```
GET /api/transactions
```

**Quyền**: Mọi user đã đăng nhập

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Không | Lọc theo chi nhánh |
| `status` | `TransactionStatus` | Không | Lọc theo trạng thái |
| `type` | `TransactionType` | Không | Lọc theo loại giao dịch |
| `from` | `DateTime` | Không | Từ ngày (ISO 8601) |
| `to` | `DateTime` | Không | Đến ngày (ISO 8601) |
| `invoiceCode` | `string` | Không | Tìm theo mã hóa đơn chính xác |
| `q` | `string` | Không | Tìm kiếm tổng quát (tên KH, mã đơn, ...) |
| `page` | `int` | Không | Trang hiện tại (phân trang) |
| `pageSize` | `int` | Không | Số item mỗi trang (mặc định `20`) |
| `limit` | `int` | Không | Giới hạn số item (dùng thay cho phân trang) |

#### Response — 200 OK (không phân trang)

Khi truyền `limit` mà không truyền `page`:

```json
[ /* TransactionListItemDto[] */ ]
```

#### Response — 200 OK (có phân trang)

Khi truyền `page`:

```json
{
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "data": [ /* TransactionListItemDto[] */ ]
}
```

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Response |
|---|---|---|---|
| `POST` | `/api/transactions` | Tạo giao dịch mới | `201` GUID |
| `GET` | `/api/transactions/{id}` | Chi tiết giao dịch | `200` TransactionListItemDto |
| `GET` | `/api/transactions` | Danh sách / tìm kiếm | `200` mảng hoặc paged |

---

## Ghi chú nghiệp vụ

- Giao dịch đã **`COMPLETED`** không được sửa hoặc xóa — tạo giao dịch đảo phiếu mới với `referenceInvoiceCode`.
- **Snapshot giá**: `priceTableUnitPriceLak` được lấy từ `PriceConfig` tại thời điểm tạo đơn, lưu vĩnh viễn vào `transaction_items` — không tính lại khi giá thay đổi.
- **Phân quyền mềm**: Cashier chỉ xem được GD của mình; Manager/Admin xem tất cả — kiểm tra trong handler dựa trên `role_code` claim.
