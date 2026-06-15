# API — Thu Đổi Vàng Cũ (Trade-in)

> Tài liệu dành cho frontend ghép API module Thu Đổi Vàng Cũ.  
> Base URL: `/api/trade` · Auth: `Bearer <access_token>` (mọi endpoint đều yêu cầu)

---

## Tổng quan Nghiệp Vụ

Có **4 loại** thu đổi vàng, mỗi loại khác nhau về điều kiện, công thức tính và màn hình UI:

| `Loai` (enum string) | Mã phiếu | Mô tả ngắn |
|---|---|---|
| `DoiHang` | `DH-YYYYMMDD-XXXXXXXX` | Đổi sang hàng khác — tính phí hủy hoại, hao hụt, tiền công |
| `MuaThem` | `MT-YYYYMMDD-XXXXXXXX` | Mua thêm vàng quán — giống DoiHang, tên gọi khác |
| `DoiMienPhi` | `MP-YYYYMMDD-XXXXXXXX` | Đổi miễn phí — trong 31 ngày, cùng giá trị, không phát sinh phí |
| `DoiThanhTien` | `DT-YYYYMMDD-XXXXXXXX` | Đổi ra tiền mặt — định giá theo giá **mua vào**, chi tiền cho khách |

> **Điều kiện bắt buộc cho hàng cũ (ItemCu)**: phải là vàng của quán (`NguonGoc = "Quan"`)  
> **Điều kiện bắt buộc cho hàng mới (ItemMoi)**: phải đang ở trạng thái `TrenQuay`

---

## Công thức Tính Giá

### 1. DoiHang / MuaThem

```
TienHaoHut = (HaoHutGram / gramPerChi) × GiaBanPerChi
ChenhLech   = (GiaTriMoi + TienDaMoi + TienCong + PhiHuHai + TienHaoHut) − GiaTriCu

GiaTriCu  = (ItemCu.WeightGram  / gramPerChi) × GiaBanPerChi
GiaTriMoi = (ItemMoi.WeightGram / gramPerChi) × GiaBanPerChi
```

- `ChenhLech > 0` → khách **trả thêm** tiền
- `ChenhLech < 0` → cửa hàng **hoàn tiền** cho khách
- `GiaBanPerChi` lấy từ bảng giá hiện tại (`price_configs`), theo độ tuổi vàng (`Purity`) của ItemCu

### 2. DoiMienPhi

```
GiaTriCu  = (ItemCu.WeightGram  / gramPerChi) × GiaBanPerChi
GiaTriMoi = (ItemMoi.WeightGram / gramPerChi) × GiaBanPerChi

Điều kiện: |GiaTriCu - GiaTriMoi| ≤ 1% × GiaTriCu
```

- Mọi khoản phí = 0 (PhiHuHai, TienHaoHut, TienCong, ChenhLech đều = 0)
- Backend tự kiểm tra — FE không cần gửi các khoản phí này

### 3. DoiThanhTien

```
SoChi        = ItemCu.WeightGram / gramPerChi
TienKhachNhan = SoChi × GiaMuaPerChi − TienDaCu − TienCong − PhiHuHai

ChenhLech (lưu DB) = −TienKhachNhan  (âm vì cửa hàng chi ra)
```

- `GiaMuaPerChi` lấy theo `BuyPrice` trong bảng giá (thấp hơn `SellPrice`)
- `TienDaCu` = `ItemCu.TienDa` (tiền đá đính kèm trên sản phẩm cũ, tự động trừ đi)
- `ItemMoiId` là **tùy chọn** — khách có thể chỉ đổi ra tiền, không lấy hàng mới

### Hệ số quy đổi

- `gramPerChi = 3.75g` (mặc định, cấu hình qua `/api/config/weight-units/chi`)
- `1 Lượng = 10 Chỉ = 37.5g`
- `1 Cây = 100 Chỉ = 375g`

---

## Endpoints

### POST `/api/trade` — Tạo giao dịch thu đổi

**Permission**: `TradeCreate` (Cashier trở lên)

