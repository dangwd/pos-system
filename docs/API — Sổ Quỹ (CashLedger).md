# API Sổ Quỹ — Cash Ledger

> Base URL: `https://<host>/api/cash-ledger`
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`
> Required policy: `CASH_LEDGER_MANAGE` (ThuQuy, Manager, SystemAdmin)
> Content-Type: `application/json`

---

## Tổng quan

Module Sổ Quỹ quản lý toàn bộ dòng tiền mặt của chi nhánh/quầy. Bao gồm 4 nhóm chức năng chính:

| Nhóm                                 | Mục đích                                                  |
| ------------------------------------ | --------------------------------------------------------- |
| **Phiên quỹ** (`/session`)           | Mở / chốt phiên làm việc, ghi nhận số dư đầu cuối ngày    |
| **Hoạt động** (`/activities`)        | Nhật ký thu/chi toàn bộ (tự động từ POS + phiếu thủ công) |
| **Phiếu thu/chi** (`/vouchers`)      | Lập và tra cứu phiếu PTTT / PCTT có mã lý do              |
| **Bảng kê đếm tiền** (`/cash-count`) | Kiểm đếm mệnh giá tiền mặt cuối kỳ                        |

**Quy tắc phân quyền dữ liệu (Data Scope):**

| Role                | Phạm vi xem                                        |
| ------------------- | -------------------------------------------------- |
| `Cashier`           | Chỉ chi nhánh + quầy của chính mình (lấy từ JWT)   |
| `ThuQuy`, `Manager` | Toàn bộ chi nhánh mình thuộc (không giới hạn quầy) |
| `SystemAdmin`       | Toàn bộ (truyền `branchId` + `counterId` tuỳ ý)    |

> Server tự áp dụng data scope — client không cần ẩn/lộ param theo role.

**Phân biệt Phiên Quỹ & Ca Bán Hàng:**

|          | Phiên Quỹ (`CashSession`)         | Ca Bán Hàng (`SalesShift`) |
| -------- | --------------------------------- | -------------------------- |
| Gắn với  | Chi nhánh / Quầy                  | Nhân viên + Quầy           |
| Ai mở    | ThuQuy                            | Cashier                    |
| Mục đích | Đối chiếu quỹ tiền mặt            | Kiểm soát giao dịch POS    |
| Độc lập? | ✅ Hai thực thể hoàn toàn độc lập | ✅                         |

---

## Danh sách Endpoint

| Method | Endpoint                             | Mô tả                                               |
| ------ | ------------------------------------ | --------------------------------------------------- |
| `GET`  | `/api/cash-ledger/daily`             | Tổng hợp sổ quỹ hàng ngày                           |
| `POST` | `/api/cash-ledger/opening-balance`   | Ghi số dư đầu kỳ (legacy)                           |
| `GET`  | `/api/cash-ledger/session`           | Trạng thái phiên quỹ                                |
| `POST` | `/api/cash-ledger/session/open`      | Mở phiên quỹ                                        |
| `POST` | `/api/cash-ledger/session/close`     | Chốt phiên quỹ                                      |
| `GET`  | `/api/cash-ledger/activities`        | Danh sách hoạt động thu/chi (phân trang, đa filter) |
| `GET`  | `/api/cash-ledger/activities/export` | Xuất Excel danh sách hoạt động                      |
| `GET`  | `/api/cash-ledger/activities/{id}`   | Chi tiết một hoạt động                              |
| `POST` | `/api/cash-ledger/manual-entry`      | Tạo bút toán thủ công (legacy)                      |
| `POST` | `/api/cash-ledger/vouchers`          | Lập phiếu thu / phiếu chi                           |
| `GET`  | `/api/cash-ledger/vouchers`          | Danh sách phiếu thu/chi                             |
| `GET`  | `/api/cash-ledger/vouchers/{id}`     | Chi tiết phiếu thu/chi                              |
| `GET`  | `/api/cash-ledger/voucher-reasons`   | Danh mục lý do thu/chi                              |
| `GET`  | `/api/cash-ledger/cash-count`        | Bảng kê đếm tiền                                    |
| `PUT`  | `/api/cash-ledger/cash-count`        | Lưu bảng kê đếm tiền                                |
| `POST` | `/api/cash-ledger/handover`          | Bàn giao ca cuối ngày (legacy)                      |

---

## `GET /api/cash-ledger/daily`

Tổng hợp sổ quỹ tiền mặt trong ngày: quỹ đầu kỳ, tổng thu, tổng chi, tồn quỹ.

**Query params:**

| Param       | Bắt buộc | Kiểu      | Mô tả                               |
| ----------- | -------- | --------- | ----------------------------------- |
| `branchId`  | ✅       | Guid      | Chi nhánh cần xem                   |
| `counterId` | ❌       | Guid?     | Lọc theo quầy cụ thể                |
| `date`      | ❌       | DateOnly? | Ngày cần xem (mặc định hôm nay UTC) |

**Response `200 OK`:**

```json
{
  "date": "2026-06-16",
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "branchName": "Vientiane Main",
  "openingBalanceId": "aaa11111-...",
  "openingBalanceLak": 5000000,
  "totalInLak": 28500000,
  "totalOutLak": 12000000,
  "closingBalanceLak": 21500000
}
```

| Field               | Kiểu    | Mô tả                                                                   |
| ------------------- | ------- | ----------------------------------------------------------------------- |
| `openingBalanceId`  | Guid?   | ID phiên quỹ đang mở (null nếu chưa mở phiên)                           |
| `openingBalanceLak` | decimal | Quỹ đầu kỳ (LAK): lấy từ phiên quỹ nếu đã mở, fallback cộng dồn lịch sử |
| `totalInLak`        | decimal | Tổng thu trong ngày (LAK)                                               |
| `totalOutLak`       | decimal | Tổng chi trong ngày (LAK)                                               |
| `closingBalanceLak` | decimal | Tồn quỹ = đầu kỳ + thu − chi                                            |

**Lỗi có thể xảy ra:**

| Mã lỗi             | HTTP | Nguyên nhân              |
| ------------------ | ---- | ------------------------ |
| `BRANCH_NOT_FOUND` | 404  | Không tìm thấy chi nhánh |

---

## `POST /api/cash-ledger/opening-balance`

Ghi nhận số dư đầu kỳ (mở phiên quỹ nếu chưa có). Dùng khi chưa có endpoint `/session/open`.

> **Khuyến nghị:** Ưu tiên dùng `POST /session/open` thay cho endpoint này.

**Request body:**

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "counterId": null,
  "date": "2026-06-16",
  "cashAmountLak": 5000000,
  "bankAmountLak": 0
}
```

