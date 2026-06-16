# API Sales Shifts — Ca Bán Hàng

> Base URL: `https://<host>/api/sales-shifts`  
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`  
> Content-Type: `application/json`

---

## Tổng quan

> **Quy tắc nghiệp vụ:** Mọi giao dịch POS (`POST /api/transactions`) đều phải được tạo trong một ca đang mở. Nếu không có ca mở, server trả `SALES_SHIFT_NOT_OPEN (422)`.

**Phân biệt Ca Bán Hàng & Phiên Quỹ:**

| | Ca Bán Hàng (`SalesShift`) | Phiên Quỹ (`CashSession`) |
|---|---|---|
| Gắn với | Nhân viên + Quầy | Chi nhánh |
| Ai mở | Cashier | ThuQuy |
| Mục đích | Kiểm soát giao dịch POS trong ca | Đối chiếu quỹ tiền mặt cuối ngày |
| Độc lập? | ✅ Hai thực thể hoàn toàn độc lập | ✅ |

**Mã ca:** Định dạng `CA-YYYYMMDD-NNNNNN` (ví dụ: `CA-20260616-000001`), tự động sinh tăng dần.

**Ràng buộc:**
- Mỗi nhân viên chỉ có tối đa **1 ca đang mở** tại một thời điểm
- Mỗi quầy chỉ có tối đa **1 ca đang mở** tại một thời điểm
- Nhân viên phải được phân công quầy (`CounterId`) trước khi mở ca

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/sales-shifts/active` | Đăng nhập | Ca đang mở của tôi |
| `POST` | `/api/sales-shifts/open` | Đăng nhập | Mở ca mới |
| `POST` | `/api/sales-shifts/{id}/close` | Đăng nhập | Chốt ca |
| `GET` | `/api/sales-shifts` | `SALES_SHIFT_MANAGE` | Danh sách ca (phân trang) |
| `GET` | `/api/sales-shifts/{id}` | `SALES_SHIFT_MANAGE` | Chi tiết ca |
| `GET` | `/api/sales-shifts/{id}/transactions` | `SALES_SHIFT_MANAGE` | Giao dịch trong ca |

---

## `GET /api/sales-shifts/active`

Lấy ca đang mở của nhân viên hiện tại (JWT). Dùng để kiểm tra trạng thái trước khi tạo giao dịch.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Response `200 OK` — khi có ca mở:**

```json
{
  "hasOpenShift": true,
  "shiftId": "d3a1bc52-9e7f-4c2a-b840-1234567890ab",
  "shiftCode": "CA-20260616-000001",
  "openingCashLak": 5000000,
  "openedAt": "2026-06-16T08:00:00Z",
  "counterName": "Quầy 1 — Bán vàng"
}
```

**Response `200 OK` — khi chưa có ca:**

```json
{
  "hasOpenShift": false,
  "shiftId": null,
  "shiftCode": null,
  "openingCashLak": null,
  "openedAt": null,
  "counterName": null
}
```

---

## `POST /api/sales-shifts/open`

Mở ca bán hàng mới.

**Yêu cầu:** Đăng nhập. Nhân viên phải được phân công quầy (`CounterId` trong JWT).

**Request body:**

