# API Sales Shifts — Ca Bán Hàng

> Base URL: `https://<host>/api/sales-shifts`
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`
> Content-Type: `application/json`

---

## Tổng quan

> **Quy tắc nghiệp vụ:** Mọi giao dịch POS (`POST /api/transactions`) và trade (`POST /api/trade`) đều phải được tạo trong một ca đang mở. Nếu không có ca mở, server trả `SALES_SHIFT_NOT_OPEN (422)`. `salesShiftId` được server tự động gắn từ JWT — client không truyền.

**Phân biệt Ca Bán Hàng & Phiên Quỹ:**

| | Ca Bán Hàng (`SalesShift`) | Phiên Quỹ (`CashSession`) |
|---|---|---|
| Gắn với | Nhân viên + Quầy | Chi nhánh |
| Ai mở | Cashier | ThuQuy |
| Mục đích | Kiểm soát giao dịch POS trong ca | Đối chiếu quỹ tiền mặt cuối ngày |
| Độc lập? | ✅ Hai thực thể hoàn toàn độc lập | ✅ |

**Mã ca:** Định dạng `CANNNNNN` — tuần tự toàn hệ thống, ví dụ: `CA000001`, `CA000002`.
*(Không mang thông tin ngày — số thứ tự tăng dần từ khi hệ thống khởi chạy)*

**Ràng buộc:**
- Mỗi nhân viên chỉ có tối đa **1 ca đang mở** tại một thời điểm
- Mỗi quầy chỉ có tối đa **1 ca đang mở** tại một thời điểm
- Nhân viên phải được phân công quầy (`CounterId` trong JWT) trước khi mở ca
- Mỗi mã ngoại tệ chỉ được nhập **1 lần** trong một ca (unique index `shiftId + currency`)

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/sales-shifts/active` | Đăng nhập | Ca đang mở của tôi (lightweight) |
| `POST` | `/api/sales-shifts/open` | Đăng nhập | Mở ca mới |
| `POST` | `/api/sales-shifts/{id}/close` | Đăng nhập | Chốt ca |
| `GET` | `/api/sales-shifts` | `SALES_SHIFT_MANAGE` | Danh sách ca (phân trang) |
| `GET` | `/api/sales-shifts/{id}` | `SALES_SHIFT_MANAGE` | Chi tiết ca |
| `GET` | `/api/sales-shifts/{id}/transactions` | `SALES_SHIFT_MANAGE` | Giao dịch trong ca |

---

## `GET /api/sales-shifts/active`

Lấy ca đang mở của nhân viên hiện tại (JWT). Dùng để kiểm tra trạng thái trước khi tạo giao dịch.

**Yêu cầu:** Đăng nhập (bất kỳ role).

> **Lưu ý FE:** Endpoint này trả về thông tin tối giản (không có `currencyBalances`). Nếu cần thông tin đầy đủ gồm số dư ngoại tệ đầu ca, gọi tiếp `GET /api/sales-shifts/{shiftId}`.

**Response `200 OK` — khi có ca mở:**

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

| Field | Kiểu | Mô tả |
|---|---|---|
| `hasOpenShift` | bool | `true` nếu có ca đang mở |
| `shiftId` | Guid? | UUID ca đang mở (dùng cho các API tiếp theo) |
| `shiftCode` | string? | Mã ca (ví dụ: `CA000001`) |
| `openingCashLak` | decimal? | Tiền mặt LAK đầu ca |
| `openedAt` | DateTime? | Thời điểm mở ca (UTC) |
| `counterName` | string? | Tên quầy |

---

## `POST /api/sales-shifts/open`

Mở ca bán hàng mới.