| Field           | Bắt buộc | Kiểu     | Mô tả                       |
| --------------- | -------- | -------- | --------------------------- |
| `branchId`      | ✅       | Guid     | Chi nhánh                   |
| `counterId`     | ❌       | Guid?    | Quầy (null = cấp chi nhánh) |
| `date`          | ✅       | DateOnly | Ngày mở quỹ                 |
| `cashAmountLak` | ✅       | decimal  | Tiền mặt đầu ca (LAK)       |
| `bankAmountLak` | ✅       | decimal  | Tiền ngân hàng đầu ca (LAK) |

**Response `200 OK`:** `{ "message": "OK" }`

---

## `GET /api/cash-ledger/session`

Trạng thái phiên quỹ của chi nhánh / quầy trong ngày.

**Query params:**

| Param       | Bắt buộc | Kiểu     | Mô tả             |
| ----------- | -------- | -------- | ----------------- |
| `branchId`  | ✅       | Guid     | Chi nhánh         |
| `counterId` | ❌       | Guid?    | Quầy cụ thể       |
| `date`      | ✅       | DateOnly | Ngày cần kiểm tra |

**Response `200 OK`:** [`CashSessionDto`](#schema-cashsessiondto)

Trả `isOpen: false` với tất cả field null nếu chưa có phiên nào trong ngày.

---

## `POST /api/cash-ledger/session/open`

Mở phiên quỹ cho chi nhánh / quầy trong ngày. Mỗi (chi nhánh, quầy, ngày) chỉ được mở **một** phiên.

**Request body:**

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "counterId": "ccc33333-0000-0000-0000-000000000001",
  "date": "2026-06-16",
  "openingCashLak": 5000000,
  "openingBankLak": 0
}
```

| Field            | Bắt buộc | Kiểu     | Mô tả                        |
| ---------------- | -------- | -------- | ---------------------------- |
| `branchId`       | ✅       | Guid     | Chi nhánh                    |
| `counterId`      | ❌       | Guid?    | Quầy (null = cấp chi nhánh)  |
| `date`           | ✅       | DateOnly | Ngày mở phiên                |
| `openingCashLak` | ✅       | decimal  | Tiền mặt đầu ca (LAK)        |
| `openingBankLak` | ✅       | decimal  | Số dư ngân hàng đầu ca (LAK) |

**Response `201 Created`:** [`CashSessionDto`](#schema-cashsessiondto)

**Lỗi có thể xảy ra:**

| Mã lỗi                      | HTTP | Nguyên nhân                   |
| --------------------------- | ---- | ----------------------------- |
| `CASH_SESSION_ALREADY_OPEN` | 422  | Phiên quỹ ngày này đã tồn tại |

---

## `POST /api/cash-ledger/session/close`

Chốt phiên quỹ — lưu kiểm đếm tiền mặt và tính chênh lệch so với số dư kỳ vọng.

**Request body:**

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "counterId": "ccc33333-0000-0000-0000-000000000001",
  "date": "2026-06-16",
  "countedByName": "Nguyễn Thị Lan",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 30 },
    { "currency": "LAK", "denomination": 50000, "quantity": 20 },
    { "currency": "THB", "denomination": 1000, "quantity": 5 }
  ],
  "actualAmountLak": 4850000,
  "expectedAmountLak": 5000000
}
```