```json
{
  "openingCashLak": 5000000,
  "openedAt": "2026-06-16T08:00:00Z",
  "note": "Ca sáng, nhận bàn giao từ ca trước"
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `openingCashLak` | ✅ | decimal | Tiền mặt đầu ca (LAK) |
| `openedAt` | ✅ | DateTime | Thời điểm bắt đầu ca (do nhân viên chọn từ modal) |
| `note` | ❌ | string? | Ghi chú (tối đa 500 ký tự) |

**Response `201 Created`:** [`SalesShiftDetailDto`](#schema-salesshiftdetaildto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `COUNTER_NOT_ASSIGNED` | 400 | Nhân viên chưa được phân công quầy |
| `SALES_SHIFT_ALREADY_OPEN_FOR_USER` | 422 | Nhân viên đang có ca mở khác |
| `SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER` | 422 | Quầy đang có ca mở (nhân viên khác) |

---

## `POST /api/sales-shifts/{id}/close`

Đóng (chốt) ca và ghi nhận tiền mặt cuối ca.

**Yêu cầu:** Đăng nhập.

**Path param:** `id` (Guid) — UUID của ca cần đóng.

**Request body:**

```json
{
  "closingCashLak": 4850000
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `closingCashLak` | ✅ | decimal | Tiền mặt thực tế đếm được cuối ca (LAK) |

**Response `200 OK`:** [`SalesShiftDetailDto`](#schema-salesshiftdetaildto) với `summary` đầy đủ số liệu ca.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca |
| `SALES_SHIFT_ALREADY_CLOSED` | 422 | Ca đã được đóng trước đó |

---

## `GET /api/sales-shifts`

Danh sách ca bán hàng có phân trang và bộ lọc.

**Yêu cầu policy:** `SALES_SHIFT_MANAGE` (Manager, SystemAdmin).

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `branchId` | Guid? | Lọc theo chi nhánh |
| `counterId` | Guid? | Lọc theo quầy |
| `userId` | Guid? | Lọc theo nhân viên |
| `status` | string? | `Open` hoặc `Closed` |
| `from` | DateTime? | Từ thời điểm mở ca |
| `to` | DateTime? | Đến thời điểm mở ca |
| `q` | string? | Tìm theo tên/mã nhân viên hoặc mã ca |
| `page` | int | Mặc định `1` |
| `pageSize` | int | Mặc định `20`, tối đa `100` |

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "d3a1bc52-9e7f-4c2a-b840-1234567890ab",
      "shiftCode": "CA-20260616-000001",
      "userId": "aaa11111-0000-0000-0000-000000000001",
      "userFullName": "Thu Ngân Demo",
      "userEmployeeCode": "NV001",
      "userRoleName": "Cashier",
      "branchId": "bbb22222-0000-0000-0000-000000000001",
      "branchName": "Vientiane Main",
      "counterId": "ccc33333-0000-0000-0000-000000000001",
      "counterName": "Quầy 1 — Bán vàng",
      "status": "Open",
      "openingCashLak": 5000000,
      "closingCashLak": null,
      "openedAt": "2026-06-16T08:00:00Z",
      "closedAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

| Field | Mô tả |
|---|---|
| `status` | `"Open"` hoặc `"Closed"` |
| `closingCashLak` | `null` khi ca chưa đóng |
| `closedAt` | `null` khi ca chưa đóng |

---

## `GET /api/sales-shifts/{id}`

Chi tiết một ca bán hàng kèm tổng hợp hoạt động trong ca.

**Yêu cầu policy:** `SALES_SHIFT_MANAGE` (Manager, SystemAdmin).

**Path param:** `id` (Guid) — UUID của ca.

**Response `200 OK`:** [`SalesShiftDetailDto`](#schema-salesshiftdetaildto)

**Lỗi:** `SALES_SHIFT_NOT_FOUND (404)`

---

## `GET /api/sales-shifts/{id}/transactions`

Danh sách giao dịch trong ca (gộp `Transaction` + `TradeTxn`), sắp xếp theo thời gian giảm dần, phân trang.

**Yêu cầu policy:** `SALES_SHIFT_MANAGE` (Manager, SystemAdmin).

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `q` | string? | Tìm theo mã chứng từ hoặc tên khách hàng |
| `page` | int | Mặc định `1` |
| `pageSize` | int | Mặc định `20`, tối đa `100` |

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "fff55555-0000-0000-0000-000000000001",
      "nghiepVu": "Bán hàng",
      "chungTuGoc": "HD-20260616-000001",
      "trangThai": "Completed",
      "soPT_PC": null,
      "thoiGian": "2026-06-16T09:15:00Z",
      "hinhThucTT": "CASH",
      "giaTri": 28500000,
      "doiTuong": "Khách hàng",
      "khachHang": "Nguyễn Thị Lan",
      "quay": "Quầy 1 — Bán vàng"
    },
    {
      "id": "ggg66666-0000-0000-0000-000000000001",
      "nghiepVu": "Đổi hàng",
      "chungTuGoc": "TDH-20260616-000001",
      "trangThai": "Completed",
      "soPT_PC": null,
      "thoiGian": "2026-06-16T10:30:00Z",
      "hinhThucTT": "",
      "giaTri": 50000,
      "doiTuong": null,
      "khachHang": null,
      "quay": ""
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `nghiepVu` | string | `Bán hàng` / `Mua hàng` / `Đổi hàng` / `Đổi thành tiền` / `Thu đổi ngoại tệ` |
| `chungTuGoc` | string | Mã hóa đơn (Transaction) hoặc mã giao dịch (TradeTxn) |
| `trangThai` | string | Trạng thái giao dịch (ví dụ: `Completed`) |
| `soPT_PC` | string? | Số phiếu thu/chi liên quan (nếu có, hiện luôn `null`) |
| `thoiGian` | DateTime | Thời điểm giao dịch |
| `hinhThucTT` | string | `CASH` / `BANK` / `COMBINED` / `""` (trade không có hình thức thanh toán) |
| `giaTri` | decimal | Tổng tiền giao dịch (LAK) |
| `doiTuong` | string? | `"Khách hàng"` hoặc `"Khách lẻ"` (chỉ có ở Transaction) |
| `khachHang` | string? | Tên khách hàng (nếu có) |
| `quay` | string | Tên quầy (chỉ có ở Transaction) |

---

## Schema: `SalesShiftDetailDto`

```json
{
  "id": "d3a1bc52-9e7f-4c2a-b840-1234567890ab",
  "shiftCode": "CA-20260616-000001",
  "userId": "aaa11111-0000-0000-0000-000000000001",
  "userFullName": "Thu Ngân Demo",
  "userEmployeeCode": "NV001",
  "userRoleName": "Cashier",
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "branchName": "Vientiane Main",
  "counterId": "ccc33333-0000-0000-0000-000000000001",
  "counterName": "Quầy 1 — Bán vàng",
  "status": "Open",
  "openingCashLak": 5000000,
  "closingCashLak": null,
  "note": "Ca sáng, nhận bàn giao từ ca trước",
  "openedAt": "2026-06-16T08:00:00Z",
  "closedAt": null,
  "summary": {
    "banHangTotal": 28500000,
    "banHangCash": 28500000,
    "banHangBank": 0,
    "muaHangTotal": 0,
    "muaHangCash": 0,
    "muaHangBank": 0,
    "doiHangTotal": 50000,
    "phieuThuTotal": 0,
    "phieuChiTotal": 0,
    "datHangTotal": 0,
    "baoHanhTotal": 0,
    "netCashMovement": 33500000
  }
}
```

### Giải thích các field `summary`

| Field | Công thức / Nguồn dữ liệu | Mô tả |
|---|---|---|
| `banHangTotal` | `SUM(transactions.totalAmount)` WHERE type IN (SellGold, SellSilver) | Tổng doanh thu bán hàng |
| `banHangCash` | Phần tiền mặt của bán hàng | Tổng tiền mặt thu từ bán hàng |
| `banHangBank` | Phần chuyển khoản của bán hàng | Tổng CK thu từ bán hàng |
| `muaHangTotal` | `SUM(transactions.totalAmount)` WHERE type IN (BuyGold, BuyMoreGold) | Tổng chi mua vào |
| `muaHangCash` | Phần tiền mặt của mua hàng | Tổng tiền mặt chi cho mua hàng |
| `muaHangBank` | Phần chuyển khoản của mua hàng | Tổng CK chi cho mua hàng |
| `doiHangTotal` | `SUM(trade_txns.chenhLech)` WHERE salesShiftId = ca | Tổng chênh lệch từ đổi hàng (TradeTxn) |
| `phieuThuTotal` | `ManualCashEntry` (Direction=IN) trong khoảng thời gian ca, cùng quầy | Tổng phiếu thu thủ công |
| `phieuChiTotal` | `ManualCashEntry` (Direction=OUT) trong khoảng thời gian ca, cùng quầy | Tổng phiếu chi thủ công |
| `datHangTotal` | Placeholder — hiện luôn = `0` | Đặt hàng (chức năng tương lai) |
| `baoHanhTotal` | Placeholder — hiện luôn = `0` | Bảo hành (chức năng tương lai) |
| `netCashMovement` | `openingCashLak + banHangCash − muaHangCash + phieuThuTotal − phieuChiTotal` | Tồn quỹ tiền mặt ước tính cuối ca |

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `SALES_SHIFT_NOT_OPEN` | 422 | Không có ca đang mở khi tạo giao dịch |
| `SALES_SHIFT_ALREADY_OPEN_FOR_USER` | 422 | Nhân viên đã có ca đang mở |
| `SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER` | 422 | Quầy đang có ca mở (nhân viên khác) |
| `SALES_SHIFT_ALREADY_CLOSED` | 422 | Ca đã được đóng trước đó |
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca bán hàng |
| `SALES_SHIFT_COUNTER_MISMATCH` | 422 | Ca thuộc quầy khác với quầy của nhân viên |
| `COUNTER_NOT_ASSIGNED` | 400 | Nhân viên chưa được phân công quầy |

---

## Luồng sử dụng điển hình

```
1. Cashier đăng nhập  → GET  /api/sales-shifts/active
                         → { hasOpenShift: false }

2. Cashier mở ca      → POST /api/sales-shifts/open
                         body: { openingCashLak: 5000000, openedAt: "..." }
                         → 201: SalesShiftDetailDto { shiftCode: "CA-20260616-000001" }

3. Cashier bán hàng   → POST /api/transactions
                         (tự động gắn salesShiftId — không cần truyền từ client)
                         → 201: TransactionDto

4. Cashier bán hàng   → POST /api/transactions ...

5. Cashier đổi hàng   → POST /api/trade
                         (tự động gắn salesShiftId)
                         → 201: TradeTxnDto

6. Cashier chốt ca    → POST /api/sales-shifts/{id}/close
                         body: { closingCashLak: 4850000 }
                         → 200: SalesShiftDetailDto { summary: { ... } }

7. Sau khi đóng ca, tạo GD mới → POST /api/transactions
                         → 422: { errorCode: "SALES_SHIFT_NOT_OPEN" }

8. Manager xem ca     → GET  /api/sales-shifts/{id}
                         → 200: SalesShiftDetailDto (kèm summary)

9. Manager xem GD     → GET  /api/sales-shifts/{id}/transactions
                         → 200: ShiftTransactionPagedDto
```
