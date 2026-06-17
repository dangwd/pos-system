# API Sales Shifts — Ca Bán Hàng

> Base URL: `https://<host>/api/sales-shifts`
> Xác thực: **JWT Bearer Token** — header `Authorization: Bearer <accessToken>`
> Content-Type: `application/json`

---

## Tổng quan

> **Quy tắc nghiệp vụ:** Mọi giao dịch POS (`POST /api/transactions`) và trade (`POST /api/trade`) đều phải được tạo trong một ca đang mở. Nếu không có ca mở, server trả `SALES_SHIFT_NOT_OPEN (422)`.
> `salesShiftId` được server tự động gắn từ JWT — client **không** truyền field này.

**Phân biệt Ca Bán Hàng & Phiên Quỹ:**

| Tiêu chí | Ca Bán Hàng (`SalesShift`) | Phiên Quỹ (`CashSession`) |
|---|---|---|
| Gắn với | Nhân viên + Quầy | Chi nhánh |
| Ai mở | Cashier | ThuQuy |
| Mục đích | Kiểm soát giao dịch POS trong ca | Đối chiếu quỹ tiền mặt cuối ngày |
| Độc lập | ✅ Hai thực thể hoàn toàn độc lập | ✅ |

**Mã ca:** Định dạng `CANNNNNN` — tuần tự toàn hệ thống (ví dụ: `CA000001`, `CA000002`). Không mang thông tin ngày.

**Ràng buộc:**