| Field                  | Bắt buộc | Kiểu     | Mô tả                                        |
| ---------------------- | -------- | -------- | -------------------------------------------- |
| `branchId`             | ✅       | Guid     | Chi nhánh                                    |
| `counterId`            | ❌       | Guid?    | Quầy                                         |
| `date`                 | ✅       | DateOnly | Ngày chốt                                    |
| `countedByName`        | ✅       | string   | Tên người kiểm đếm                           |
| `items`                | ✅       | array    | Danh sách mệnh giá đếm được                  |
| `items[].currency`     | ✅       | string   | `LAK` / `THB` / `USD`                        |
| `items[].denomination` | ✅       | int      | Mệnh giá                                     |
| `items[].quantity`     | ✅       | int      | Số tờ / đồng                                 |
| `actualAmountLak`      | ✅       | decimal  | Tổng tiền thực tế đếm được (LAK)             |
| `expectedAmountLak`    | ✅       | decimal  | Tổng tiền kỳ vọng = đầu kỳ + thu − chi (LAK) |

**Response `200 OK`:**

```json
{
  "handoverCode": "BGQ-20260616-A3F2B1",
  "closingCashLak": 4850000,
  "closingBankLak": 0,
  "difference": -150000
}
```

| Field          | Mô tả                                                     |
| -------------- | --------------------------------------------------------- |
| `handoverCode` | Mã bàn giao tự động (`BGQ-YYYYMMDD-XXXXXX`)               |
| `difference`   | Chênh lệch = thực tế − kỳ vọng (âm = thiếu, dương = thừa) |

**Lỗi có thể xảy ra:**

| Mã lỗi                   | HTTP | Nguyên nhân                       |
| ------------------------ | ---- | --------------------------------- |
| `CASH_SESSION_NOT_FOUND` | 404  | Không tìm thấy phiên quỹ ngày này |
| `CASH_SESSION_NOT_OPEN`  | 422  | Phiên quỹ đã được chốt trước đó   |

---

## `GET /api/cash-ledger/activities`

Danh sách hoạt động thu/chi sổ quỹ (toàn bộ nguồn: giao dịch POS tự động + phiếu thủ công). Có phân trang.

**Query params:**

| Param       | Kiểu      | Mô tả                                                         |
| ----------- | --------- | ------------------------------------------------------------- |
| `branchId`  | Guid?     | Lọc theo chi nhánh (SystemAdmin có thể bỏ qua để xem tất cả)  |
| `counterId` | Guid?     | Lọc theo quầy cụ thể                                          |
| `fromDate`  | DateOnly? | Từ ngày (mặc định hôm nay)                                    |
| `toDate`    | DateOnly? | Đến ngày (mặc định hôm nay)                                   |
| `keyword`   | string?   | Tìm theo mã phiếu hoặc nội dung mô tả                         |
| `currency`  | string?   | Lọc theo loại tiền: `LAK` / `THB` / `USD`                     |
| `method`    | string?   | Lọc theo phương thức thanh toán: `CASH` / `BANK` / `COMBINED` |
| `page`      | int       | Trang hiện tại (mặc định `1`)                                 |
| `pageSize`  | int       | Số dòng mỗi trang (mặc định `20`)                             |