**Yêu cầu:** Đăng nhập. Nhân viên phải được phân công quầy (`CounterId` trong JWT).
`BranchId` và `CounterId` được lấy tự động từ JWT — không truyền trong body.

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
| `openingCashLak` | ✅ | decimal | Tiền mặt đầu ca bằng LAK |
| `foreignCurrencyBalances` | ❌ | array? | Danh sách ngoại tệ tại đầu ca. Bỏ qua nếu không có ngoại tệ |
| `foreignCurrencyBalances[].currency` | ✅ | string | Mã tiền tệ viết hoa: `USD`, `THB`, ... |
| `foreignCurrencyBalances[].openingAmount` | ✅ | decimal | Số lượng ngoại tệ đầu ca (đơn vị: tiền tệ đó, ví dụ 200 USD) |
| `note` | ❌ | string? | Ghi chú (tối đa 500 ký tự) |

> `openedAt` được server tự động gán bằng `DateTime.UtcNow` — không truyền từ client.
> Mỗi mã tiền tệ chỉ được nhập **1 lần** — trùng `currency` trong cùng request sẽ bị từ chối ở DB (unique index `shiftId + currency`).

**Response `201 Created`:** [`SalesShiftDetailDto`](#schema-salesshiftdetaildto)

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `COUNTER_NOT_ASSIGNED` | 400 | Nhân viên chưa được phân công quầy |
| `SALES_SHIFT_ALREADY_OPEN_FOR_USER` | 422 | Nhân viên đang có ca mở khác |
| `SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER` | 422 | Quầy đang có ca mở (nhân viên khác) |

---

## `POST /api/sales-shifts/{id}/close`

Đóng (chốt) ca và ghi nhận số tiền mặt thực tế cuối ca — bao gồm LAK và các ngoại tệ.

**Yêu cầu:** Đăng nhập.

**Path param:** `id` (Guid) — UUID của ca cần đóng.

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
| `foreignCurrencyBalances` | ❌ | array? | Số dư ngoại tệ thực tế cuối ca. Bỏ qua nếu không nhập ngoại tệ lúc mở ca |
| `foreignCurrencyBalances[].currency` | ✅ | string | Mã tiền tệ (phải khớp chính xác với mã đã nhập lúc mở ca, ví dụ: `USD`, `THB`) |
| `foreignCurrencyBalances[].closingAmount` | ✅ | decimal | Số lượng ngoại tệ thực tế cuối ca |

> **Ràng buộc:** `currency` trong `foreignCurrencyBalances` phải khớp với bản ghi đã tồn tại từ lúc mở ca. Nếu truyền mã không tồn tại, server trả `CURRENCY_BALANCE_NOT_FOUND (422)`.
> So sánh tên tiền tệ **case-insensitive** (server tự normalize về uppercase khi lưu).
> Các ngoại tệ đã nhập lúc mở ca nhưng không truyền lúc đóng ca sẽ giữ `closingAmount: null`.

**Response `200 OK`:** [`SalesShiftDetailDto`](#schema-salesshiftdetaildto) với `summary` đầy đủ số liệu ca và `currencyBalances[].closingAmount` được cập nhật.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca |
| `SALES_SHIFT_ALREADY_CLOSED` | 422 | Ca đã được đóng trước đó |
| `CURRENCY_BALANCE_NOT_FOUND` | 422 | `currency` trong `foreignCurrencyBalances` không tồn tại trong ca này |

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
| `status` | string? | `Open` hoặc `Closed` (case-insensitive) |
| `from` | DateTime? | Lọc ca mở từ thời điểm này (theo `openedAt`) |
| `to` | DateTime? | Lọc ca mở đến thời điểm này (theo `openedAt`) |
| `q` | string? | Tìm theo tên nhân viên, mã nhân viên, hoặc mã ca |
| `page` | int | Mặc định `1` |
| `pageSize` | int | Mặc định `20`, tối đa `100` |

**Response `200 OK`:**

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

## `GET /api/sales-shifts/{id}`

Chi tiết một ca bán hàng kèm tổng hợp hoạt động trong ca.

**Yêu cầu policy:** `SALES_SHIFT_MANAGE` (Manager, SystemAdmin).

**Path param:** `id` (Guid) — UUID của ca.

**Response `200 OK`:** [`SalesShiftDetailDto`](#schema-salesshiftdetaildto)

**Lỗi:** `SALES_SHIFT_NOT_FOUND (404)`

---

## `GET /api/sales-shifts/{id}/transactions`

Danh sách giao dịch trong ca — gộp `Transaction` + `TradeTxn`, sắp xếp theo thời gian giảm dần, phân trang.

**Yêu cầu policy:** `SALES_SHIFT_MANAGE` (Manager, SystemAdmin).

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `q` | string? | Tìm theo mã chứng từ (`chungTuGoc`) hoặc tên khách hàng (`khachHang`) |
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
| `id` | Guid | UUID giao dịch (Transaction hoặc TradeTxn) |
| `nghiepVu` | string | Loại nghiệp vụ — xem bảng bên dưới |
| `chungTuGoc` | string | Mã hóa đơn (Transaction) hoặc mã giao dịch (TradeTxn) |
| `trangThai` | string | Trạng thái: `Completed`, `Cancelled`, ... |
| `soPT_PC` | string? | Số phiếu thu/chi liên quan — hiện luôn `null` |
| `thoiGian` | DateTime | Thời điểm giao dịch (UTC) |
| `hinhThucTT` | string | `CASH` / `BANK` / `COMBINED` / `""` (TradeTxn không có hình thức thanh toán) |
| `giaTri` | decimal | Tổng tiền giao dịch (LAK). Với TradeTxn là `|chenhLech|` (giá trị tuyệt đối) |
| `doiTuong` | string? | `"Khách hàng"` hoặc `"Khách lẻ"` — chỉ có ở Transaction |
| `khachHang` | string? | Tên khách hàng (nếu có) — chỉ có ở Transaction |
| `quay` | string | Tên quầy — chỉ có ở Transaction; `""` với TradeTxn |

**Giá trị `nghiepVu` có thể có:**

| Giá trị | Nguồn | Loại giao dịch gốc |
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

## Schema: `SalesShiftDetailDto`

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

### Field `currencyBalances`

| Field | Kiểu | Mô tả |
|---|---|---|
| `currency` | string | Mã ngoại tệ viết hoa (`USD`, `THB`, ...) — server tự normalize |
| `openingAmount` | decimal | Số lượng ngoại tệ đầu ca (đơn vị của tiền tệ đó, ví dụ 200 USD) |
| `closingAmount` | decimal? | Số lượng ngoại tệ cuối ca — `null` khi ca chưa đóng hoặc chưa nhập lúc chốt |

> LAK không xuất hiện trong `currencyBalances` — số tiền LAK được lưu ở `openingCashLak` / `closingCashLak` trực tiếp.

### Giải thích field `summary`

| Field | Công thức / Nguồn | Mô tả |
|---|---|---|
| `banHangTotal` | `SUM(transactions.totalAmount)` WHERE type IN (`SellGold`, `SellSilver`) AND status = Completed | Tổng doanh thu bán hàng |
| `banHangCash` | Phần `CASH` và `COMBINED.cashAmount` của bán hàng | Tổng tiền mặt thu từ bán hàng |
| `banHangBank` | Phần `BANK` và `COMBINED.bankAmount` của bán hàng | Tổng chuyển khoản thu từ bán hàng |
| `muaHangTotal` | `SUM(transactions.totalAmount)` WHERE type IN (`BuyGold`, `BuyMoreGold`) AND status = Completed | Tổng chi mua vào |
| `muaHangCash` | Phần `CASH` và `COMBINED.cashAmount` của mua hàng | Tổng tiền mặt chi mua vào |
| `muaHangBank` | Phần `BANK` và `COMBINED.bankAmount` của mua hàng | Tổng chuyển khoản chi mua vào |
| `doiHangTotal` | `SUM(trade_txns.chenhLech)` WHERE salesShiftId = ca | Tổng chênh lệch từ TradeTxn trong ca |
| `phieuThuTotal` | `ManualCashEntry` (direction=`IN`, source=`Manual`) trong khoảng thời gian ca, cùng quầy | Tổng phiếu thu thủ công |
| `phieuChiTotal` | `ManualCashEntry` (direction=`OUT`, source=`Manual`) trong khoảng thời gian ca, cùng quầy | Tổng phiếu chi thủ công |
| `datHangTotal` | Placeholder — luôn = `0` | Đặt hàng (chức năng tương lai) |
| `baoHanhTotal` | Placeholder — luôn = `0` | Bảo hành (chức năng tương lai) |
| `netCashMovement` | `openingCashLak + banHangCash − muaHangCash + phieuThuTotal − phieuChiTotal` | Tồn quỹ tiền mặt LAK ước tính cuối ca |

> `summary` với ca đang mở (`status = Open`) phản ánh số liệu thực tế tích lũy đến thời điểm gọi API.
> `summary` với ca đã đóng (`status = Closed`) là số liệu tại thời điểm `closedAt`.

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|---|---|---|
| `SALES_SHIFT_NOT_OPEN` | 422 | Không có ca đang mở khi tạo giao dịch / trade |
| `SALES_SHIFT_ALREADY_OPEN_FOR_USER` | 422 | Nhân viên đã có ca đang mở |
| `SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER` | 422 | Quầy đang có ca mở (nhân viên khác) |
| `SALES_SHIFT_ALREADY_CLOSED` | 422 | Ca đã được đóng trước đó |
| `SALES_SHIFT_NOT_FOUND` | 404 | Không tìm thấy ca bán hàng |
| `COUNTER_NOT_ASSIGNED` | 400 | Nhân viên chưa được phân công quầy |
| `CURRENCY_BALANCE_NOT_FOUND` | 422 | `currency` lúc đóng ca không tồn tại trong ca này |

---

## Luồng sử dụng điển hình

```
1. Cashier đăng nhập   → GET  /api/sales-shifts/active
                          → { hasOpenShift: false }

2. Cashier mở ca       → POST /api/sales-shifts/open
                          body: {
                            openingCashLak: 5000000,
                            foreignCurrencyBalances: [
                              { currency: "USD", openingAmount: 200 },
                              { currency: "THB", openingAmount: 5000 }
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

3. Cashier kiểm tra    → GET  /api/sales-shifts/active
                          → { hasOpenShift: true, shiftId: "...", shiftCode: "CA000001", ... }
                          (không có currencyBalances — gọi GET /{id} nếu cần)

4. Cashier bán hàng    → POST /api/transactions
                          (server tự gắn salesShiftId từ JWT — không truyền từ client)
                          → 201: TransactionDto

5. Cashier đổi hàng    → POST /api/trade
                          (server tự gắn salesShiftId từ JWT)
                          → 201: TradeTxnDto

6. Cashier chốt ca     → POST /api/sales-shifts/{id}/close
                          body: {
                            closingCashLak: 4850000,
                            foreignCurrencyBalances: [
                              { currency: "USD", closingAmount: 180 },
                              { currency: "THB", closingAmount: 4800 }
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
                              summary: { banHangTotal: ..., netCashMovement: ... }
                            }

7. Sau khi đóng ca,
   tạo giao dịch mới   → POST /api/transactions
                          → 422: { errorCode: "SALES_SHIFT_NOT_OPEN" }

8. Manager xem ca      → GET  /api/sales-shifts/{id}
                          → 200: SalesShiftDetailDto (kèm summary đầy đủ)

9. Manager xem GD      → GET  /api/sales-shifts/{id}/transactions?page=1&pageSize=20
                          → 200: ShiftTransactionPagedDto
```