- Mỗi nhân viên chỉ có tối đa **1 ca đang mở** tại một thời điểm
- Mỗi quầy chỉ có tối đa **1 ca đang mở** tại một thời điểm
- Nhân viên phải được phân công quầy (`CounterId` trong JWT) trước khi mở ca
- Mỗi mã ngoại tệ chỉ được nhập **1 lần** trong một ca (unique index `shiftId + currency`)

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/sales-shifts/active` | Đăng nhập | Ca đang mở của tôi |
| `POST` | `/api/sales-shifts/open` | Đăng nhập | Mở ca mới |
| `POST` | `/api/sales-shifts/{id}/close` | Đăng nhập | Chốt ca |
| `GET` | `/api/sales-shifts` | `SALES_SHIFT_MANAGE` | Danh sách ca (phân trang) |
| `GET` | `/api/sales-shifts/{id}` | Chủ ca hoặc `SALES_SHIFT_MANAGE` | Chi tiết ca |
| `GET` | `/api/sales-shifts/{id}/transactions` | Chủ ca hoặc `SALES_SHIFT_MANAGE` | Giao dịch trong ca |

---

## GET /api/sales-shifts/active

Lấy ca đang mở của nhân viên hiện tại (JWT). Dùng để kiểm tra trạng thái trước khi tạo giao dịch.

**Yêu cầu:** Đăng nhập (bất kỳ role).

> **Lưu ý FE:** Endpoint này trả về thông tin tối giản — **không có** `currencyBalances`. Nếu cần số dư ngoại tệ đầu ca, gọi thêm `GET /api/sales-shifts/{shiftId}`.

**Response 200 — khi có ca mở:**

```json
{
  "hasOpenShift": true,
  "shiftId": "d3a1bc52-9e7f-4c2a-b840-1234567890ab",
  "shiftCode": "CA000001",
  "openingCashLak": 5000000,
  "openedAt": "2026-06-16T08:00:00Z",
  "counterName": "Quầy 1 — Bán vàng"
}
```

**Response 200 — khi chưa có ca:**

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

| Field | Kiểu | Mô tả |
|---|---|---|
| `hasOpenShift` | bool | `true` nếu đang có ca mở |
| `shiftId` | Guid? | UUID ca đang mở — dùng cho các API tiếp theo |
| `shiftCode` | string? | Mã ca, ví dụ `CA000001` |
| `openingCashLak` | decimal? | Tiền mặt LAK đầu ca |
| `openedAt` | DateTime? | Thời điểm mở ca (UTC) |
| `counterName` | string? | Tên quầy |

---

## POST /api/sales-shifts/open

Mở ca bán hàng mới. `BranchId` và `CounterId` được lấy tự động từ JWT — không truyền trong body.

**Yêu cầu:** Đăng nhập. Nhân viên phải được phân công quầy (`CounterId` trong JWT).

**Request body:**

```json
{
  "openingCashLak": 5000000,
  "foreignCurrencyBalances": [
    { "currency": "USD", "openingAmount": 200 },
    { "currency": "THB", "openingAmount": 5000 }
  ],
  "note": "Ca sáng, nhận bàn giao từ ca trước"
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `openingCashLak` | ✅ | decimal | Tiền mặt LAK đầu ca |
| `foreignCurrencyBalances` | ❌ | array? | Danh sách ngoại tệ tại đầu ca. Bỏ qua nếu không có ngoại tệ |
| `foreignCurrencyBalances[].currency` | ✅ | string | Mã tiền tệ viết hoa: `USD`, `THB`, ... |
| `foreignCurrencyBalances[].openingAmount` | ✅ | decimal | Số lượng ngoại tệ đầu ca (đơn vị tiền tệ đó, ví dụ 200 USD) |
| `note` | ❌ | string? | Ghi chú (tối đa 500 ký tự) |

> `openedAt` được server tự gán = `DateTime.UtcNow` — không truyền từ client.
> Trùng `currency` trong cùng request sẽ bị từ chối ở DB (unique index `shiftId + currency`).

**Response 201:** [SalesShiftDetailDto](#schema-salesshiftdetaildto)

**Lỗi:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `COUNTER_NOT_ASSIGNED` | 400 | Nhân viên chưa được phân công quầy |
| `SALES_SHIFT_ALREADY_OPEN_FOR_USER` | 422 | Nhân viên đang có ca mở khác |
| `SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER` | 422 | Quầy đang có ca mở (nhân viên khác) |

---

## POST /api/sales-shifts/{id}/close

Đóng (chốt) ca và ghi nhận tiền mặt thực tế cuối ca — bao gồm LAK và các ngoại tệ.

**Yêu cầu:** Đăng nhập.

**Path param:** `id` (Guid) — UUID ca cần đóng.

**Request body:**

```json
{
  "closingCashLak": 4850000,
  "foreignCurrencyBalances": [
    { "currency": "USD", "closingAmount": 180 },
    { "currency": "THB", "closingAmount": 4800 }
  ]
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|---|---|---|---|
| `closingCashLak` | ✅ | decimal | Tiền mặt LAK thực tế đếm được cuối ca |
| `foreignCurrencyBalances` | ❌ | array? | Số dư ngoại tệ thực tế cuối ca |
| `foreignCurrencyBalances[].currency` | ✅ | string | Mã tiền tệ (case-insensitive). Có thể là currency đã có từ đầu ca **hoặc currency mới phát sinh trong ca** |
| `foreignCurrencyBalances[].closingAmount` | ✅ | decimal | Số lượng ngoại tệ thực tế cuối ca |

> **Currency mới phát sinh trong ca** (ví dụ: khách mang CNY không nằm trong danh sách mở ca): truyền bình thường — server tự thêm với `openingAmount = 0`.
> Ngoại tệ đã nhập lúc mở ca nhưng không truyền lúc đóng ca sẽ giữ `closingAmount: null`.

**Response 200:** [SalesShiftDetailDto](#schema-salesshiftdetaildto) với `summary` đầy đủ và `currencyBalances[].closingAmount` đã cập nhật.

**Lỗi:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca |
| `SALES_SHIFT_ALREADY_CLOSED` | 422 | Ca đã được đóng trước đó |

---

## GET /api/sales-shifts

Danh sách ca bán hàng có phân trang và bộ lọc.

**Yêu cầu policy:** `SALES_SHIFT_MANAGE` (Manager, SystemAdmin).

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `branchId` | Guid? | Lọc theo chi nhánh |
| `counterId` | Guid? | Lọc theo quầy |
| `userId` | Guid? | Lọc theo nhân viên |
| `status` | string? | `Open` hoặc `Closed` (case-insensitive) |
| `from` | DateTime? | Lọc ca mở từ thời điểm này (theo `openedAt`) |
| `to` | DateTime? | Lọc ca mở đến thời điểm này (theo `openedAt`) |
| `q` | string? | Tìm theo tên nhân viên, mã nhân viên, hoặc mã ca |
| `page` | int | Mặc định `1` |
| `pageSize` | int | Mặc định `20`, tối đa `100` |

**Response 200:**

```json
{
  "items": [
    {
      "id": "d3a1bc52-9e7f-4c2a-b840-1234567890ab",
      "shiftCode": "CA000001",
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

> List item **không** có `currencyBalances` và `summary`. Gọi `GET /api/sales-shifts/{id}` để lấy chi tiết đầy đủ.

| Field | Mô tả |
|---|---|
| `status` | `"Open"` hoặc `"Closed"` |
| `closingCashLak` | `null` khi ca chưa đóng |
| `closedAt` | `null` khi ca chưa đóng |

---

## GET /api/sales-shifts/{id}

Chi tiết một ca bán hàng kèm tổng hợp hoạt động trong ca.

**Yêu cầu:** Đăng nhập. Chỉ **chủ ca** (người mở ca) hoặc role có `SALES_SHIFT_MANAGE` mới xem được. Gọi với ca của người khác mà không có quyền → `AUTH_FORBIDDEN (403)`.

**Path param:** `id` (Guid) — UUID ca.

**Response 200:** [SalesShiftDetailDto](#schema-salesshiftdetaildto)

**Lỗi:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca |
| `AUTH_FORBIDDEN` | 403 | Không phải chủ ca và không có quyền SALES_SHIFT_MANAGE |

---

## GET /api/sales-shifts/{id}/transactions

Danh sách giao dịch trong ca — gộp `Transaction` (bán, mua, đổi ngoại tệ) và `TradeTxn` (thu đổi vàng cũ), sắp xếp theo thời gian giảm dần, có phân trang.

**Yêu cầu:** Đăng nhập. Chỉ **chủ ca** hoặc role có `SALES_SHIFT_MANAGE` mới xem được.

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `q` | string? | Tìm theo `chungTuGoc` (mã chứng từ) hoặc `khachHang` (tên khách hàng) |
| `page` | int | Mặc định `1` |
| `pageSize` | int | Mặc định `20`, tối đa `100` |

**Response 200:**

```json
{
  "items": [
    {
      "id": "fff55555-0000-0000-0000-000000000001",
      "nghiepVu": "Bán hàng",
      "chungTuGoc": "BV-20260616-000001",
      "trangThai": "Completed",
      "soPT_PC": null,
      "thoiGian": "2026-06-16T09:15:00Z",
      "hinhThucTT": "COMBINED",
      "giaTri": 28500000,
      "cashAmount": 20000000,
      "bankAmount": 8500000,
      "doiTuong": "Khách hàng",
      "khachHang": "Nguyễn Thị Lan",
      "quay": "Quầy 1 — Bán vàng",
      "sourceCurrency": null,
      "foreignAmount": null,
      "targetCurrency": null,
      "targetAmount": null,
      "chenhLech": null,
      "itemCuName": null,
      "itemMoiName": null
    },
    {
      "id": "hhh77777-0000-0000-0000-000000000001",
      "nghiepVu": "Thu đổi ngoại tệ",
      "chungTuGoc": "NT-20260616-000001",
      "trangThai": "Completed",
      "soPT_PC": null,
      "thoiGian": "2026-06-16T10:00:00Z",
      "hinhThucTT": "CASH",
      "giaTri": 1800000,
      "cashAmount": null,
      "bankAmount": null,
      "doiTuong": "Khách lẻ",
      "khachHang": null,
      "quay": "Quầy 2 — Ngoại tệ",
      "sourceCurrency": "USD",
      "foreignAmount": 100,
      "targetCurrency": "LAK",
      "targetAmount": 1800000,
      "chenhLech": null,
      "itemCuName": null,
      "itemMoiName": null
    },
    {
      "id": "ggg66666-0000-0000-0000-000000000001",
      "nghiepVu": "Đổi hàng",
      "chungTuGoc": "DH-20260616-ABCD1234",
      "trangThai": "Completed",
      "soPT_PC": null,
      "thoiGian": "2026-06-16T10:30:00Z",
      "hinhThucTT": "",
      "giaTri": 50000,
      "cashAmount": null,
      "bankAmount": null,
      "doiTuong": null,
      "khachHang": null,
      "quay": "",
      "sourceCurrency": null,
      "foreignAmount": null,
      "targetCurrency": null,
      "targetAmount": null,
      "chenhLech": 50000,
      "itemCuName": "Nhẫn vàng 18K",
      "itemMoiName": "Nhẫn vàng 24K"
    }
  ],
  "total": 3,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

### Mô tả field

**Field chung (có ở tất cả loại):**

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | Guid | UUID giao dịch |
| `nghiepVu` | string | Loại nghiệp vụ — xem bảng mapping bên dưới |
| `chungTuGoc` | string | Mã hóa đơn (Transaction) hoặc mã TradeTxn |
| `trangThai` | string | `Completed` hoặc `Cancelled` |
| `soPT_PC` | string? | Số phiếu thu/chi liên quan — hiện luôn `null` |
| `thoiGian` | DateTime | Thời điểm giao dịch (UTC) |
| `hinhThucTT` | string | `CASH` / `BANK` / `COMBINED` / `""` (TradeTxn không có) |
| `giaTri` | decimal | Tổng tiền (Transaction) hoặc giá trị tuyệt đối `|chenhLech|` (TradeTxn) — luôn dương |
| `cashAmount` | decimal? | Tiền mặt LAK — có giá trị khi `hinhThucTT = COMBINED`; `null` với TradeTxn |
| `bankAmount` | decimal? | Chuyển khoản LAK — có giá trị khi `hinhThucTT = COMBINED`; `null` với TradeTxn |
| `doiTuong` | string? | `"Khách hàng"` hoặc `"Khách lẻ"` (Transaction); `"Khách hàng"` hoặc `null` (TradeTxn) |
| `khachHang` | string? | Tên khách hàng (nếu có) |
| `quay` | string | Tên quầy (Transaction); `""` với TradeTxn |

**Field đặc thù theo loại (các loại khác nhận `null`):**

| Field | Nghiệp vụ | Kiểu | Mô tả |
|---|---|---|---|
| `sourceCurrency` | Thu đổi ngoại tệ | string? | Loại tiền khách đưa, ví dụ `"USD"` |
| `foreignAmount` | Thu đổi ngoại tệ | decimal? | Số lượng ngoại tệ khách đưa |
| `targetCurrency` | Thu đổi ngoại tệ | string? | Loại tiền trả lại khách, thường `"LAK"` |
| `targetAmount` | Thu đổi ngoại tệ | decimal? | Số tiền trả lại khách |
| `chenhLech` | TradeTxn | decimal? | Có dấu: `> 0` khách trả thêm; `< 0` cửa hàng hoàn tiền |
| `itemCuName` | TradeTxn | string? | Tên sản phẩm cũ khách mang đến |
| `itemMoiName` | TradeTxn | string? | Tên sản phẩm mới — `null` nếu nghiệp vụ là `Đổi thành tiền` |

> `giaTri` luôn dương để hiển thị tổng. Với TradeTxn, dùng `chenhLech` (có dấu) để phân biệt hướng thanh toán.

### Mapping `nghiepVu`

| `nghiepVu` | Nguồn | Loại giao dịch gốc |
|---|---|---|
| `Bán hàng` | Transaction | `SellGold`, `SellSilver` |
| `Mua hàng` | Transaction | `BuyGold`, `BuyMoreGold` |
| `Đổi hàng` | Transaction | `ExchangeGold`, `ExchangeFree` |
| `Đổi thành tiền` | Transaction | `ExchangeToMoney` |
| `Thu đổi ngoại tệ` | Transaction | `ExchangeCurrency` |
| `Mua thêm` | TradeTxn | `MuaThem` |
| `Đổi hàng` | TradeTxn | `DoiHang` |
| `Đổi miễn phí` | TradeTxn | `DoiMienPhi` |
| `Đổi thành tiền` | TradeTxn | `DoiThanhTien` |

---

## Schema: SalesShiftDetailDto

Trả về bởi `POST /open`, `POST /{id}/close`, `GET /{id}`.

```json
{
  "id": "d3a1bc52-9e7f-4c2a-b840-1234567890ab",
  "shiftCode": "CA000001",
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
  "currencyBalances": [
    { "currency": "USD", "openingAmount": 200, "closingAmount": null },
    { "currency": "THB", "openingAmount": 5000, "closingAmount": null }
  ],
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

### `currencyBalances`

| Field | Kiểu | Mô tả |
|---|---|---|
| `currency` | string | Mã ngoại tệ viết hoa (`USD`, `THB`, ...) — server tự normalize |
| `openingAmount` | decimal | Số lượng ngoại tệ đầu ca |
| `closingAmount` | decimal? | Số lượng ngoại tệ cuối ca — `null` khi ca chưa đóng hoặc chưa nhập lúc chốt |

> LAK không xuất hiện trong `currencyBalances` — được lưu ở `openingCashLak` / `closingCashLak`.

### `summary`

| Field | Nguồn dữ liệu | Mô tả |
|---|---|---|
| `banHangTotal` | SUM transactions WHERE type IN (SellGold, SellSilver) AND status = Completed | Tổng doanh thu bán hàng |
| `banHangCash` | Phần CASH / COMBINED.cashAmount của bán hàng | Tiền mặt thu từ bán hàng |
| `banHangBank` | Phần BANK / COMBINED.bankAmount của bán hàng | Chuyển khoản thu từ bán hàng |
| `muaHangTotal` | SUM transactions WHERE type IN (BuyGold, BuyMoreGold) AND status = Completed | Tổng chi mua vào |
| `muaHangCash` | Phần CASH / COMBINED.cashAmount của mua hàng | Tiền mặt chi mua vào |
| `muaHangBank` | Phần BANK / COMBINED.bankAmount của mua hàng | Chuyển khoản chi mua vào |
| `doiHangTotal` | SUM trade_txns.chenhLech WHERE salesShiftId = ca | Tổng chênh lệch TradeTxn trong ca |
| `phieuThuTotal` | ManualCashEntry direction=IN, source=Manual, cùng quầy, trong khoảng thời gian ca | Tổng phiếu thu thủ công |
| `phieuChiTotal` | ManualCashEntry direction=OUT, source=Manual, cùng quầy, trong khoảng thời gian ca | Tổng phiếu chi thủ công |
| `datHangTotal` | Placeholder — luôn `0` | Đặt hàng (tương lai) |
| `baoHanhTotal` | Placeholder — luôn `0` | Bảo hành (tương lai) |
| `netCashMovement` | `openingCashLak + banHangCash - muaHangCash + phieuThuTotal - phieuChiTotal` | Tồn quỹ LAK ước tính cuối ca |

> Ca đang mở (`Open`): `summary` tính đến thời điểm gọi API.
> Ca đã đóng (`Closed`): `summary` là số liệu tại thời điểm `closedAt`.

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `COUNTER_NOT_ASSIGNED` | 400 | Nhân viên chưa được phân công quầy |
| `SALES_SHIFT_ALREADY_OPEN_FOR_USER` | 422 | Nhân viên đang có ca mở khác |
| `SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER` | 422 | Quầy đang có ca mở (nhân viên khác) |
| `SALES_SHIFT_ALREADY_CLOSED` | 422 | Ca đã được đóng trước đó |
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca bán hàng |
| `SALES_SHIFT_NOT_OPEN` | 422 | Không có ca đang mở khi tạo giao dịch / trade |

---

## Luồng sử dụng điển hình

```
1. Cashier đăng nhập
   GET /api/sales-shifts/active
   → { hasOpenShift: false }

2. Cashier mở ca
   POST /api/sales-shifts/open
   body: {
     "openingCashLak": 5000000,
     "foreignCurrencyBalances": [
       { "currency": "USD", "openingAmount": 200 },
       { "currency": "THB", "openingAmount": 5000 }
     ]
   }
   → 201: SalesShiftDetailDto {
       shiftCode: "CA000001",
       openedAt: "<server UtcNow>",
       currencyBalances: [
         { currency: "USD", openingAmount: 200, closingAmount: null },
         { currency: "THB", openingAmount: 5000, closingAmount: null }
       ]
     }

3. Cashier kiểm tra ca hiện tại
   GET /api/sales-shifts/active
   → { hasOpenShift: true, shiftId: "...", shiftCode: "CA000001", ... }
   (không có currencyBalances — gọi GET /{id} nếu cần)

4. Cashier bán hàng
   POST /api/transactions
   (server tự gắn salesShiftId từ JWT — client không truyền)
   → 201: TransactionDto

5. Cashier thu đổi vàng cũ
   POST /api/trade
   (server tự gắn salesShiftId từ JWT)
   → 201: TradeTxnDto

6. Cashier đổi ngoại tệ
   POST /api/transactions  (type: ExchangeCurrency)
   → 201: TransactionDto

7. Cashier chốt ca
   POST /api/sales-shifts/{id}/close
   body: {
     "closingCashLak": 4850000,
     "foreignCurrencyBalances": [
       { "currency": "USD", "closingAmount": 180 },
       { "currency": "THB", "closingAmount": 4800 }
     ]
   }
   → 200: SalesShiftDetailDto {
       status: "Closed",
       closingCashLak: 4850000,
       closedAt: "<server UtcNow>",
       currencyBalances: [
         { currency: "USD", openingAmount: 200, closingAmount: 180 },
         { currency: "THB", openingAmount: 5000, closingAmount: 4800 }
       ],
       summary: { banHangTotal: ..., muaHangTotal: ..., netCashMovement: ... }
     }

8. Tạo giao dịch sau khi đã đóng ca
   POST /api/transactions
   → 422: { errorCode: "SALES_SHIFT_NOT_OPEN" }

9. Manager xem chi tiết ca
   GET /api/sales-shifts/{id}
   → 200: SalesShiftDetailDto (kèm summary đầy đủ)

10. Manager xem danh sách giao dịch trong ca
    GET /api/sales-shifts/{id}/transactions?page=1&pageSize=20
    → 200: ShiftTransactionPagedDto
```
