# API — Sổ Quỹ (Cash Ledger)

> Base path: `/api/cash-ledger`
> Auth: **Bearer JWT** — tất cả endpoint yêu cầu policy `CashLedgerManage` (role: `ThuQuy`, `Manager`, `SystemAdmin`)

> **Cập nhật từ API Reference:** Tài liệu này đồng bộ với API Reference v3 (2026-06-18).
> Xem các thay đổi breaking so với phiên bản cũ ở [cuối trang](#breaking-changes).

---

## Mục lục

1. [Quy ước mã phiếu (EntryCode)](#1-quy-ước-mã-phiếu-entrycode)
2. [GET /daily — Tổng hợp quỹ ngày](#2-get-daily--tổng-hợp-quỹ-ngày)
3. [POST /opening-balance — Ghi số dư đầu ngày](#3-post-opening-balance--ghi-số-dư-đầu-ngày)
4. [POST /manual-entry — Thu/chi thủ công nhanh](#4-post-manual-entry--thuχi-thủ-công-nhanh)
5. [GET /activities — Danh sách toàn bộ hoạt động](#5-get-activities--danh-sách-toàn-bộ-hoạt-động)
6. [GET /activities/export — Xuất Excel](#6-get-activitiesexport--xuất-excel)
7. [GET /activities/{id} — Chi tiết hoạt động](#7-get-activitiesid--chi-tiết-hoạt-động)
8. [POST /vouchers — Lập phiếu thu/chi chính thức](#8-post-vouchers--lập-phiếu-thuχi-chính-thức)
9. [GET /vouchers — Danh sách phiếu thủ công](#9-get-vouchers--danh-sách-phiếu-thủ-công)
10. [GET /vouchers/{id} — Chi tiết phiếu](#10-get-vouchersid--chi-tiết-phiếu)
11. [GET /voucher-reasons — Danh mục lý do thu/chi](#11-get-voucher-reasons--danh-mục-lý-do-thuχi)
12. [GET /cash-count — Lấy bảng kê đếm tiền](#12-get-cash-count--lấy-bảng-kê-đếm-tiền)
13. [PUT /cash-count — Lưu bảng kê đếm tiền](#13-put-cash-count--lưu-bảng-kê-đếm-tiền)
14. [POST /handover — Chốt bàn giao ca](#14-post-handover--chốt-bàn-giao-ca)
15. [GET /session — Trạng thái phiên quỹ](#15-get-session--trạng-thái-phiên-quỹ)
16. [POST /session/open — Mở phiên quỹ](#16-post-sessionopen--mở-phiên-quỹ)
17. [POST /session/close — Chốt phiên quỹ](#17-post-sessionclose--chốt-phiên-quỹ)
18. [Struct CashVoucherDto](#18-struct-cashvoucherdto)
19. [Enum & Hằng số](#19-enum--hằng-số)
20. [Mã lỗi](#20-mã-lỗi)
21. [Luồng tích hợp FE](#21-luồng-tích-hợp-fe)
22. [Breaking Changes](#breaking-changes)

---

## 1. Quy ước mã phiếu (EntryCode)

| Prefix | Loại | Sinh bởi |
|---|---|---|
| `PTTT000001` | Phiếu Thu Tiền Tệ (IN) | PostgreSQL sequence `seq_cash_voucher_thu` — tăng dần, không reset theo ngày |
| `PCTT000001` | Phiếu Chi Tiền Tệ (OUT) | PostgreSQL sequence `seq_cash_voucher_chi` — tăng dần, không reset theo ngày |
| `TC-yyyyMMdd-XXXXXX` | Log nội bộ bàn giao ca | Random — **không hiển thị cho người dùng** |

Tất cả phiếu thu/chi tạo thủ công (`POST /manual-entry`, `POST /vouchers`) và bút toán tự động từ giao dịch POS đều dùng chung sequence PTTT/PCTT.

---

## 2. GET /daily — Tổng hợp quỹ ngày

Trả về **4 chỉ số tổng hợp** của quỹ trong ngày. **Không trả danh sách entries** (dùng `GET /activities` để lấy danh sách).

### Query params

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | ID chi nhánh |
| `counterId` | `uuid` | ❌ | Lọc theo quầy cụ thể |
| `date` | `DateOnly` (`yyyy-MM-dd`) | ❌ | Mặc định: hôm nay |

### Response `200 OK`

```json
{
  "date": "2026-06-15",
  "branchId": "bb5a8354-14c8-4a01-a0ae-ca79d60229e1",
  "branchName": "Vientiane Main",
  "openingBalanceId": "uuid-or-null",
  "openingBalanceLak": 50000000,
  "totalInLak": 6700000,
  "totalOutLak": 0,
  "closingBalanceLak": 56700000
}
```

| Field | Mô tả |
|---|---|
| `openingBalanceId` | `null` nếu chưa thiết lập số dư đầu ngày |
| `openingBalanceLak` | Quỹ đầu kỳ (tiền mặt + ngân hàng) |
| `totalInLak` | Tổng thu trong ngày (tất cả `Direction = IN`) |
| `totalOutLak` | Tổng chi trong ngày (tất cả `Direction = OUT`) |
| `closingBalanceLak` | Tồn quỹ dự kiến = `openingBalanceLak + totalInLak − totalOutLak` |

> **Lưu ý so với phiên bản cũ**: `openingCashLak` và `openingBankLak` đã được **gộp** thành `openingBalanceLak`. Endpoint này không còn trả `entries[]`.

---

## 3. POST /opening-balance — Ghi số dư đầu ngày

Đặt hoặc cập nhật số dư mở đầu ngày (upsert — gọi nhiều lần được).

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-15",
  "cashAmountLak": 50000000,
  "bankAmountLak": 100000000
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | Nếu null → thiết lập cho toàn chi nhánh |
| `date` | `DateOnly` | ✅ | Ngày áp dụng |
| `cashAmountLak` | `decimal` | ✅ | Tiền mặt tồn đầu ngày (LAK) |
| `bankAmountLak` | `decimal` | ✅ | Số dư ngân hàng/chuyển khoản đầu ngày (LAK) |

### Response `200 OK`

```json
{ "message": "OK" }
```

---

## 4. POST /manual-entry — Thu/chi thủ công nhanh

Ghi một khoản thu hoặc chi nhanh, không cần chọn lý do từ danh mục. Mã phiếu sinh tự động theo sequence PTTT/PCTT.

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "description": "Chi tiền vệ sinh văn phòng",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 500000,
  "exchangeRate": 1
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | |
| `description` | `string` | ✅ | Diễn giải khoản thu/chi |
| `direction` | `"IN"\|"OUT"` | ✅ | `IN` = thu vào, `OUT` = chi ra |
| `method` | `"CASH"\|"BANK"` | ✅ | Hình thức thanh toán |
| `currency` | `"LAK"\|"THB"\|"USD"` | ✅ | Đơn vị tiền tệ gốc |
| `originalAmount` | `decimal` | ✅ | Số tiền theo đơn vị `currency` |
| `exchangeRate` | `decimal` | ✅ | Tỷ giá quy LAK — nếu `currency = LAK` thì truyền `1` |

> `amountLak = originalAmount × exchangeRate` — tính tự động phía backend.

### Response `200 OK` — `ManualEntryDto`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "entryCode": "PCTT000003",
  "counterId": null,
  "description": "Chi tiền vệ sinh văn phòng",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 500000,
  "exchangeRate": 1,
  "amountLak": 500000,
  "createdAt": "2026-06-15T08:30:00Z"
}
```

---

## 5. GET /activities — Danh sách toàn bộ hoạt động

Lấy **toàn bộ** hoạt động thu/chi sổ quỹ, bao gồm:
- Phiếu PTTT/PCTT lập tay (`POST /manual-entry`, `POST /vouchers`)
- Bút toán tự động phát sinh từ giao dịch POS

Sắp xếp giảm dần theo thời gian (`createdAt DESC`).

### Query params

| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `branchId` | `uuid` | ❌ | — | Lọc theo chi nhánh (null = tất cả) |
| `counterId` | `uuid` | ❌ | — | Lọc theo quầy |
| `fromDate` | `DateOnly` | ❌ | Hôm nay | Ngày bắt đầu |
| `toDate` | `DateOnly` | ❌ | Hôm nay | Ngày kết thúc |
| `keyword` | `string` | ❌ | — | Tìm theo `entryCode` hoặc `description` |
| `currency` | `"LAK"\|"THB"\|"USD"` | ❌ | — | Lọc theo loại tiền |
| `method` | `"CASH"\|"BANK"\|"COMBINED"` | ❌ | — | Lọc theo hình thức |
| `page` | `int` | ❌ | `1` | |
| `pageSize` | `int` | ❌ | `20` | |

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "55b4f934-12c7-4029-8817-930fd01d58f3",
      "entryCode": "PTTT000001",
      "timeLabel": "10:08:52 - 15/06/2026",
      "createdByName": "Nguyễn Đăng",
      "branchName": "Vientiane Main",
      "methodLabel": "Tiền mặt",
      "direction": "IN",
      "currency": "LAK",
      "method": "CASH",
      "amountLak": 6700000,
      "originalAmount": 6700000,
      "description": "[BV-20260615-85A7EDF0] Doanh thu bán vàng: Nhẫn cưới (1 cái) - Khách Nguyễn Văn A",
      "referenceInvoiceCode": "BV-20260615-85A7EDF0",
      "entryType": "SellGold",
      "source": "Transaction",
      "customerName": "Nguyễn Văn A",
      "cashAmountLak": 6700000,
      "bankAmountLak": 0,
      "note": null
    }
  ],
  "totalCount": 97,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5,
  "currency": null,
  "openingBalanceLak": 50000000,
  "totalInLak": 6700000,
  "totalOutLak": 0,
  "openingBalanceOriginal": 50000000,
  "totalInOriginal": 6700000,
  "totalOutOriginal": 0
}
```

**Fields trong mỗi item:**

| Field | Mô tả |
|---|---|
| `entryCode` | Mã phiếu: `PTTT…` (thu) hoặc `PCTT…` (chi) |
| `timeLabel` | Giờ và ngày hiển thị: `"HH:mm:ss - dd/MM/yyyy"` |
| `methodLabel` | `"Tiền mặt"` \| `"Chuyển khoản ngân hàng"` \| `"Tiền mặt & Chuyển khoản"` |
| `direction` | `"IN"` (thu) \| `"OUT"` (chi) |
| `currency` | Loại tiền gốc: `"LAK"` \| `"THB"` \| `"USD"` |
| `method` | Hình thức thô: `"CASH"` \| `"BANK"` \| `"COMBINED"` |
| `amountLak` | Tổng quy đổi ra LAK |
| `originalAmount` | Số tiền gốc theo `currency` |
| `cashAmountLak` | Phần tiền mặt (LAK) |
| `bankAmountLak` | Phần chuyển khoản (LAK) |
| `description` | Nội dung — bút toán POS chứa mã hóa đơn `[BV-...]` |
| `referenceInvoiceCode` | Mã hóa đơn gốc (chỉ có với bút toán POS) |
| `entryType` | Xem bảng [entryType](#entrytype) |
| `source` | `"Transaction"` \| `"Manual"` \| `"Handover"` |
| `customerName` | Tên khách hàng (snapshot) |
| `note` | Ghi chú (nếu có) |

**Fields tổng hợp ở root response:**

| Field | Mô tả |
|---|---|
| `currency` | Giá trị filter `currency` đã áp dụng (`null` = tất cả) |
| `openingBalanceLak` | Quỹ đầu kỳ quy LAK |
| `totalInLak` | Tổng thu quy LAK |
| `totalOutLak` | Tổng chi quy LAK |
| `openingBalanceOriginal` | Quỹ đầu kỳ theo đơn vị `currency` (= LAK nếu không lọc hoặc lọc LAK) |
| `totalInOriginal` | Tổng thu theo đơn vị `currency` |
| `totalOutOriginal` | Tổng chi theo đơn vị `currency` |

> Để xem chi tiết từng dòng → `GET /activities/{id}`.

---

## 6. GET /activities/export — Xuất Excel

Xuất file Excel danh sách hoạt động thu/chi theo **cùng bộ lọc** với `GET /activities` (không có `page`/`pageSize` — xuất toàn bộ).

### Query params

Giống hệt `GET /activities` nhưng **bỏ** `page` và `pageSize`.

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ❌ | |
| `counterId` | `uuid` | ❌ | |
| `fromDate` | `DateOnly` | ❌ | |
| `toDate` | `DateOnly` | ❌ | |
| `keyword` | `string` | ❌ | |
| `currency` | `"LAK"\|"THB"\|"USD"` | ❌ | |
| `method` | `"CASH"\|"BANK"\|"COMBINED"` | ❌ | |

### Response `200 OK`

Binary file — `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
`Content-Disposition: attachment; filename="so-quy-yyyyMMdd-HHmmss.xlsx"`

> **FE**: dùng `window.location.href` hoặc thẻ `<a href="...">` với token query param / Authorization header để tải file.

---

## 7. GET /activities/{id} — Chi tiết hoạt động

Chi tiết một hoạt động thu/chi bất kỳ (phiếu PTTT/PCTT hoặc bút toán POS).

### Response `200 OK`

Trả về `CashVoucherDto` — xem [cấu trúc đầy đủ ở mục 18](#18-struct-cashvoucherdto).

### Response `404`

```json
{ "status": 404, "errorCode": "CASH_ACTIVITY_NOT_FOUND" }
```

---

## 8. POST /vouchers — Lập phiếu thu/chi chính thức

Lập phiếu thu (`Direction = IN` → `PTTT…`) hoặc phiếu chi (`Direction = OUT` → `PCTT…`) **chính thức**, có lý do từ danh mục (khác với `/manual-entry` là nhập tự do).

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "direction": "OUT",
  "reasonCode": "CHI_HANG",
  "currency": "LAK",
  "exchangeRate": 1,
  "cashAmount": 15000000,
  "bankAmount": 0,
  "customerId": null,
  "customerName": "Nguyễn Đăng Đoàn",
  "fromCounterId": "uuid-quay-di",
  "toCounterId": null,
  "referenceInvoiceCode": null,
  "originalReceiptCode": null,
  "note": "Chi tiền mua hàng"
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `direction` | `"IN"\|"OUT"` | ✅ | |
| `reasonCode` | `string` | ✅ | Lấy từ `GET /voucher-reasons` |
| `currency` | `"LAK"\|"THB"\|"USD"` | ✅ | |
| `exchangeRate` | `decimal` | ✅ | Tỷ giá quy LAK (`1` nếu LAK) |
| `cashAmount` | `decimal` | ❌ | Phần tiền mặt (LAK) |
| `bankAmount` | `decimal` | ❌ | Phần chuyển khoản (LAK) |
| `customerId` | `uuid\|null` | ❌ | Khách hàng liên quan (nếu có) |
| `customerName` | `string\|null` | ❌ | Tên khách — dùng khi chưa có trong hệ thống |
| `fromCounterId` | `uuid\|null` | ❌ | Quầy chi tiền ra (phiếu chi) |
| `toCounterId` | `uuid\|null` | ❌ | Quầy nhận tiền (phiếu thu) |
| `referenceInvoiceCode` | `string\|null` | ❌ | Mã hóa đơn tham chiếu |
| `originalReceiptCode` | `string\|null` | ❌ | Mã chứng từ gốc |
| `note` | `string\|null` | ❌ | Ghi chú |

> `cashAmount + bankAmount` phải > 0.

### Response `200 OK`

Trả về `CashVoucherDto` — xem [mục 18](#18-struct-cashvoucherdto).

### Lỗi

| `errorCode` | Tình huống |
|---|---|
| `CASH_VOUCHER_INVALID_DIRECTION` | `direction` không hợp lệ |
| `CASH_VOUCHER_INVALID_AMOUNT` | `cashAmount + bankAmount ≤ 0` |
| `CASH_VOUCHER_AMOUNT_REQUIRED` | Thiếu cả `cashAmount` và `bankAmount` |
| `CASH_VOUCHER_REASON_INVALID` | `reasonCode` không tồn tại hoặc không khớp `direction` |

---

## 9. GET /vouchers — Danh sách phiếu thủ công

Danh sách phiếu thu/chi lập **thủ công** (chỉ PTTT/PCTT, **không** bao gồm bút toán POS tự động), kèm tổng hợp quỹ trong kỳ.

### Query params

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `fromDate` | `DateOnly` | ❌ | |
| `toDate` | `DateOnly` | ❌ | |
| `direction` | `"IN"\|"OUT"` | ❌ | Bỏ qua = lấy tất cả |
| `keyword` | `string` | ❌ | Tìm theo `entryCode` hoặc `description` |
| `page` | `int` | ❌ | Mặc định `1` |
| `pageSize` | `int` | ❌ | Mặc định `20` |

### Response `200 OK`

```json
{
  "vouchers": [ /* CashVoucherDto[] */ ],
  "openingBalanceLak": 50000000,
  "totalInLak": 6700000,
  "totalOutLak": 0,
  "closingBalanceLak": 56700000,
  "totalCount": 38,
  "page": 1,
  "pageSize": 10,
  "totalPages": 4
}
```

---

## 10. GET /vouchers/{id} — Chi tiết phiếu

Chi tiết một phiếu thu/chi theo Id. Trả về `CashVoucherDto`.

**Lỗi:** `404 CASH_VOUCHER_NOT_FOUND`.

---

## 11. GET /voucher-reasons — Danh mục lý do thu/chi

Danh mục lý do cố định, dùng để điền `reasonCode` khi lập phiếu chính thức (`POST /vouchers`).

### Query params

| Param | Kiểu | Mô tả |
|---|---|---|
| `direction` | `"IN"\|"OUT"` | Lọc theo chiều (bỏ qua = tất cả) |

### Response `200 OK`

```json
[
  { "code": "CHI_HANG",  "direction": "OUT", "label": "Chi tiền mua hàng" },
  { "code": "THU_KHACH", "direction": "IN",  "label": "Thu tiền từ khách" }
]
```

> FE nên gọi endpoint này để populate dropdown `reasonCode` trong form lập phiếu.

---

## 12. GET /cash-count — Lấy bảng kê đếm tiền

Trả về bảng kê đếm tiền mặt theo mệnh giá cho một ngày. Nếu chưa có bản ghi → trả về danh sách mệnh giá mặc định với `quantity = 0`.

### Query params

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid` | ❌ | |
| `date` | `DateOnly` | ❌ | Mặc định: hôm nay |

### Response `200 OK`

```json
{
  "id": "3fa85f64-...",
  "isFinalized": false,
  "handoverCode": null,
  "countedByName": "Nguyễn Thị B",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 5 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 10 },
    { "currency": "LAK", "denomination": 20000,  "quantity": 0 },
    { "currency": "LAK", "denomination": 10000,  "quantity": 0 },
    { "currency": "LAK", "denomination": 5000,   "quantity": 0 },
    { "currency": "LAK", "denomination": 2000,   "quantity": 0 },
    { "currency": "THB", "denomination": 1000,   "quantity": 2 },
    { "currency": "THB", "denomination": 500,    "quantity": 0 },
    { "currency": "USD", "denomination": 100,    "quantity": 1 },
    { "currency": "USD", "denomination": 50,     "quantity": 0 }
  ]
}
```

| Field | Mô tả |
|---|---|
| `id` | `null` nếu chưa lưu lần nào |
| `isFinalized` | `true` sau khi đã chốt bàn giao — không sửa được nữa |
| `handoverCode` | `null` nếu chưa chốt. Sau chốt: format `HO-yyyyMMdd-XXXXX` |
| `countedByName` | Tên người đếm tiền |

**Mệnh giá mặc định** (khi chưa có bản ghi):

| Tiền tệ | Mệnh giá |
|---|---|
| LAK | 100,000 · 50,000 · 20,000 · 10,000 · 5,000 · 2,000 |
| THB | 1,000 · 500 |
| USD | 100 · 50 |

---

## 13. PUT /cash-count — Lưu bảng kê đếm tiền

Lưu (upsert) bảng kê đếm tiền. Có thể gọi nhiều lần để cập nhật số lượng từng mệnh giá trước khi chốt.

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-15",
  "countedByName": "Nguyễn Đăng",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 5 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 10 },
    { "currency": "THB", "denomination": 1000,   "quantity": 2 },
    { "currency": "USD", "denomination": 100,    "quantity": 1 }
  ]
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | |
| `date` | `DateOnly` | ✅ | |
| `countedByName` | `string` | ✅ | Tên người thực hiện đếm tiền |
| `items` | `CashCountItem[]` | ✅ | Danh sách mệnh giá và số lượng |
| `items[].currency` | `"LAK"\|"THB"\|"USD"` | ✅ | |
| `items[].denomination` | `int` | ✅ | Mệnh giá |
| `items[].quantity` | `int` | ✅ | Số tờ/đồng (≥ 0) |

### Response `200 OK`

```json
{ "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6" }
```

> `id` là UUID của bản ghi `CashCountSheet` vừa tạo/cập nhật.

---

## 14. POST /handover — Chốt bàn giao ca

Tổng kết và chốt bàn giao ca làm việc. **Không thể hoàn tác** — sau khi chốt, bảng kê đếm tiền sẽ `isFinalized = true`.

Backend tự động:
- Tính chênh lệch `actualAmountLak − expectedAmountLak`
- Ghi bút toán đối chiếu vào sổ quỹ (`BALANCED` / `SURPLUS` / `DEFICIT`)
- Sinh `handoverCode` định danh biên bản bàn giao

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-15",
  "countedByName": "Nguyễn Đăng",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 5 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 10 },
    { "currency": "THB", "denomination": 1000,   "quantity": 2 },
    { "currency": "USD", "denomination": 100,    "quantity": 1 }
  ],
  "actualAmountLak": 56700000,
  "expectedAmountLak": 56700000
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | |
| `date` | `DateOnly` | ✅ | |
| `countedByName` | `string` | ✅ | Tên người bàn giao |
| `items` | `CashCountItem[]` | ✅ | Bảng kê mệnh giá (giống PUT /cash-count) |
| `actualAmountLak` | `decimal` | ✅ | Tổng tiền mặt LAK thực đếm được |
| `expectedAmountLak` | `decimal` | ✅ | Tổng tiền dự kiến từ sổ quỹ — lấy từ `GET /daily` → `closingBalanceLak` |

> **Gợi ý FE**:
> - `expectedAmountLak` = `GET /daily` → `closingBalanceLak`
> - `actualAmountLak` = `Σ (denomination × quantity)` chỉ tính mệnh giá **LAK** trong `items`

### Response `200 OK`

```json
{ "handoverCode": "HO-20260615-XXXXX" }
```

---

## 15. GET /session — Trạng thái phiên quỹ

Lấy trạng thái phiên quỹ của một chi nhánh / quầy trong ngày. Nếu chưa có phiên nào → trả về `isOpen = false`.

### Query params

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid` | ❌ | |
| `date` | `DateOnly` (`yyyy-MM-dd`) | ✅ | |

### Response `200 OK` — `CashSessionDto`

**Trường hợp chưa có phiên:**
```json
{
  "isOpen": false,
  "sessionId": null,
  "status": null,
  "openingCashLak": 0,
  "openingBankLak": 0,
  "closingCashLak": null,
  "closingBankLak": null,
  "cashDifferenceLak": null,
  "handoverCode": null,
  "openedAt": null,
  "closedAt": null,
  "closedByName": null
}
```

**Trường hợp đang mở phiên:**
```json
{
  "isOpen": true,
  "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Open",
  "openingCashLak": 50000000,
  "openingBankLak": 100000000,
  "closingCashLak": null,
  "closingBankLak": null,
  "cashDifferenceLak": null,
  "handoverCode": null,
  "openedAt": "2026-06-18T01:00:00Z",
  "closedAt": null,
  "closedByName": null
}
```

**Trường hợp đã chốt:**
```json
{
  "isOpen": false,
  "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Closed",
  "openingCashLak": 50000000,
  "openingBankLak": 100000000,
  "closingCashLak": 56700000,
  "closingBankLak": 0,
  "cashDifferenceLak": 0,
  "handoverCode": "BGQ-20260618-A1B2C3",
  "openedAt": "2026-06-18T01:00:00Z",
  "closedAt": "2026-06-18T09:30:00Z",
  "closedByName": "Nguyễn Đăng"
}
```

| Field | Mô tả |
|---|---|
| `isOpen` | `true` nếu phiên đang mở |
| `status` | `"Open"` \| `"Closed"` \| `null` (chưa có phiên) |
| `openingCashLak` | Tiền mặt đầu ca (LAK) |
| `openingBankLak` | Số dư ngân hàng đầu ca (LAK) |
| `closingCashLak` | Tiền mặt chốt cuối ca (LAK) — `null` khi chưa chốt |
| `cashDifferenceLak` | Chênh lệch = `closingCashLak − expectedCashLak` — `null` khi chưa chốt |
| `handoverCode` | Mã biên bản bàn giao — `null` khi chưa chốt. Format: `BGQ-yyyyMMdd-XXXXXX` |

> **Lưu ý**: `handoverCode` của phiên session dùng format `BGQ-yyyyMMdd-XXXXXX` (khác với `POST /handover` dùng `HO-yyyyMMdd-XXXXX`).

---

## 16. POST /session/open — Mở phiên quỹ

Mở phiên quỹ cho một chi nhánh / quầy trong ngày. Mỗi `(branchId, counterId, date)` chỉ được mở **một phiên duy nhất**.

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-18",
  "openingCashLak": 50000000,
  "openingBankLak": 100000000
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | Nếu null → mở cho toàn chi nhánh |
| `date` | `DateOnly` | ✅ | Ngày mở ca |
| `openingCashLak` | `decimal` | ✅ | Tiền mặt tồn đầu ca (LAK) |
| `openingBankLak` | `decimal` | ✅ | Số dư ngân hàng đầu ca (LAK) |

### Response `201 Created` — `CashSessionDto`

```json
{
  "isOpen": true,
  "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Open",
  "openingCashLak": 50000000,
  "openingBankLak": 100000000,
  "closingCashLak": null,
  "closingBankLak": null,
  "cashDifferenceLak": null,
  "handoverCode": null,
  "openedAt": "2026-06-18T01:00:00Z",
  "closedAt": null,
  "closedByName": null
}
```

### Lỗi

| `errorCode` | Tình huống |
|---|---|
| `CASH_SESSION_ALREADY_OPEN` | Phiên trong ngày đã được mở trước đó |

---

## 17. POST /session/close — Chốt phiên quỹ

Chốt phiên quỹ cuối ca. Lưu kiểm đếm tiền mặt, tính chênh lệch, sinh `handoverCode`. **Không thể hoàn tác** sau khi chốt.

Backend tự động:
- Lưu bảng kê đếm tiền (nếu `items` không rỗng)
- Tính `cashDifferenceLak = actualAmountLak − expectedAmountLak`
- Cập nhật trạng thái phiên thành `Closed`
- Sinh `handoverCode` format `BGQ-yyyyMMdd-XXXXXX`

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-18",
  "countedByName": "Nguyễn Đăng",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 5 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 10 },
    { "currency": "THB", "denomination": 1000,   "quantity": 2 },
    { "currency": "USD", "denomination": 100,    "quantity": 1 }
  ],
  "actualAmountLak": 56700000,
  "expectedAmountLak": 56700000
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | |
| `date` | `DateOnly` | ✅ | |
| `countedByName` | `string` | ✅ | Tên người chốt ca |
| `items` | `CashCountItem[]` | ✅ | Bảng kê mệnh giá (có thể rỗng `[]`) |
| `actualAmountLak` | `decimal` | ✅ | Tổng tiền mặt LAK thực đếm được |
| `expectedAmountLak` | `decimal` | ✅ | Tổng tiền dự kiến — lấy từ `GET /daily` → `closingBalanceLak` |

> **Gợi ý FE**:
> - `expectedAmountLak` = `GET /daily` → `closingBalanceLak`
> - `actualAmountLak` = `Σ (denomination × quantity)` chỉ tính mệnh giá **LAK** trong `items`

### Response `200 OK` — `CloseSessionResult`

```json
{
  "handoverCode": "BGQ-20260618-A1B2C3",
  "closingCashLak": 56700000,
  "closingBankLak": 0,
  "difference": 0
}
```

| Field | Mô tả |
|---|---|
| `handoverCode` | Mã biên bản bàn giao. Format: `BGQ-yyyyMMdd-XXXXXX` |
| `closingCashLak` | Tiền mặt thực đếm (= `actualAmountLak`) |
| `closingBankLak` | Số dư ngân hàng cuối ca (hiện tại luôn = `0`) |
| `difference` | Chênh lệch = `actualAmountLak − expectedAmountLak` (âm = thiếu, dương = thừa) |

### Lỗi

| `errorCode` | Tình huống |
|---|---|
| `CASH_SESSION_NOT_FOUND` | Chưa có phiên nào được mở trong ngày |
| `CASH_SESSION_NOT_OPEN` | Phiên đã chốt trước đó |

---

## 18. Struct CashVoucherDto

Dùng ở `GET /activities/{id}`, `POST /vouchers`, `GET /vouchers`, `GET /vouchers/{id}`.

```json
{
  "id": "55b4f934-...",
  "entryCode": "PTTT000001",
  "direction": "IN",
  "date": "2026-06-15",
  "createdAt": "2026-06-15T02:48:29Z",
  "timeLabel": "09:48:29 - 15/06/2026",
  "branchId": "...",
  "branchName": "Vientiane Main",
  "amountLak": 6700000,
  "cashAmountLak": 6700000,
  "bankAmountLak": 0,
  "currency": "LAK",
  "exchangeRate": 1,
  "method": "CASH",
  "reasonCode": null,
  "reasonLabel": null,
  "customerId": null,
  "customerName": "Nguyễn Văn A",
  "fromCounterId": null,
  "fromCounterName": null,
  "toCounterId": "uuid",
  "toCounterName": "Quầy vàng A1",
  "referenceInvoiceCode": "BV-20260615-85A7EDF0",
  "originalReceiptCode": null,
  "createdById": "...",
  "createdByName": "Nguyễn Đăng",
  "note": null,
  "description": "[BV-20260615-85A7EDF0] Doanh thu bán vàng: Nhẫn cưới (1 cái) - Khách Nguyễn Văn A",
  "entryType": "SellGold",
  "source": "Transaction"
}
```

| Field | Mô tả |
|---|---|
| `amountLak` | Tổng quy LAK |
| `cashAmountLak` | Phần tiền mặt (LAK) |
| `bankAmountLak` | Phần chuyển khoản (LAK) |
| `method` | `"CASH"` \| `"BANK"` \| `"COMBINED"` |
| `reasonCode` | Mã lý do (chỉ có với phiếu chính thức) |
| `reasonLabel` | Tên lý do (đã resolve từ `reasonCode`) |
| `description` | Nội dung đầy đủ — với bút toán POS chứa mã hóa đơn `[BV-...]` |
| `entryType` | Xem bảng [entryType](#entrytype) |
| `source` | `"Transaction"` \| `"Manual"` \| `"Handover"` |
| `referenceInvoiceCode` | Với bút toán POS: mã hóa đơn gốc |
| `fromCounterId/Name` | Quầy chi tiền ra (phiếu chi / bút toán OUT) |
| `toCounterId/Name` | Quầy nhận tiền vào (phiếu thu / bút toán IN) |

---

## 19. Enum & Hằng số

### `direction`

| Giá trị | Ý nghĩa |
|---|---|
| `"IN"` | Thu vào |
| `"OUT"` | Chi ra |

### `method`

| Giá trị | Ý nghĩa |
|---|---|
| `"CASH"` | Tiền mặt |
| `"BANK"` | Ngân hàng / chuyển khoản |
| `"COMBINED"` | Kết hợp tiền mặt + chuyển khoản |

### `currency`

| Giá trị | Ý nghĩa |
|---|---|
| `"LAK"` | Kip Lào |
| `"THB"` | Baht Thái |
| `"USD"` | Đô la Mỹ |

### `entryType`

| Giá trị | `source` | Ý nghĩa |
|---|---|---|
| `"SellGold"` | Transaction | Bán vàng |
| `"SellSilver"` | Transaction | Bán bạc |
| `"BuyGold"` | Transaction | Mua/thu vàng |
| `"ExchangeGold"` | Transaction | Thu đổi vàng |
| `"ExchangeCurrency"` | Transaction | Đổi ngoại tệ |
| `"BuyMoreGold"` | Transaction | Bán vàng (Mua thêm) |
| `"ExchangeFree"` | Transaction | Đổi miễn phí (sign = 0) |
| `"ExchangeToMoney"` | Transaction | Đổi thành tiền mặt |
| `"IN"` | Manual | Thu thủ công |
| `"OUT"` | Manual | Chi thủ công |

### `source`

| Giá trị | Ý nghĩa |
|---|---|
| `"Transaction"` | Tự động từ giao dịch POS |
| `"Manual"` | Nhập tay bởi thủ quỹ |
| `"Handover"` | Bút toán bàn giao ca |

---

## 20. Mã lỗi

| HTTP | `errorCode` | Tình huống |
|---|---|---|
| 404 | `BRANCH_NOT_FOUND` | `branchId` không tồn tại |
| 404 | `CASH_ACTIVITY_NOT_FOUND` | `GET /activities/{id}` không tìm thấy |
| 404 | `CASH_VOUCHER_NOT_FOUND` | `GET /vouchers/{id}` không tìm thấy |
| 404 | `CASH_SESSION_NOT_FOUND` | `POST /session/close` — chưa có phiên nào được mở |
| 401 | `AUTH_TOKEN_EXPIRED` | Token hết hạn |
| 403 | `AUTH_FORBIDDEN` | Không đủ quyền (`CashLedgerManage`) |
| 422 | `CASH_VOUCHER_INVALID_DIRECTION` | `direction` không hợp lệ |
| 422 | `CASH_VOUCHER_INVALID_AMOUNT` | `cashAmount + bankAmount ≤ 0` |
| 422 | `CASH_VOUCHER_AMOUNT_REQUIRED` | Thiếu cả hai trường amount |
| 422 | `CASH_VOUCHER_REASON_INVALID` | `reasonCode` không hợp lệ hoặc sai chiều |
| 422 | `CASH_SESSION_ALREADY_OPEN` | `POST /session/open` — phiên trong ngày đã tồn tại |
| 422 | `CASH_SESSION_NOT_OPEN` | `POST /session/close` — phiên đã chốt trước đó |
| 422 | `CASH_SESSION_ALREADY_CLOSED` | Domain guard — phiên đã đóng, không close lại được |
| 422 | `VALIDATION_FAILED` | Thiếu/sai trường bắt buộc (kèm `errors[]`) |
| 500 | `SYSTEM_INTERNAL_ERROR` | Lỗi server |

---

## 21. Luồng tích hợp FE

```
Đầu ngày (Thủ quỹ mở ca):
1. GET  /session          ← kiểm tra phiên: isOpen = false → chưa mở
2. POST /session/open     ← mở phiên, truyền openingCashLak + openingBankLak → nhận CashSessionDto
   (hoặc POST /opening-balance nếu không dùng luồng phiên session)

Trong ngày:
3. GET  /session          ← kiểm tra isOpen khi load trang
4. GET  /daily            ← widget tổng hợp: openingBalanceLak, totalInLak, totalOutLak, closingBalanceLak
5. GET  /activities       ← danh sách bút toán (tab "Sổ quỹ"), hỗ trợ filter currency/method
   GET  /activities/{id}  ← xem chi tiết một bút toán
   GET  /activities/export ← xuất Excel cùng bộ lọc
6. GET  /voucher-reasons  ← populate dropdown lý do khi lập phiếu
   POST /vouchers         ← lập phiếu thu/chi chính thức (có reasonCode)
   POST /manual-entry     ← ghi nhanh không cần lý do
7. GET  /vouchers         ← tab "Phiếu thủ công" (chỉ PTTT/PCTT tay, không có POS)

Cuối ngày (Chốt phiên / bàn giao):
8. GET  /cash-count       ← load bảng kê mệnh giá hiện có
9. PUT  /cash-count       ← lưu nháp số lượng từng mệnh giá (lưu nhiều lần được)
10. POST /session/close   ← chốt phiên → nhận CloseSessionResult { handoverCode, difference }
    Điền actualAmountLak  = Σ (denomination × quantity) của các mệnh giá LAK
    Điền expectedAmountLak = GET /daily → closingBalanceLak
    (hoặc POST /handover nếu không dùng luồng phiên session)
```

> **Khác biệt `/session/close` vs `/handover`**: Cả hai đều chốt cuối ca và sinh `handoverCode`. Dùng `/session/close` khi đã mở phiên bằng `/session/open` (quản lý phiên rõ ràng hơn). Dùng `/handover` cho luồng cũ không có phiên session.

---

## Breaking Changes

> Dành cho FE đang dùng phiên bản API cũ.

| Thay đổi | Cũ | Mới |
|---|---|---|
| `GET /daily` response | Trả `entries[]`, `openingCashLak`, `openingBankLak` | Chỉ trả 4 chỉ số tổng; `openingCashLak + openingBankLak` gộp thành `openingBalanceLak` |
| `GET /activities` response | Chỉ 7 field cơ bản | Thêm `currency`, `method`, `amountLak`, `originalAmount`, `description`, `referenceInvoiceCode`, `entryType`, `source`, `customerName`, `cashAmountLak`, `bankAmountLak`, `note`; thêm summary totals ở root |
| `GET /activities` query | Không có filter `currency`, `method` | Thêm filter `currency` và `method` |
| `POST /manual-entry` response | `id`, `entryCode`, `description`, `direction`, `method`, `amountLak`, `createdAt` | Thêm `counterId`, `currency`, `originalAmount`, `exchangeRate` |
| `handoverCode` format (`POST /handover`) | `BGQ-yyyyMMdd-XXXXXX` | `HO-yyyyMMdd-XXXXX` |
| Mã phiếu `manual-entry` | `TC-yyyyMMdd-XXXXXX` | `PTTT…` / `PCTT…` (sequence) |
| Endpoint mới (v2) | — | `GET/POST /vouchers`, `GET /vouchers/{id}`, `GET /voucher-reasons`, `GET /activities/{id}` |
| Endpoint mới (v3) | — | `GET /activities/export`, `GET /session`, `POST /session/open`, `POST /session/close` |