**Request Body**:

```json
{
  "loai": "DoiHang",
  "branchId": "uuid",
  "employeeId": "uuid",
  "itemCuId": "uuid",
  "itemMoiId": "uuid | null",
  "phiHuHai": 50000,
  "haoHutGram": 0.05,
  "tienCong": 100000,
  "customerId": "uuid | null",
  "ngayMuaCu": "2026-05-20T00:00:00Z | null",
  "note": "Ghi chú | null"
}
```

**Quy tắc field theo từng loại**:

| Field | `DoiHang` | `MuaThem` | `DoiMienPhi` | `DoiThanhTien` |
|---|---|---|---|---|
| `itemMoiId` | **Bắt buộc** | **Bắt buộc** | **Bắt buộc** | Tùy chọn |
| `ngayMuaCu` | Không cần | Không cần | **Bắt buộc** | Không cần |
| `phiHuHai` | Tùy chọn (≥0) | Tùy chọn (≥0) | Bỏ qua | Tùy chọn (≥0) |
| `haoHutGram` | Tùy chọn (≥0) | Tùy chọn (≥0) | Bỏ qua | Bỏ qua |
| `tienCong` | Tùy chọn (≥0) | Tùy chọn (≥0) | Bỏ qua | Tùy chọn (≥0) |

**Response 200 — `TradeTxnResponse`**:

```json
{
  "id": "uuid",
  "txnCode": "DH-20260615-3A2F1B9C",
  "loai": "DoiHang",
  "branchId": "uuid",
  "employeeId": "uuid",
  "customerId": "uuid | null",
  "itemCuId": "uuid",
  "itemCuName": "Nhẫn vàng 24K",
  "itemCuWeightGram": 7.5,
  "itemMoiId": "uuid | null",
  "itemMoiName": "Dây chuyền vàng 24K | null",
  "itemMoiWeightGram": 8.2,
  "phiHuHai": 50000,
  "tienHaoHut": 18750,
  "tienCong": 100000,
  "chenhLech": 156250,
  "note": null,
  "ngayGio": "2026-06-15T08:30:00Z"
}
```

> **Lưu ý**: `chenhLech > 0` → khách trả thêm; `chenhLech < 0` → hoàn tiền khách

---

### GET `/api/trade` — Danh sách giao dịch

**Query Params**:

| Param | Kiểu | Mô tả |
|---|---|---|
| `branchId` | `uuid?` | Lọc theo chi nhánh |
| `loai` | `string?` | `DoiHang` / `MuaThem` / `DoiMienPhi` / `DoiThanhTien` |
| `from` | `datetime?` | Từ ngày (ISO 8601) |
| `to` | `datetime?` | Đến ngày (ISO 8601) |
| `page` | `int` | Mặc định `1` |
| `limit` | `int` | Mặc định `20` |

**Response 200**:

```json
{
  "data": [ /* TradeTxnResponse[] */ ],
  "page": 1,
  "pageSize": 20,
  "total": 47
}
```

---

### GET `/api/trade/{id}` — Chi tiết giao dịch

**Response 200**: `TradeTxnResponse` (cấu trúc như trên)

**Response 404**:

```json
{ "status": 404, "errorCode": "RESOURCE_NOT_FOUND" }
```

---

## Luồng UI theo từng loại

### DoiHang / MuaThem

```
1. Nhân viên chọn ItemCu (dropdown inventory, lọc NguonGoc=Quan, TrangThai=TrenQuay)
2. Nhân viên chọn ItemMoi (dropdown inventory, lọc TrangThai=TrenQuay)
3. Nhập HaoHutGram, PhiHuHai, TienCong
4. [Preview] Gọi API tính chênh lệch ← Hiển thị ChenhLech trước khi submit
   - Hiển thị: "Khách trả thêm: X ₭" hoặc "Hoàn tiền: X ₭"
5. Nhân viên xác nhận → POST /api/trade
6. Hiển thị phiếu thu đổi (TxnCode, thông tin 2 món hàng, các khoản phí)
```

