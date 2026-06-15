# API Tài liệu — Module Cash Ledger (`/api/cash-ledger`)

> **Base URL**: `/api/cash-ledger`  
> **Phiên bản**: v1  
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Cash Ledger quản lý sổ quỹ hàng ngày: số dư đầu ngày, dòng tiền vào/ra, kiểm đếm tiền mặt cuối ngày và bàn giao quỹ.

**Phân quyền**: Toàn controller yêu cầu `CASH_LEDGER_MANAGE` — chỉ **ThuQuy** và **Manager/SystemAdmin** được cấp.

---

## Schema

### DailyLedgerEntry Object

```json
{
  "id": "entry-001",
  "sortAt": "2026-06-10T09:00:00Z",
  "timeLabel": "09:00",
  "description": "Bán Vàng — INV-20260610-001",
  "method": "CASH",
  "amountLak": 1850000000,
  "sign": 1,
  "source": "Transaction",
  "entryType": "SellGold"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `method` | `string` | Phương thức: `CASH` (tiền mặt) hoặc `BANK` (chuyển khoản) |
| `amountLak` | `decimal` | Số tiền quy đổi về LAK |
| `sign` | `int` | `+1` = tiền vào quỹ; `-1` = tiền ra khỏi quỹ |
| `source` | `string` | `Transaction` (từ giao dịch POS) hoặc `Manual` (nhập tay) |
| `entryType` | `string` | Loại: `SellGold`, `BuyGold`, `IN`, `OUT`, ... |

### DailyLedger Object

```json
{
  "date": "2026-06-10",
  "branchId": "7c9e6679-...",
  "branchName": "Chi nhánh Vientiane Center",
  "openingCashLak": 50000000,
  "openingBankLak": 200000000,
  "openingBalanceId": "ob-uuid-xxxx",
  "entries": [ /* DailyLedgerEntry[] */ ],
  "totalEntries": 12,
  "expectedCashClosingLak": 1900000000,
  "expectedBankClosingLak": 200000000
}
```

### CashCountItem Object

```json
{
  "currency": "LAK",
  "denomination": 100000,
  "quantity": 50
}
```

### ManualEntry Object

```json
{
  "id": "manual-uuid-xxxx",
  "entryCode": "MAN-20260610-001",
  "description": "Thu tiền thuê mặt bằng",
  "direction": "IN",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 5000000,
  "exchangeRate": 1.0,
  "amountLak": 5000000,
  "createdAt": "2026-06-10T10:00:00Z"
}
```

---

## Endpoints

### 1. Sổ quỹ ngày

```
GET /api/cash-ledger/daily
```

Lấy toàn bộ dòng tiền trong ngày của một chi nhánh: số dư đầu ngày + tất cả entries + số dư dự kiến cuối ngày.

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Có | Chi nhánh cần xem |
| `date` | `DateOnly` | Không | Ngày cần xem `YYYY-MM-DD` (mặc định: hôm nay) |

#### Response — 200 OK

Trả về DailyLedger Object.

---

### 2. Thiết lập số dư đầu ngày

```
POST /api/cash-ledger/opening-balance
```

Thủ quỹ nhập số dư tiền mặt và tiền ngân hàng đầu ngày làm việc.

#### Request Body

```json
{
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "date": "2026-06-10",
  "cashAmountLak": 50000000,
  "bankAmountLak": 200000000
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Có | Chi nhánh |
| `date` | `DateOnly` | Có | Ngày thiết lập `YYYY-MM-DD` |
| `cashAmountLak` | `decimal` | Có | Tiền mặt đầu ngày (LAK) |
| `bankAmountLak` | `decimal` | Có | Số dư ngân hàng đầu ngày (LAK) |

#### Response — 200 OK

```json
{ "message": "OK" }
```

---

### 3. Tạo bút toán thu/chi thủ công

```
POST /api/cash-ledger/manual-entry
```

Ghi các khoản thu/chi không phát sinh từ giao dịch POS (thuê mặt bằng, chi phí vận hành, v.v.).

#### Request Body

```json
{
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "description": "Chi phí vận chuyển",
  "direction": "OUT",
  "method": "CASH",
  "currency": "LAK",
  "originalAmount": 500000,
  "exchangeRate": 1.0
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Có | Chi nhánh |
| `description` | `string` | Có | Mô tả khoản thu/chi |
| `direction` | `string` | Có | `IN` (thu) hoặc `OUT` (chi) |
| `method` | `string` | Có | `CASH` hoặc `BANK` |
| `currency` | `string` | Có | `LAK`, `THB`, `USD` |
| `originalAmount` | `decimal` | Có | Số tiền gốc theo đơn vị `currency` |
| `exchangeRate` | `decimal` | Có | Tỷ giá quy về LAK (`1.0` nếu currency là LAK) |

> `amountLak = originalAmount × exchangeRate` — tính tự động phía backend.

#### Response — 200 OK

Trả về ManualEntry Object vừa tạo.

---

### 4. Lấy phiếu kiểm đếm tiền mặt

```
GET /api/cash-ledger/cash-count
```

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Có | Chi nhánh |
| `date` | `DateOnly` | Không | Ngày `YYYY-MM-DD` (mặc định: hôm nay) |

#### Response — 200 OK

```json
{
  "id": "sheet-uuid",
  "isFinalized": false,
  "handoverCode": null,
  "countedByName": "Trần Thị Thủ Quỹ",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 50 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 20 },
    { "currency": "THB", "denomination": 1000,   "quantity": 10 }
  ]
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `isFinalized` | `bool` | Đã chốt bàn giao chưa |
| `handoverCode` | `string \| null` | Mã bàn giao (có giá trị sau khi finalize) |

