# API Tài liệu — Module Reports (`/api/reports`)

> **Base URL**: `/api/reports`  
> **Phiên bản**: v1  
> **Ngày cập nhật**: 2026-06-10

---

## Tổng quan

Module Reports cung cấp dữ liệu tổng hợp cho dashboard quản lý và báo cáo doanh thu hàng ngày.

**Phân quyền**:

| Endpoint | Quyền cần có |
|---|---|
| `GET /dashboard` | `REPORT_DASHBOARD` |
| `GET /daily` | `REPORT_DAILY` |

---

## Endpoints

### 1. Dữ liệu Dashboard

```
GET /api/reports/dashboard
```

**Quyền**: `REPORT_DASHBOARD`

Tổng hợp doanh thu, lãi/lỗ, số giao dịch theo khoảng thời gian. Dùng cho màn hình tổng quan quản lý.

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `from` | `DateTime` | Không | Từ ngày (ISO 8601). Mặc định: đầu tháng hiện tại |
| `to` | `DateTime` | Không | Đến ngày (ISO 8601). Mặc định: hiện tại |

#### Response — 200 OK

Cấu trúc response phụ thuộc vào `GetDashboardQuery` handler — bao gồm các nhóm dữ liệu sau (tham khảo handler để biết schema chính xác):

```json
{
  "totalRevenue": 15000000000,
  "totalTransactions": 45,
  "revenueByType": {
    "SellGold": 12000000000,
    "SellSilver": 1500000000,
    "BuyGold": 800000000,
    "ExchangeGold": 500000000,
    "ExchangeCurrency": 200000000
  },
  "dailyRevenue": [
    { "date": "2026-06-01", "amount": 500000000 },
    { "date": "2026-06-02", "amount": 700000000 }
  ],
  "topProducts": [ ... ],
  "profitLoss": { ... }
}
```

---

### 2. Báo cáo ngày

```
GET /api/reports/daily
```

**Quyền**: `REPORT_DAILY`

Báo cáo chi tiết doanh thu và dòng tiền của một chi nhánh trong một ngày cụ thể.

#### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `branchId` | `GUID` | Có | Chi nhánh cần báo cáo |
| `date` | `DateOnly` | Không | Ngày `YYYY-MM-DD` (mặc định: hôm nay) |

#### Response — 200 OK

Cấu trúc response phụ thuộc vào `GetDailyReportQuery` handler — bao gồm:

```json
{
  "date": "2026-06-10",
  "branchId": "7c9e6679-...",
  "branchName": "Chi nhánh Vientiane Center",
  "totalRevenue": 1850000000,
  "totalTransactions": 8,
  "byType": {
    "SellGold":        { "count": 5, "revenue": 1500000000 },
    "SellSilver":      { "count": 2, "revenue": 300000000 },
    "BuyGold":         { "count": 1, "revenue": 50000000 },
    "ExchangeGold":    { "count": 0, "revenue": 0 },
    "ExchangeCurrency":{ "count": 0, "revenue": 0 }
  },
  "cashFlow": {
    "openingCash": 50000000,
    "totalInflow": 1850000000,
    "totalOutflow": 50000000,
    "expectedClosing": 1850000000
  },
  "transactions": [ /* TransactionListItemDto[] trong ngày */ ]
}
```

---

## Tóm tắt Endpoints

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| `GET` | `/api/reports/dashboard` | Dashboard tổng hợp theo khoảng thời gian | `REPORT_DASHBOARD` |
| `GET` | `/api/reports/daily` | Báo cáo ngày theo chi nhánh | `REPORT_DAILY` |

---

## Ghi chú

- Response schema chính xác của hai endpoint này phụ thuộc hoàn toàn vào handler `GetDashboardQueryHandler` và `GetDailyReportQueryHandler` trong `Application/Features/Reports/`. Tham khảo file handler để biết cấu trúc đầy đủ nếu cần tích hợp chi tiết.
- Các endpoint Reports **chỉ đọc** — không có side effect.
- Nên thêm cache Redis cho `dashboard` nếu khoảng thời gian truy vấn lớn (> 7 ngày).