> Tất cả filter là tuỳ chọn — không truyền thì không áp dụng filter đó.

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "fff55555-0000-0000-0000-000000000001",
      "entryCode": "PTTT000123",
      "timeLabel": "09:15:30 - 16/06/2026",
      "createdByName": "Nguyễn Thị Lan",
      "branchName": "Vientiane Main",
      "methodLabel": "Tiền mặt",
      "direction": "IN",
      "currency": "LAK",
      "method": "CASH"
    },
    {
      "id": "ggg66666-0000-0000-0000-000000000002",
      "entryCode": "PCTT000045",
      "timeLabel": "10:30:00 - 16/06/2026",
      "createdByName": "Trần Văn Nam",
      "branchName": "Vientiane Main",
      "methodLabel": "Chuyển khoản ngân hàng",
      "direction": "OUT",
      "currency": "THB",
      "method": "BANK"
    }
  ],
  "totalCount": 48,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3,
  "openingBalanceLak": 5000000,
  "totalInLak": 28500000,
  "totalOutLak": 12000000,
  "closingBalanceLak": 21500000
}
```

**Chi tiết fields `items[]`:**

| Field           | Kiểu    | Mô tả                                                             |
| --------------- | ------- | ----------------------------------------------------------------- |
| `id`            | Guid    | ID bút toán                                                       |
| `entryCode`     | string  | Mã phiếu: `PTTT…` (thu) hoặc `PCTT…` (chi)                        |
| `timeLabel`     | string  | Thời gian theo múi giờ ICT (`HH:mm:ss - dd/MM/yyyy`)              |
| `createdByName` | string? | Tên người tạo                                                     |
| `branchName`    | string  | Tên chi nhánh                                                     |
| `methodLabel`   | string  | `Tiền mặt` / `Chuyển khoản ngân hàng` / `Tiền mặt & Chuyển khoản` |
| `direction`     | string  | `IN` (thu) hoặc `OUT` (chi)                                       |
| `currency`      | string  | Loại tiền gốc: `LAK` / `THB` / `USD`                              |
| `method`        | string  | Phương thức thanh toán raw: `CASH` / `BANK` / `COMBINED`          |

**Chi tiết fields tổng hợp:**

| Field               | Mô tả                                           |
| ------------------- | ----------------------------------------------- |
| `openingBalanceLak` | Quỹ đầu kỳ (chỉ có ý nghĩa khi lọc 1 chi nhánh) |
| `totalInLak`        | Tổng thu trong kỳ lọc (LAK)                     |
| `totalOutLak`       | Tổng chi trong kỳ lọc (LAK)                     |
| `closingBalanceLak` | Tồn quỹ = đầu kỳ + thu − chi                    |

---

## `GET /api/cash-ledger/activities/export`

Xuất file Excel danh sách hoạt động thu/chi theo **cùng bộ lọc** với `GET /activities`.

**Query params:** Giống `GET /activities`, bỏ `page` và `pageSize`.

| Param       | Kiểu      | Mô tả                        |
| ----------- | --------- | ---------------------------- |
| `branchId`  | Guid?     | Lọc theo chi nhánh           |
| `counterId` | Guid?     | Lọc theo quầy                |
| `fromDate`  | DateOnly? | Từ ngày                      |
| `toDate`    | DateOnly? | Đến ngày                     |
| `keyword`   | string?   | Tìm theo mã phiếu / nội dung |
| `currency`  | string?   | `LAK` / `THB` / `USD`        |
| `method`    | string?   | `CASH` / `BANK` / `COMBINED` |

**Response `200 OK`:**
Binary — file `.xlsx`
Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
Filename: `so-quy-YYYYMMDD-HHmmss.xlsx`

---

## `GET /api/cash-ledger/activities/{id}`

Chi tiết một hoạt động thu/chi theo Id (phiếu lập tay PTTT/PCTT hoặc bút toán tự động từ giao dịch POS).

**Path param:** `id` (Guid)

**Response `200 OK`:** [`CashVoucherDto`](#schema-cashvoucherdto)

**Lỗi có thể xảy ra:**

| Mã lỗi                    | HTTP | Nguyên nhân              |
| ------------------------- | ---- | ------------------------ |
| `CASH_ACTIVITY_NOT_FOUND` | 404  | Không tìm thấy hoạt động |

---

## `POST /api/cash-ledger/manual-entry`

Tạo một bút toán thu/chi thủ công nhanh (không cần mã lý do). Dành cho các khoản nhỏ không thuộc danh mục lý do cố định.

> **Khuyến nghị:** Dùng `POST /vouchers` để có đầy đủ thông tin phiếu (mã lý do, khách hàng, ghi chú).

**Request body:**

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "counterId": "ccc33333-0000-0000-0000-000000000001",
  "description": "Chi tiền mua văn phòng phẩm",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 150000,
  "exchangeRate": 1
}
```

| Field            | Bắt buộc | Kiểu    | Mô tả                                            |
| ---------------- | -------- | ------- | ------------------------------------------------ |
| `branchId`       | ✅       | Guid    | Chi nhánh                                        |
| `counterId`      | ❌       | Guid?   | Quầy                                             |
| `description`    | ✅       | string  | Nội dung / mô tả khoản thu chi                   |
| `direction`      | ✅       | string  | `IN` (thu) hoặc `OUT` (chi)                      |
| `method`         | ✅       | string  | `CASH` / `BANK`                                  |
| `currency`       | ✅       | string  | `LAK` / `THB` / `USD`                            |
| `originalAmount` | ✅       | decimal | Số tiền (theo `currency`)                        |
| `exchangeRate`   | ✅       | decimal | Tỷ giá quy đổi ra LAK (`1` nếu currency = `LAK`) |

**Response `200 OK`:**

