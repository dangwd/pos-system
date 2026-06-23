# Yêu cầu BE — Bổ sung Khối lượng (gram) cho Nhập/Xuất trong Báo cáo tồn kho theo kỳ

**Ngày:** 2026-06-23
**Người yêu cầu:** FE team
**Mức độ:** Bổ sung trường (non-breaking — chỉ thêm field)
**Endpoint ảnh hưởng:** `GET /api/stock/period-report` và `GET /api/stock/period-report/export`

---

## 1. Bối cảnh & vấn đề

Màn **Báo cáo nhập xuất tồn** (`/admin/reports/inventory`) hiển thị 4 mốc: Đầu kỳ → Nhập → Xuất → Cuối kỳ.

Hiện response trả về khối lượng (gram) cho **Đầu kỳ** và **Cuối kỳ** (`openWeight`, `closeWeight`) nhưng **KHÔNG** trả khối lượng cho phần phát sinh **Nhập** và **Xuất** trong kỳ. Do đó FE chỉ hiển thị được **số lượng (SL)** ở 2 cột Nhập/Xuất, không hiển thị được gram.

> Khối lượng từng chứng từ đã có sẵn ở `GET /api/stock/period-report/movements` (`StockMovementLine.weightGram`), nên việc cộng dồn theo chiều Nhập/Xuất là khả thi từ dữ liệu hiện có.

---

## 2. Yêu cầu thay đổi

Thêm **2 trường khối lượng** vào response, ở **cả `summary` lẫn từng phần tử `items[]`**:

| Trường mới | Kiểu | Ý nghĩa |
|---|---|---|
| `receiptWeight` | number (gram) | Tổng khối lượng **NHẬP** trong kỳ |
| `issueWeight` | number (gram) | Tổng khối lượng **XUẤT** trong kỳ |

- Đơn vị: **gram**, cho phép thập phân (vd `3.75`) — đồng nhất với `weightGram` ở endpoint `movements`.
- Không có phát sinh → trả `0` (không trả `null`).

### Công thức (định nghĩa rõ để BE tự kiểm)

Với mỗi (productId, branchId) trong khoảng `[fromDate, toDate]`:

```
receiptWeight = Σ weightGram của các movement direction = IN
issueWeight   = Σ weightGram của các movement direction = OUT
```

### Bất biến cần đảm bảo (để FE/QA đối soát)

```
closeWeight = openWeight + receiptWeight − issueWeight
midWeight   = receiptWeight − issueWeight        // nếu midWeight đang mang nghĩa "biến động ròng trong kỳ"
```

> ⚠️ Nhờ BE xác nhận lại ý nghĩa của `midWeight`/`midQty` đang trả: nếu là "phát sinh ròng trong kỳ" thì 2 bất biến trên phải đúng. Nếu `midWeight` mang nghĩa khác, ghi chú lại để FE map đúng.

---

## 3. Cấu trúc response sau khi sửa

### 3.1. `summary`

```jsonc
{
  "summary": {
    "openQty": 0,      "openWeight": 0,
    "receiptQty": 3506.3,
    "receiptWeight": 0,        // ⬅️ MỚI — tổng KL nhập trong kỳ
    "issueQty": 41.75,
    "issueWeight": 0,          // ⬅️ MỚI — tổng KL xuất trong kỳ
    "midQty": 0,       "midWeight": 0,
    "closeQty": 3464.55, "closeWeight": 6381.13
  }
}
```

### 3.2. `items[]` — mỗi dòng sản phẩm

```jsonc
{
  "productId": "6209ed4c-0c84-4275-91bc-ef98cf2159e5",
  "productCode": "aaaaa",
  "productName": "aaaaa",
  "category": "Bac",
  "karat": "585",
  "unit": "chi",
  "branchId": "bb5a8354-14c8-4a01-a0ae-ca79d60229e1",
  "branchName": "Vientiane Main",
  "source": "Ngoai",

  "openQty": 0,      "openWeight": 0,
  "receiptQty": 1,
  "receiptWeight": 3.75,     // ⬅️ MỚI
  "issueQty": 0,
  "issueWeight": 0,          // ⬅️ MỚI
  "midQty": 0,       "midWeight": 0,
  "closeQty": 1,     "closeWeight": 3.75
}
```

---

## 4. Export Excel

`GET /api/stock/period-report/export` phải bổ sung **2 cột khối lượng** tương ứng cho nhóm "Trong kỳ" (Nhập KL, Xuất KL), khớp thứ tự với bảng trên UI.

---

## 5. Hợp đồng TypeScript phía FE (để đối chiếu)

FE sẽ cập nhật type tại `src/types/report.ts`:

```ts
export interface StockPeriodSummary {
  openQty: number;    openWeight: number;
  receiptQty: number; receiptWeight: number;   // MỚI
  issueQty: number;   issueWeight: number;      // MỚI
  midQty: number;     midWeight: number;
  closeQty: number;   closeWeight: number;
}

export interface StockPeriodItem {
  productId: string;  productCode: string; productName: string;
  category: string;   karat: string;       unit: string;
  branchId: string;   branchName: string;  source: string;
  openQty: number;    openWeight: number;
  receiptQty: number; receiptWeight: number;    // MỚI
  issueQty: number;   issueWeight: number;       // MỚI
  midQty: number;     midWeight: number;
  closeQty: number;   closeWeight: number;
}
```

---

## 6. Tiêu chí nghiệm thu (Acceptance Criteria)

1. Response của `period-report` chứa `receiptWeight`, `issueWeight` ở `summary` và mọi phần tử `items[]`.
2. Giá trị `receiptWeight`/`issueWeight` của 1 dòng = đúng tổng `weightGram` các movement IN/OUT tương ứng từ `period-report/movements` (cùng filter productId/branchId/kỳ).
3. Bất biến `closeWeight = openWeight + receiptWeight − issueWeight` đúng cho mọi dòng và cho `summary`.
4. `summary.receiptWeight` = Σ `items[].receiptWeight`; tương tự cho `issueWeight`.
5. Không phát sinh → field trả `0`, không phải `null`.
6. File export Excel có thêm 2 cột KL Nhập/Xuất.
7. Áp dụng đầy đủ các filter hiện có (`branchId`, `categoryId`, `karat`, `search`) — KL phải tính theo tập đã lọc.

---

## 7. Ghi chú phạm vi

- Đây là thay đổi **chỉ-thêm-field**, không đổi tên/kiểu field cũ → không phá vỡ FE hiện tại.
- Không yêu cầu thay đổi `period-report/movements` (đã có `weightGram`).
- Sau khi BE xong, FE sẽ thêm hiển thị KL (g) cho 2 cột Nhập/Xuất trong `StockPeriodTable.tsx`.