> **Lưu ý bước 4**: Hiện tại không có endpoint `/api/trade/preview`. FE có thể tính preview phía client theo công thức ở trên, hoặc sau submit thì hiển thị kết quả từ response.

### DoiMienPhi

```
1. Nhân viên chọn ItemCu + ItemMoi
2. Nhập NgayMuaCu (bắt buộc)
3. Backend tự kiểm tra:
   - Ngày mua ≤ 31 ngày trước → OK; quá hạn → lỗi TRADE_FREE_EXCHANGE_EXPIRED
   - |GiaTriCu - GiaTriMoi| ≤ 1% × GiaTriCu → OK; khác giá → lỗi TRADE_FREE_EXCHANGE_INVALID_VALUE
4. POST /api/trade với loai="DoiMienPhi", các khoản phí bỏ qua (hoặc gửi 0)
```

### DoiThanhTien

```
1. Nhân viên chọn ItemCu
2. Nhập PhiHuHai, TienCong (tùy chọn)
3. ItemMoiId: tùy chọn — nếu khách vừa đổi ra tiền, vừa lấy hàng mới
4. [Preview] FE có thể tính trước TienKhachNhan = (WeightGram/3.75 × GiaMuaPerChi) - TienDaCu - TienCong - PhiHuHai
   - GiaMuaPerChi cần lấy từ GET /api/config/prices (trường BuyPrice)
5. POST /api/trade với loai="DoiThanhTien"
6. Hiển thị số tiền hoàn lại cho khách: |ChenhLech| (vì ChenhLech âm khi này)
```

---

## Mã lỗi (Error Codes)

| Mã lỗi | HTTP | Ý nghĩa |
|---|---|---|
| `INVENTORY_NOT_FOUND` | 404 | ItemCuId hoặc ItemMoiId không tồn tại trong kho |
| `TRADE_ITEM_NOT_QUAN` | 422 | ItemCu không phải vàng của quán (NguonGoc ≠ Quan) |
| `INVENTORY_ITEM_NOT_AVAILABLE` | 422 | ItemMoi không ở trạng thái TrenQuay (đã bán hoặc chuyển) |
| `TRADE_FREE_EXCHANGE_EXPIRED` | 422 | DoiMienPhi: NgayMuaCu cách nay quá 31 ngày |
| `TRADE_FREE_EXCHANGE_INVALID_VALUE` | 422 | DoiMienPhi: Chênh lệch giá trị 2 món > 1% |
| `CONFIG_PRICE_NOT_FOUND` | 422 | Chưa có bảng giá nào được cấu hình |
| `VALIDATION_FAILED` | 422 | Lỗi validation (kèm `errors[]` chi tiết) |
| `RESOURCE_NOT_FOUND` | 404 | GET /{id}: không tìm thấy giao dịch |

---

## Thay đổi trạng thái Kho sau giao dịch

| Loại GD | ItemCu (vàng cũ) | ItemMoi (vàng mới) |
|---|---|---|
| `DoiHang` | `TrenQuay` → `ChuyenXuong` | `TrenQuay` → `DaBan` |
| `MuaThem` | `TrenQuay` → `ChuyenXuong` | `TrenQuay` → `DaBan` |
| `DoiMienPhi` | `TrenQuay` → `ChuyenXuong` | `TrenQuay` → `DaBan` |
| `DoiThanhTien` | `TrenQuay` → `ChuyenXuong` | *(nếu có)* `TrenQuay` → `DaBan` |

---

## TypeScript Types (Frontend)