```json
{
  "id": "fff55555-0000-0000-0000-000000000001",
  "entryCode": "PTTT000123",
  "counterId": "ccc33333-...",
  "description": "Chi tiền mua văn phòng phẩm",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 150000,
  "exchangeRate": 1,
  "amountLak": 150000,
  "createdAt": "2026-06-16T02:15:30Z"
}
```

---

## `POST /api/cash-ledger/vouchers`

Lập phiếu thu (PTTT) hoặc phiếu chi (PCTT) có đầy đủ thông tin: mã lý do, khách hàng, quầy đi/nhận, ghi chú.

Mã phiếu sinh tự động theo sequence Postgres: `PTTT000001`, `PCTT000001`, …

**Request body:**

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "direction": "IN",
  "reasonCode": "SALE_REVENUE",
  "currency": "USD",
  "exchangeRate": 21000,
  "cashAmount": 100,
  "bankAmount": 0,
  "customerId": null,
  "customerName": "Khách vãng lai",
  "fromCounterId": null,
  "toCounterId": "ccc33333-0000-0000-0000-000000000001",
  "referenceInvoiceCode": "HD-20260616-000045",
  "originalReceiptCode": null,
  "note": "Thu đổi ngoại tệ USD"
}
```

| Field                  | Bắt buộc | Kiểu    | Mô tả                                                  |
| ---------------------- | -------- | ------- | ------------------------------------------------------ |
| `branchId`             | ✅       | Guid    | Chi nhánh                                              |
| `direction`            | ✅       | string  | `IN` (phiếu thu) hoặc `OUT` (phiếu chi)                |
| `reasonCode`           | ✅       | string  | Mã lý do (lấy từ `GET /voucher-reasons`)               |
| `currency`             | ✅       | string  | `LAK` / `THB` / `USD`                                  |
| `exchangeRate`         | ✅       | decimal | Tỷ giá: số LAK tương đương 1 đơn vị `currency` (LAK→1) |
| `cashAmount`           | ✅       | decimal | Phần tiền mặt (theo `currency`)                        |
| `bankAmount`           | ✅       | decimal | Phần chuyển khoản (theo `currency`)                    |
| `customerId`           | ❌       | Guid?   | Khách hàng trong hệ thống                              |
| `customerName`         | ❌       | string? | Tên khách (ưu tiên nếu không có `customerId`)          |
| `fromCounterId`        | ❌       | Guid?   | Quầy xuất tiền đi                                      |
| `toCounterId`          | ❌       | Guid?   | Quầy nhận tiền                                         |
| `referenceInvoiceCode` | ❌       | string? | Số hóa đơn gốc liên quan                               |
| `originalReceiptCode`  | ❌       | string? | Mã phiếu thu gốc                                       |
| `note`                 | ❌       | string? | Ghi chú tự do                                          |

> `cashAmount + bankAmount` phải > 0.
> `method` được hệ thống tự suy ra: cả hai = `COMBINED`; chỉ cash = `CASH`; chỉ bank = `BANK`.

**Response `200 OK`:** [`CashVoucherDto`](#schema-cashvoucherdto)

**Lỗi có thể xảy ra:**

| Mã lỗi                           | HTTP | Nguyên nhân                                     |
| -------------------------------- | ---- | ----------------------------------------------- |
| `CASH_VOUCHER_INVALID_DIRECTION` | 422  | `direction` không phải `IN` hoặc `OUT`          |
| `CASH_VOUCHER_INVALID_AMOUNT`    | 422  | `cashAmount` hoặc `bankAmount` âm               |
| `CASH_VOUCHER_AMOUNT_REQUIRED`   | 422  | Tổng `cashAmount + bankAmount = 0`              |
| `CASH_VOUCHER_REASON_INVALID`    | 422  | `reasonCode` không tồn tại hoặc sai `direction` |

---

## `GET /api/cash-ledger/vouchers`

Danh sách phiếu thu/chi kèm tổng hợp quỹ trong kỳ. Chỉ trả phiếu lập tay (Source = Manual, có `reasonCode`) — không bao gồm bút toán tự động từ POS.

**Query params:**

| Param       | Kiểu      | Mô tả                                     |
| ----------- | --------- | ----------------------------------------- |
| `branchId`  | Guid      | Chi nhánh (bắt buộc)                      |
| `fromDate`  | DateOnly? | Từ ngày (mặc định hôm nay)                |
| `toDate`    | DateOnly? | Đến ngày (mặc định hôm nay)               |
| `direction` | string?   | `IN` / `OUT` / bỏ trống = tất cả          |
| `keyword`   | string?   | Tìm theo mã phiếu / tên khách / số HĐ gốc |
| `page`      | int       | Mặc định `1`                              |
| `pageSize`  | int       | Mặc định `20`                             |

**Response `200 OK`:**

```json
{
  "vouchers": [
    /* mảng CashVoucherDto */
  ],
  "openingBalanceLak": 5000000,
  "totalInLak": 28500000,
  "totalOutLak": 12000000,
  "closingBalanceLak": 21500000,
  "totalCount": 15,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

| Field               | Mô tả                                             |
| ------------------- | ------------------------------------------------- |
| `openingBalanceLak` | Quỹ đầu kỳ tính đến `fromDate` (cộng dồn lịch sử) |
| `totalInLak`        | Tổng thu phiếu thủ công + giao dịch POS trong kỳ  |
| `totalOutLak`       | Tổng chi phiếu thủ công + giao dịch POS trong kỳ  |
| `closingBalanceLak` | Tồn quỹ = đầu kỳ + thu − chi                      |

---

## `GET /api/cash-ledger/vouchers/{id}`

Chi tiết một phiếu thu/chi theo Id.

**Path param:** `id` (Guid)

**Response `200 OK`:** [`CashVoucherDto`](#schema-cashvoucherdto)

**Lỗi có thể xảy ra:**

| Mã lỗi                   | HTTP | Nguyên nhân          |
| ------------------------ | ---- | -------------------- |
| `CASH_VOUCHER_NOT_FOUND` | 404  | Không tìm thấy phiếu |

---

## `GET /api/cash-ledger/voucher-reasons`

Danh mục lý do thu/chi cố định (được hard-code trong `CashVoucherReasonCatalog`).

**Query params:**

| Param       | Kiểu    | Mô tả                            |
| ----------- | ------- | -------------------------------- |
| `direction` | string? | `IN` / `OUT` / bỏ trống = tất cả |

**Response `200 OK`:**

```json
[
  {
    "code": "SALE_REVENUE",
    "direction": "IN",
    "label": "Thu doanh thu bán hàng"
  },
  {
    "code": "CURRENCY_EXCHANGE",
    "direction": "IN",
    "label": "Thu đổi ngoại tệ"
  },
  { "code": "PURCHASE_EXPENSE", "direction": "OUT", "label": "Chi mua hàng" },
  {
    "code": "TRANSFER_OUT",
    "direction": "OUT",
    "label": "Chuyển quỹ sang quầy khác"
  }
]
```

---

## `GET /api/cash-ledger/cash-count`

Lấy bảng kê đếm tiền (theo mệnh giá) cho một ngày. Nếu chưa nhập, trả mệnh giá mặc định với `quantity = 0`.

**Query params:**

| Param       | Bắt buộc | Kiểu      | Mô tả                   |
| ----------- | -------- | --------- | ----------------------- |
| `branchId`  | ✅       | Guid      | Chi nhánh               |
| `counterId` | ❌       | Guid?     | Quầy                    |
| `date`      | ❌       | DateOnly? | Ngày (mặc định hôm nay) |

**Response `200 OK`:**

```json
{
  "id": "ddd44444-0000-0000-0000-000000000001",
  "isFinalized": false,
  "handoverCode": null,
  "countedByName": "",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 30 },
    { "currency": "LAK", "denomination": 50000, "quantity": 20 },
    { "currency": "LAK", "denomination": 20000, "quantity": 10 },
    { "currency": "LAK", "denomination": 10000, "quantity": 5 },
    { "currency": "LAK", "denomination": 5000, "quantity": 0 },
    { "currency": "LAK", "denomination": 2000, "quantity": 0 },
    { "currency": "THB", "denomination": 1000, "quantity": 5 },
    { "currency": "THB", "denomination": 500, "quantity": 0 },
    { "currency": "USD", "denomination": 100, "quantity": 2 },
    { "currency": "USD", "denomination": 50, "quantity": 0 }
  ]
}
```

| Field          | Mô tả                                           |
| -------------- | ----------------------------------------------- |
| `id`           | Guid? — null nếu chưa có bảng kê nào trong ngày |
| `isFinalized`  | `true` khi đã chốt bàn giao                     |
| `handoverCode` | Mã bàn giao (nếu đã finalized)                  |

---

## `PUT /api/cash-ledger/cash-count`

Lưu / cập nhật bảng kê đếm tiền. Ghi đè bảng kê hiện có (nếu có).

**Request body:**

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "counterId": null,
  "date": "2026-06-16",
  "countedByName": "Nguyễn Thị Lan",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 30 },
    { "currency": "LAK", "denomination": 50000, "quantity": 20 },
    { "currency": "THB", "denomination": 1000, "quantity": 5 },
    { "currency": "USD", "denomination": 100, "quantity": 2 }
  ]
}
```

**Response `200 OK`:** `{ "id": "ddd44444-..." }` — Id của bảng kê đã lưu.

---

## `POST /api/cash-ledger/handover`

Bàn giao chốt ca cuối ngày — finalize bảng kê đếm tiền và ghi log chênh lệch.

> **Khuyến nghị:** Dùng `POST /session/close` thay cho endpoint này.

**Request body:** Giống `PUT /cash-count` nhưng thêm `actualAmountLak` và `expectedAmountLak`.

```json
{
  "branchId": "bbb22222-0000-0000-0000-000000000001",
  "counterId": null,
  "date": "2026-06-16",
  "countedByName": "Nguyễn Thị Lan",
  "items": [
    /* mảng CashCountItemDto */
  ],
  "actualAmountLak": 4850000,
  "expectedAmountLak": 5000000
}
```

**Response `200 OK`:** `{ "handoverCode": "BGQ-20260616-A3F2B1" }`

---

## Schema: `CashSessionDto`

```json
{
  "isOpen": true,
  "sessionId": "eee55555-0000-0000-0000-000000000001",
  "status": "Open",
  "openingCashLak": 5000000,
  "openingBankLak": 0,
  "closingCashLak": null,
  "closingBankLak": null,
  "cashDifferenceLak": null,
  "handoverCode": null,
  "openedAt": "2026-06-16T01:00:00Z",
  "closedAt": null,
  "closedByName": null
}
```

| Field               | Kiểu     | Mô tả                                            |
| ------------------- | -------- | ------------------------------------------------ |
| `isOpen`            | bool     | `true` nếu phiên đang mở                         |
| `status`            | string?  | `"Open"` / `"Closed"` / `null` (chưa có phiên)   |
| `openingCashLak`    | decimal  | Tiền mặt đầu kỳ (LAK)                            |
| `openingBankLak`    | decimal  | Số dư ngân hàng đầu kỳ (LAK)                     |
| `closingCashLak`    | decimal? | Tiền mặt thực đếm cuối kỳ (`null` khi chưa chốt) |
| `closingBankLak`    | decimal? | Ngân hàng cuối kỳ (`null` khi chưa chốt)         |
| `cashDifferenceLak` | decimal? | Chênh lệch = thực tế − kỳ vọng                   |
| `handoverCode`      | string?  | Mã bàn giao (`null` khi chưa chốt)               |

---

## Schema: `CashVoucherDto`

```json
{
  "id": "fff55555-0000-0000-0000-000000000001",
  "entryCode": "PTTT000123",
  "direction": "IN",
  "date": "2026-06-16",
  "createdAt": "2026-06-16T02:15:30Z",
  "timeLabel": "09:15:30 - 16/06/2026",
  "branchId": "bbb22222-...",
  "branchName": "Vientiane Main",
  "amountLak": 2100000,
  "cashAmountLak": 2100000,
  "bankAmountLak": 0,
  "currency": "USD",
  "exchangeRate": 21000,
  "method": "CASH",
  "reasonCode": "CURRENCY_EXCHANGE",
  "reasonLabel": "Thu đổi ngoại tệ",
  "customerId": null,
  "customerName": "Khách vãng lai",
  "fromCounterId": null,
  "fromCounterName": null,
  "toCounterId": "ccc33333-...",
  "toCounterName": "Quầy 1 — Bán vàng",
  "referenceInvoiceCode": "HD-20260616-000045",
  "originalReceiptCode": null,
  "createdById": "aaa11111-...",
  "createdByName": "Nguyễn Thị Lan",
  "note": "Thu đổi ngoại tệ USD",
  "description": "PTTT000123 - Thu đổi ngoại tệ - Khách vãng lai",
  "entryType": "IN",
  "source": "Manual"
}
```

| Field           | Mô tả                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `amountLak`     | Tổng giá trị quy đổi ra LAK = `(cashAmount + bankAmount) × exchangeRate`      |
| `cashAmountLak` | Phần tiền mặt (LAK)                                                           |
| `bankAmountLak` | Phần chuyển khoản (LAK)                                                       |
| `currency`      | Loại tiền gốc của phiếu: `LAK` / `THB` / `USD`                                |
| `exchangeRate`  | Tỷ giá tại thời điểm lập phiếu                                                |
| `method`        | `CASH` / `BANK` / `COMBINED`                                                  |
| `entryType`     | Loại bút toán: `IN` / `OUT` / `SellGold` / `BuyGold` / ... (từ giao dịch POS) |
| `source`        | Nguồn tạo: `Manual` / `Transaction` / `Cancellation` / `Handover`             |

---

## Mã lỗi

| Mã lỗi                           | HTTP | Nguyên nhân                                    |
| -------------------------------- | ---- | ---------------------------------------------- |
| `BRANCH_NOT_FOUND`               | 404  | Không tìm thấy chi nhánh                       |
| `CASH_SESSION_ALREADY_OPEN`      | 422  | Phiên quỹ ngày này đã tồn tại                  |
| `CASH_SESSION_NOT_FOUND`         | 404  | Không tìm thấy phiên quỹ                       |
| `CASH_SESSION_NOT_OPEN`          | 422  | Phiên quỹ đã được chốt                         |
| `CASH_VOUCHER_NOT_FOUND`         | 404  | Không tìm thấy phiếu thu/chi                   |
| `CASH_ACTIVITY_NOT_FOUND`        | 404  | Không tìm thấy hoạt động sổ quỹ                |
| `CASH_VOUCHER_INVALID_DIRECTION` | 422  | `direction` không phải `IN` hoặc `OUT`         |
| `CASH_VOUCHER_INVALID_AMOUNT`    | 422  | Số tiền âm                                     |
| `CASH_VOUCHER_AMOUNT_REQUIRED`   | 422  | Tổng `cashAmount + bankAmount = 0`             |
| `CASH_VOUCHER_REASON_INVALID`    | 422  | `reasonCode` không hợp lệ hoặc sai `direction` |
| `AUTH_FORBIDDEN`                 | 403  | Không có quyền `CASH_LEDGER_MANAGE`            |

---

## Luồng sử dụng điển hình

### ThuQuy mở quỹ và theo dõi thu/chi

```
1. Xem trạng thái phiên
   GET /api/cash-ledger/session?branchId=<b>&date=2026-06-16
   → { isOpen: false }

