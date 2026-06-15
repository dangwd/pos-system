# API — Sổ Quỹ (Cash Ledger)

> Base path: `/api/cash-ledger`  
> Auth: **Bearer JWT** — tất cả endpoint yêu cầu policy `CashLedgerManage` (role: `ThuQuy`, `Manager`, `SystemAdmin`)

---

## Mục lục

1. [GET /daily — Xem sổ quỹ ngày](#1-get-daily--xem-sổ-quỹ-ngày)
2. [POST /opening-balance — Ghi số dư đầu ca](#2-post-opening-balance--ghi-số-dư-đầu-ca)
3. [POST /manual-entry — Tạo thu/chi thủ công](#3-post-manual-entry--tạo-thuχi-thủ-công)
4. [GET /activities — Danh sách hoạt động sổ quỹ](#4-get-activities--danh-sách-hoạt-động-sổ-quỹ)
5. [GET /cash-count — Lấy bảng kê đếm tiền](#5-get-cash-count--lấy-bảng-kê-đếm-tiền)
6. [PUT /cash-count — Lưu bảng kê đếm tiền](#6-put-cash-count--lưu-bảng-kê-đếm-tiền)
7. [POST /handover — Chốt bàn giao ca](#7-post-handover--chốt-bàn-giao-ca)
8. [Enum & Hằng số](#8-enum--hằng-số)
9. [Mã lỗi](#9-mã-lỗi)

---

## 1. GET /daily — Xem sổ quỹ ngày

Trả về toàn bộ sổ quỹ của một ngày: số dư đầu ca, danh sách các bút toán (giao dịch POS + thu/chi thủ công), và số dư dự kiến cuối ca.

### Query params

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | ID chi nhánh |
| `counterId` | `uuid` | ❌ | Lọc theo quầy cụ thể. Nếu bỏ qua → lấy toàn chi nhánh |
| `date` | `date` (`yyyy-MM-dd`) | ❌ | Mặc định: hôm nay (UTC) |

### Response `200 OK`

```json
{
  "date": "2026-06-14",
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "branchName": "Chi nhánh Vientiane",
  "openingCashLak": 5000000,
  "openingBankLak": 20000000,
  "openingBalanceId": "3fa85f64-...",
  "entries": [
    {
      "id": "3fa85f64-...",
      "sortAt": "2026-06-14T08:30:00Z",
      "timeLabel": "15:30:00",
      "description": "[HD001] Doanh thu bán vàng: Nhẫn vàng 24K (2 cái) - Khách Nguyễn Văn A",
      "method": "CASH",
      "amountLak": 12500000,
      "sign": 1,
      "source": "Transaction",
      "entryType": "SellGold"
    },
    {
      "id": "tc-abc123",
      "sortAt": "2026-06-14T09:00:00Z",
      "timeLabel": "16:00:00",
      "description": "Chi phí vận chuyển",
      "method": "CASH",
      "amountLak": 500000,
      "sign": -1,
      "source": "Manual",
      "entryType": "OUT"
    }
  ],
  "totalEntries": 2,
  "expectedCashClosingLak": 17000000,
  "expectedBankClosingLak": 20000000
}
```

**Giải thích fields:**

| Field | Mô tả |
|---|---|
| `openingCashLak` | Số dư tiền mặt đầu ca (LAK) |
| `openingBankLak` | Số dư ngân hàng/chuyển khoản đầu ca (LAK) |
| `openingBalanceId` | `null` nếu chưa thiết lập số dư đầu ca |
| `entries[].sign` | `+1` = thu vào, `-1` = chi ra |
| `entries[].method` | `CASH` hoặc `BANK` |
| `entries[].source` | `Transaction` (từ POS) hoặc `Manual` (nhập tay) |
| `entries[].entryType` | Xem bảng [EntryType](#entrytype) |
| `entries[].timeLabel` | Giờ hiển thị theo giờ địa phương (`HH:mm:ss`) |
| `expectedCashClosingLak` | = `openingCashLak` + tổng bút toán CASH |
| `expectedBankClosingLak` | = `openingBankLak` + tổng bút toán BANK |

---

## 2. POST /opening-balance — Ghi số dư đầu ca

Thiết lập (hoặc cập nhật) số dư tiền mặt và ngân hàng đầu ca cho một ngày. Có thể gọi nhiều lần — lần sau ghi đè lần trước (upsert).

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-14",
  "cashAmountLak": 5000000,
  "bankAmountLak": 20000000
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | Nếu null → thiết lập cho toàn chi nhánh |
| `date` | `date` | ✅ | Ngày áp dụng |
| `cashAmountLak` | `decimal` | ✅ | Tiền mặt tồn đầu ca (LAK) |
| `bankAmountLak` | `decimal` | ✅ | Số dư ngân hàng đầu ca (LAK) |

### Response `200 OK`

```json
{ "message": "OK" }
```

---

## 3. POST /manual-entry — Tạo thu/chi thủ công

Ghi một khoản thu hoặc chi thủ công vào sổ quỹ (ví dụ: chi phí vận chuyển, thu tiền đặt cọc).

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "description": "Chi phí vận chuyển hàng",
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
| `exchangeRate` | `decimal` | ✅ | Tỷ giá quy LAK. Nếu `currency = LAK` thì truyền `1` |

> `amountLak` = `originalAmount × exchangeRate` — tính tự động phía backend.

### Response `200 OK`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "entryCode": "TC-20260614-A1B2C3",
  "counterId": null,
  "description": "Chi phí vận chuyển hàng",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 500000,
  "exchangeRate": 1,
  "amountLak": 500000,
  "createdAt": "2026-06-14T08:30:00Z"
}
```

| Field | Mô tả |
|---|---|
| `entryCode` | Mã bút toán tự sinh, format `TC-yyyyMMdd-XXXXXX` |
| `amountLak` | Số tiền đã quy đổi về LAK |

---

## 4. GET /activities — Danh sách hoạt động sổ quỹ

Lấy danh sách các bút toán thu/chi (có phân trang), hỗ trợ lọc theo chi nhánh, quầy, khoảng ngày và từ khóa.

### Query params

| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `branchId` | `uuid` | ❌ | — | Lọc theo chi nhánh |
| `counterId` | `uuid` | ❌ | — | Lọc theo quầy |
| `fromDate` | `date` | ❌ | Hôm nay | Ngày bắt đầu |
| `toDate` | `date` | ❌ | Hôm nay | Ngày kết thúc |
| `keyword` | `string` | ❌ | — | Tìm theo nội dung `description` |
| `page` | `int` | ❌ | `1` | Trang hiện tại |
| `pageSize` | `int` | ❌ | `20` | Số bản ghi mỗi trang |

### Response `200 OK`

```json
{
  "entries": [
    {
      "id": "...",
      "sortAt": "2026-06-14T08:30:00Z",
      "timeLabel": "15:30:00",
      "description": "Chi phí vận chuyển hàng",
      "method": "CASH",
      "amountLak": 500000,
      "sign": -1,
      "source": "Manual",
      "entryType": "OUT"
    }
  ],
  "totalCount": 45,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

> Danh sách sắp xếp giảm dần theo thời gian (`sortAt DESC`).

---

## 5. GET /cash-count — Lấy bảng kê đếm tiền

Trả về bảng kê đếm tiền mặt theo mệnh giá cho một ngày. Nếu chưa có bản ghi → trả về danh sách mệnh giá mặc định với `quantity = 0`.

### Query params

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid` | ❌ | |
| `date` | `date` | ❌ | Mặc định: hôm nay |

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
| `handoverCode` | `null` nếu chưa chốt. Sau chốt: format `BGQ-yyyyMMdd-XXXXXX` |
| `countedByName` | Tên người đếm tiền |
| `items[].denomination` | Mệnh giá (nguyên) |
| `items[].quantity` | Số tờ/đồng |

**Mệnh giá mặc định** (khi chưa có bản ghi):

| Tiền tệ | Mệnh giá |
|---|---|
| LAK | 100,000 · 50,000 · 20,000 · 10,000 · 5,000 · 2,000 |
| THB | 1,000 · 500 |
| USD | 100 · 50 |

---

## 6. PUT /cash-count — Lưu bảng kê đếm tiền

Lưu (upsert) bảng kê đếm tiền. Có thể gọi nhiều lần để cập nhật số lượng từng mệnh giá trước khi chốt.

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-14",
  "countedByName": "Nguyễn Thị B",
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
| `date` | `date` | ✅ | |
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

## 7. POST /handover — Chốt bàn giao ca

Tổng kết và chốt bàn giao ca làm việc. Thao tác này **không thể hoàn tác** — sau khi chốt, bảng kê đếm tiền sẽ chuyển sang `isFinalized = true`.

Backend tự động:
- Tính chênh lệch `actualAmountLak − expectedAmountLak`
- Ghi bút toán đối chiếu vào sổ quỹ (loại `BALANCED` / `SURPLUS` / `DEFICIT`)
- Sinh `handoverCode` định danh biên bản bàn giao

### Request body

```json
{
  "branchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterId": null,
  "date": "2026-06-14",
  "countedByName": "Nguyễn Thị B",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 5 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 10 },
    { "currency": "THB", "denomination": 1000,   "quantity": 2 },
    { "currency": "USD", "denomination": 100,    "quantity": 1 }
  ],
  "actualAmountLak": 17500000,
  "expectedAmountLak": 17000000
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `uuid` | ✅ | |
| `counterId` | `uuid\|null` | ❌ | |
| `date` | `date` | ✅ | |
| `countedByName` | `string` | ✅ | Tên người bàn giao |
| `items` | `CashCountItem[]` | ✅ | Bảng kê mệnh giá (giống PUT /cash-count) |
| `actualAmountLak` | `decimal` | ✅ | Tổng tiền mặt thực tế đếm được (LAK) |
| `expectedAmountLak` | `decimal` | ✅ | Tổng tiền mặt dự kiến từ sổ quỹ (LAK) — lấy từ `DailyLedgerDto.expectedCashClosingLak` |

> **Gợi ý FE**: `expectedAmountLak` nên lấy từ `GET /daily` → `expectedCashClosingLak`. `actualAmountLak` tính từ tổng `Σ (denomination × quantity)` của tất cả mệnh giá LAK trong `items`.

### Response `200 OK`

```json
{ "handoverCode": "BGQ-20260614-A1B2C3" }
```

| Field | Mô tả |
|---|---|
| `handoverCode` | Mã biên bản bàn giao, format `BGQ-yyyyMMdd-XXXXXX` |

---

## 8. Enum & Hằng số

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

### `currency`

| Giá trị | Ý nghĩa |
|---|---|
| `"LAK"` | Kip Lào |
| `"THB"` | Baht Thái |
| `"USD"` | Đô la Mỹ |

### `entryType`

| Giá trị | Nguồn | Ý nghĩa |
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

---

## 9. Mã lỗi

| HTTP | `errorCode` | Tình huống |
|---|---|---|
| 404 | `BRANCH_NOT_FOUND` | `branchId` không tồn tại |
| 401 | `AUTH_TOKEN_EXPIRED` | Token hết hạn |
| 403 | `AUTH_FORBIDDEN` | Không đủ quyền (`CashLedgerManage`) |
| 422 | `VALIDATION_FAILED` | Thiếu/sai trường bắt buộc |
| 500 | `SYSTEM_INTERNAL_ERROR` | Lỗi server |

---

## Luồng tích hợp FE gợi ý

```
Đầu ca (Thủ quỹ mở ca):
1. POST /opening-balance  ← nhập số dư đầu ca

Trong ngày:
2. GET  /daily             ← hiển thị sổ quỹ real-time
3. POST /manual-entry      ← ghi thu/chi phát sinh
4. GET  /activities        ← tra cứu lịch sử (tab riêng)

Cuối ca (Chốt bàn giao):
5. GET  /cash-count        ← load bảng kê đếm tiền
6. PUT  /cash-count        ← lưu nháp số lượng mệnh giá
7. POST /handover          ← chốt chính thức → nhận handoverCode
```