---

### 5. Lưu phiếu kiểm đếm tiền mặt

```
PUT /api/cash-ledger/cash-count
```

Lưu kết quả kiểm đếm (chưa chốt, có thể lưu nhiều lần).

#### Request Body

```json
{
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "date": "2026-06-10",
  "countedByName": "Trần Thị Thủ Quỹ",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 50 },
    { "currency": "LAK", "denomination": 50000,  "quantity": 20 }
  ]
}
```

#### Response — 200 OK

```json
{ "id": "sheet-uuid-xxxx" }
```

---

### 6. Chốt bàn giao quỹ cuối ngày

```
POST /api/cash-ledger/handover
```

Chốt kết quả kiểm đếm và tạo phiếu bàn giao. Sau khi gọi endpoint này, phiếu được đánh dấu `isFinalized = true`.

#### Request Body

```json
{
  "branchId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "date": "2026-06-10",
  "countedByName": "Trần Thị Thủ Quỹ",
  "items": [
    { "currency": "LAK", "denomination": 100000, "quantity": 50 }
  ],
  "actualAmountLak": 5000000,
  "expectedAmountLak": 4950000
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `actualAmountLak` | `decimal` | Có | Tổng tiền mặt đếm thực tế (LAK) |
| `expectedAmountLak` | `decimal` | Có | Tổng tiền mặt dự kiến theo sổ quỹ (LAK) |

> Chênh lệch `actualAmountLak - expectedAmountLak` được ghi nhận vào phiếu bàn giao.

#### Response — 200 OK

```json
{ "handoverCode": "HO-20260610-VTE-001" }
```

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Response |
|---|---|---|---|
| `GET` | `/api/cash-ledger/daily` | Sổ quỹ ngày | `200` DailyLedger |
| `POST` | `/api/cash-ledger/opening-balance` | Thiết lập số dư đầu ngày | `200` `{message}` |
| `POST` | `/api/cash-ledger/manual-entry` | Bút toán thu/chi thủ công | `200` ManualEntry |
| `GET` | `/api/cash-ledger/cash-count` | Lấy phiếu kiểm đếm | `200` CashCountSheet |
| `PUT` | `/api/cash-ledger/cash-count` | Lưu phiếu kiểm đếm | `200` `{id}` |
| `POST` | `/api/cash-ledger/handover` | Chốt bàn giao quỹ | `200` `{handoverCode}` |

---

## Quy trình thường ngày của Thủ quỹ

```
Sáng:  POST /opening-balance   ← nhập số dư đầu ngày
       ...giao dịch trong ngày tự động đổ vào sổ...
Chiều: PUT  /cash-count        ← kiểm đếm tiền thực tế (có thể lưu nhiều lần)
       POST /handover          ← chốt + tạo phiếu bàn giao
```