2. Mở phiên quỹ buổi sáng
   POST /api/cash-ledger/session/open
   body: { branchId, date, openingCashLak: 5000000, openingBankLak: 0 }
   → 201: CashSessionDto { isOpen: true, sessionId: "..." }

3. Giao dịch POS diễn ra tự động trong ngày
   (bút toán được tạo tự động khi hoàn tất Transaction)

4. Lập phiếu thu khi thu tiền ngoài POS
   POST /api/cash-ledger/vouchers
   body: {
     branchId, direction: "IN", reasonCode: "CURRENCY_EXCHANGE",
     currency: "USD", exchangeRate: 21000,
     cashAmount: 100, bankAmount: 0,
     customerName: "Khách vãng lai",
     referenceInvoiceCode: "HD-20260616-000045"
   }
   → 200: CashVoucherDto { entryCode: "PTTT000001", amountLak: 2100000 }

5. Lọc hoạt động theo ngoại tệ USD
   GET /api/cash-ledger/activities?branchId=<b>&currency=USD&fromDate=2026-06-16&toDate=2026-06-16
   → 200: { items: [...], totalInLak: 2100000, totalOutLak: 0, ... }

6. Lọc hoạt động theo phương thức thanh toán
   GET /api/cash-ledger/activities?branchId=<b>&method=CASH&fromDate=2026-06-16
   → 200: { items: [...tiền mặt only...] }