```typescript
export type TradeType = 'DoiHang' | 'MuaThem' | 'DoiMienPhi' | 'DoiThanhTien';

export interface CreateTradeTxnRequest {
  loai: TradeType;
  branchId: string;
  employeeId: string;
  itemCuId: string;
  itemMoiId?: string | null;
  phiHuHai: number;        // LAK, ≥ 0
  haoHutGram: number;      // gram, ≥ 0
  tienCong: number;        // LAK, ≥ 0
  customerId?: string | null;
  ngayMuaCu?: string | null; // ISO 8601, bắt buộc với DoiMienPhi
  note?: string | null;
}

export interface TradeTxnResponse {
  id: string;
  txnCode: string;
  loai: TradeType;
  branchId: string;
  employeeId: string;
  customerId: string | null;
  itemCuId: string;
  itemCuName: string;
  itemCuWeightGram: number;
  itemMoiId: string | null;
  itemMoiName: string | null;
  itemMoiWeightGram: number | null;
  phiHuHai: number;
  tienHaoHut: number;
  tienCong: number;
  chenhLech: number;      // > 0: khách trả thêm, < 0: hoàn tiền
  note: string | null;
  ngayGio: string;        // ISO 8601 UTC
}

export interface TradeListResponse {
  data: TradeTxnResponse[];
  page: number;
  pageSize: number;
  total: number;
}
```

---

## Ví dụ tính preview phía FE (DoiHang)

```typescript
// Lấy từ GET /api/config/prices → pricePerChi (giá bán/chỉ của độ tuổi vàng)
function previewDoiHang(params: {
  itemCuWeightGram: number;
  itemMoiWeightGram: number;
  itemMoiTienDa: number;
  giaBanPerChi: number;  // lấy từ API giá, đã quy về /chỉ
  phiHuHai: number;
  haoHutGram: number;
  tienCong: number;
  gramPerChi: number;    // mặc định 3.75
}): { chenhLech: number; tienHaoHut: number } {
  const { itemCuWeightGram, itemMoiWeightGram, itemMoiTienDa,
          giaBanPerChi, phiHuHai, haoHutGram, tienCong, gramPerChi } = params;

  const tienHaoHut = (haoHutGram / gramPerChi) * giaBanPerChi;
  const giaTriCu   = (itemCuWeightGram  / gramPerChi) * giaBanPerChi;
  const giaTriMoi  = (itemMoiWeightGram / gramPerChi) * giaBanPerChi;
  const chenhLech  = giaTriMoi + itemMoiTienDa + tienCong + phiHuHai + tienHaoHut - giaTriCu;

  return { chenhLech, tienHaoHut };
}

// Ví dụ preview DoiThanhTien
function previewDoiThanhTien(params: {
  itemCuWeightGram: number;
  itemCuTienDa: number;
  giaMuaPerChi: number;  // BuyPrice từ API giá, đã quy về /chỉ
  phiHuHai: number;
  tienCong: number;
  gramPerChi: number;
}): number /* TienKhachNhan */ {
  const { itemCuWeightGram, itemCuTienDa, giaMuaPerChi,
          phiHuHai, tienCong, gramPerChi } = params;

  const soChi = itemCuWeightGram / gramPerChi;
  return soChi * giaMuaPerChi - itemCuTienDa - tienCong - phiHuHai;
}
```

---

## Lưu ý tích hợp

1. **Lấy danh sách ItemCu hợp lệ**: `GET /api/inventory?nguonGoc=Quan&trangThai=TrenQuay` — chỉ cho phép chọn các item này làm hàng cũ.
2. **Lấy danh sách ItemMoi hợp lệ**: `GET /api/inventory?trangThai=TrenQuay` — chỉ các item đang trưng bày.
3. **Giá bán/chỉ và giá mua/chỉ**: lấy từ `GET /api/config/prices` → trường `sellPrice` và `buyPrice` của dòng vàng tương ứng (theo `purityCode`). Quy về /chỉ theo công thức: `pricePerChi = price / gramPerUnit × gramPerChi`.
4. **`chenhLech` trong response là số tiền thực cần giao dịch**: FE hiển thị `|chenhLech|` kèm nhãn "Khách trả thêm" nếu dương, "Hoàn tiền khách" nếu âm.
5. **DoiMienPhi**: FE nên hiển thị cảnh báo trực quan nếu `ngayMuaCu` cách nay > 31 ngày (trước khi submit để tránh lỗi từ backend).
6. **Sau khi tạo thành công**: refresh lại danh sách inventory để phản ánh trạng thái mới của ItemCu và ItemMoi.