7. Xem tổng quan sổ quỹ ngày
   GET /api/cash-ledger/daily?branchId=<b>&date=2026-06-16
   → 200: { openingBalanceLak: 5000000, totalInLak: ..., closingBalanceLak: ... }

8. Đếm tiền cuối ngày
   PUT /api/cash-ledger/cash-count
   body: { branchId, date, countedByName, items: [...mệnh giá...] }

9. Chốt phiên quỹ
   POST /api/cash-ledger/session/close
   body: { branchId, date, countedByName, items, actualAmountLak: 4850000, expectedAmountLak: 5000000 }
   → 200: { handoverCode: "BGQ-20260616-A3F2B1", difference: -150000 }

10. Xuất Excel sổ quỹ ngày
    GET /api/cash-ledger/activities/export?branchId=<b>&fromDate=2026-06-16&toDate=2026-06-16
    → file .xlsx
```

---

## Ghi chú kỹ thuật

- **Múi giờ:** Server lưu `DateTime` theo UTC. `timeLabel` đã cộng +7 giờ (ICT/Vientiane) khi trả về.
- **Tỷ giá:** `exchangeRate` = số LAK tương đương 1 đơn vị `currency` (LAK luôn = 1). Ví dụ: 1 USD = 21,000 LAK → `exchangeRate = 21000`.
- **Sequence mã phiếu:** `PTTT` / `PCTT` dùng Postgres sequence riêng biệt — an toàn dưới truy cập đồng thời, không bao giờ bị trùng.
- **Tự động bù source:** Bút toán từ giao dịch POS có `source = "Transaction"`, lập tay có `source = "Manual"`. Endpoint `/activities` trả cả hai; `/vouchers` chỉ trả `Manual`.
- **Filter `currency`/`method`:** Áp dụng đồng thời nếu truyền cả hai (AND logic). Truyền `currency=LAK&method=CASH` → chỉ lấy giao dịch LAK tiền mặt.
