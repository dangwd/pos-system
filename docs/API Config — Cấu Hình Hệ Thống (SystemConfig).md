# API Config — Cấu Hình Hệ Thống (SystemConfig)

> Base URL: `https://<host>/api/config`  
> Xác thực: **JWT Bearer Token** — gửi qua header `Authorization: Bearer <accessToken>`  
> Content-Type: `application/json`

---

## Tổng quan

`SystemConfig` là bảng cấu hình tham số nghiệp vụ có thể điều chỉnh tại runtime, không cần deploy lại ứng dụng. Thiết kế theo kiểu **typed columns** (mỗi tham số là một cột riêng) và **append-only** (mỗi lần cập nhật tạo bản ghi mới — không ghi đè bản cũ).

| Tham số | Ý nghĩa | Mặc định |
|---------|---------|---------|
| `exchangeFreeEnabled` | Bật/tắt nghiệp vụ Đổi Miễn Phí (TransactionType = `ExchangeFree`) toàn hệ thống | `true` |
| `exchangeFreeMaxDays` | Số ngày tối đa kể từ hóa đơn gốc để chấp nhận Đổi Miễn Phí | `30` |
| `buyBackOriginalPriceEnabled` | Bật/tắt tính năng áp dụng giá gốc hóa đơn khi thu mua lại | `false` |
| `buyBackOriginalPriceMaxDays` | Số ngày tối đa kể từ hóa đơn gốc để áp dụng giá mua ban đầu | `0` |

### Lưu ý về append-only

Mỗi lần cập nhật (dù chỉ thay đổi một section) sẽ tạo **một bản ghi mới** trong bảng `system_configs`. Giá trị hiện tại luôn là bản ghi có `updated_at` mới nhất. Các bản ghi cũ không bị xóa — có thể dùng để tra cứu lịch sử.

Khi cập nhật một section, backend **tự động copy** các tham số còn lại từ config hiện tại sang bản ghi mới, đảm bảo không mất dữ liệu.

**Ví dụ:** Gọi `PUT /system/exchange-free` sẽ tạo bản ghi mới giữ nguyên `buyBackOriginalPriceEnabled` / `buyBackOriginalPriceMaxDays` từ config trước đó.

---

## Danh sách Endpoint

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/config/system` | Đăng nhập | Lấy toàn bộ cấu hình hệ thống hiện tại |
| `PUT` | `/api/config/system/exchange-free` | `ConfigSystem` | Cập nhật cài đặt nghiệp vụ Đổi Miễn Phí |
| `PUT` | `/api/config/system/buy-back-original-price` | `ConfigSystem` | Cập nhật cài đặt thu mua theo giá gốc hóa đơn |

> **Policy `ConfigSystem`:** áp dụng cho **Manager** và **SystemAdmin**.

---

## `GET /api/config/system`

Lấy cấu hình hệ thống đang có hiệu lực (bản ghi mới nhất). Nếu DB chưa có bản ghi nào (môi trường dev chưa seed), trả về giá trị mặc định tích hợp sẵn.

**Yêu cầu:** Đăng nhập (bất kỳ role).

**Response `200 OK`:** [`SystemConfigDto`](#schema-systemconfigdto)

```json
{
  "exchangeFreeEnabled": true,
  "exchangeFreeMaxDays": 30,
  "buyBackOriginalPriceEnabled": false,
  "buyBackOriginalPriceMaxDays": 0,
  "updatedAt": "2026-06-24T02:08:03Z",
  "updatedBy": "11111111-0000-0000-0000-000000000001"
}
```

> `updatedAt` và `updatedBy` là `null` khi chưa có bản ghi nào trong DB (trả về giá trị mặc định tích hợp).

---

## `PUT /api/config/system/exchange-free`

Cập nhật cài đặt nghiệp vụ **Đổi Miễn Phí** (`TransactionType.ExchangeFree`).

- Khi `isEnabled = false`: mọi yêu cầu tạo giao dịch `ExchangeFree` sẽ bị từ chối với lỗi `EXCHANGE_FREE_DISABLED`.
- Khi `isEnabled = true`: hệ thống kiểm tra hóa đơn gốc phải được tạo trong vòng `maxDays` ngày.

**Yêu cầu policy:** `ConfigSystem` (Manager, SystemAdmin).

**Request body:**

```json
{
  "isEnabled": true,
  "maxDays": 30
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|-------|---------|------|-------|
| `isEnabled` | ✅ | bool | `true` = bật / `false` = tắt toàn bộ nghiệp vụ Đổi Miễn Phí |
| `maxDays` | ✅ | int | Số ngày tối đa kể từ ngày khách mua hàng. Phải > 0 |

**Response `200 OK`:** [`SystemConfigDto`](#schema-systemconfigdto) phản ánh trạng thái sau khi cập nhật.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_EXCHANGE_FREE_MAX_DAYS_INVALID` | 422 | `maxDays` ≤ 0 |

---

## `PUT /api/config/system/buy-back-original-price`

Cập nhật cài đặt **thu mua theo giá gốc hóa đơn** — cho phép hệ thống áp dụng giá bán ban đầu (lấy từ hóa đơn cũ) khi nhân viên tạo giao dịch thu mua lại trong vòng `maxDays` ngày.

- Khi `isEnabled = false`: bỏ qua logic giá gốc, luôn dùng giá thị trường hiện tại.
- Khi `isEnabled = true` và `maxDays = 0`: không áp dụng giới hạn thời gian.

**Yêu cầu policy:** `ConfigSystem` (Manager, SystemAdmin).

**Request body:**

```json
{
  "isEnabled": true,
  "maxDays": 20
}
```

| Field | Bắt buộc | Kiểu | Mô tả |
|-------|---------|------|-------|
| `isEnabled` | ✅ | bool | `true` = bật / `false` = tắt tính năng giá gốc hóa đơn |
| `maxDays` | ✅ | int | Số ngày tối đa kể từ ngày khách mua sản phẩm. `0` = không giới hạn. Phải ≥ 0 |

**Response `200 OK`:** [`SystemConfigDto`](#schema-systemconfigdto) phản ánh trạng thái sau khi cập nhật.

**Lỗi có thể xảy ra:**

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_BUY_BACK_MAX_DAYS_INVALID` | 422 | `maxDays` < 0 |

---

## Schema

### Schema: `SystemConfigDto`

```json
{
  "exchangeFreeEnabled": true,
  "exchangeFreeMaxDays": 30,
  "buyBackOriginalPriceEnabled": false,
  "buyBackOriginalPriceMaxDays": 0,
  "updatedAt": "2026-06-24T02:08:03Z",
  "updatedBy": "11111111-0000-0000-0000-000000000001"
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `exchangeFreeEnabled` | bool | `true` = nghiệp vụ Đổi Miễn Phí đang bật |
| `exchangeFreeMaxDays` | int | Ngày tối đa chấp nhận hóa đơn gốc cho Đổi Miễn Phí |
| `buyBackOriginalPriceEnabled` | bool | `true` = tính năng giá gốc hóa đơn khi thu mua đang bật |
| `buyBackOriginalPriceMaxDays` | int | Ngày tối đa áp dụng giá gốc khi thu mua. `0` = không giới hạn |
| `updatedAt` | datetime\|null | Thời điểm cập nhật lần cuối (UTC). `null` = chưa có bản ghi trong DB |
| `updatedBy` | Guid\|null | UUID người cập nhật lần cuối. `null` = chưa có bản ghi trong DB |

---

## Mã lỗi

| Mã lỗi | HTTP | Nguyên nhân |
|--------|------|------------|
| `CONFIG_EXCHANGE_FREE_MAX_DAYS_INVALID` | 422 | `maxDays` ≤ 0 khi cập nhật ExchangeFree |
| `CONFIG_BUY_BACK_MAX_DAYS_INVALID` | 422 | `maxDays` < 0 khi cập nhật BuyBack |
| `EXCHANGE_FREE_DISABLED` | 422 | Tạo giao dịch `ExchangeFree` khi tính năng đang tắt |

---

## Bảng DB liên quan

| Bảng | Mô tả |
|------|-------|
| `system_configs` | Lưu lịch sử cấu hình — append-only, mỗi cập nhật tạo một bản ghi mới. Bản ghi hiện tại = `ORDER BY updated_at DESC LIMIT 1` |

**Cấu trúc cột chính:**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | uuid | PK |
| `exchange_free_enabled` | bool | Bật/tắt Đổi Miễn Phí |
| `exchange_free_max_days` | int | Số ngày tối đa Đổi Miễn Phí |
| `buy_back_original_price_enabled` | bool | Bật/tắt giá gốc khi thu mua |
| `buy_back_original_price_max_days` | int | Số ngày tối đa giá gốc khi thu mua |
| `updated_by` | uuid | FK → `users.id` |
| `updated_at` | timestamptz | Thời điểm tạo bản ghi (UTC) |

---

## Phân quyền

| Permission | Role | Endpoint |
|-----------|------|---------|
| _(bất kỳ)_ | Cashier, ThuQuy, Manager, SystemAdmin | `GET /api/config/system` |
| `CONFIG_SYSTEM` | Manager, SystemAdmin | `PUT /api/config/system/*` |

> **Lưu ý:** Sau khi quyền `CONFIG_SYSTEM` được thêm vào role của một user, user đó phải **đăng xuất và đăng nhập lại** để JWT mới chứa claim này. Các token cũ không có hiệu lực với endpoint này.

---

## Luồng sử dụng điển hình

```
── Tắt nghiệp vụ Đổi Miễn Phí tạm thời ─────────────────────────────────────

1. Manager mở màn hình "Cấu hình hệ thống"
   → GET /api/config/system
     ← { exchangeFreeEnabled: true, exchangeFreeMaxDays: 30, ... }

2. Manager tắt Đổi Miễn Phí
   → PUT /api/config/system/exchange-free
     body: { "isEnabled": false, "maxDays": 30 }
     ← { exchangeFreeEnabled: false, exchangeFreeMaxDays: 30, updatedAt: "...", ... }

3. Nhân viên cố tạo giao dịch ExchangeFree
   → POST /api/transactions
     ← 422 { "errorCode": "EXCHANGE_FREE_DISABLED" }

── Cấu hình thu mua theo giá gốc ────────────────────────────────────────────

4. Manager bật tính năng giá gốc, áp dụng trong 20 ngày
   → PUT /api/config/system/buy-back-original-price
     body: { "isEnabled": true, "maxDays": 20 }
     ← {
         exchangeFreeEnabled: false,
         exchangeFreeMaxDays: 30,
         buyBackOriginalPriceEnabled: true,
         buyBackOriginalPriceMaxDays: 20,
         updatedAt: "2026-06-24T03:00:00Z",
         updatedBy: "uuid-manager"
       }
   (bản ghi mới trong system_configs — giá trị ExchangeFree được copy từ bản ghi trước)

── Đọc config trong luồng tạo giao dịch ─────────────────────────────────────

5. Frontend đọc config khi mở màn hình thu mua
   → GET /api/config/system
     ← { buyBackOriginalPriceEnabled: true, buyBackOriginalPriceMaxDays: 20, ... }

   Frontend hiển thị input "Mã hóa đơn gốc" chỉ khi buyBackOriginalPriceEnabled = true
```

---

## Ghi chú thiết kế

**Tại sao dùng append-only thay vì single-row upsert?**

- Giữ lịch sử thay đổi cấu hình — biết ai đã bật/tắt tính năng vào lúc nào.
- Nhất quán với pattern của `PriceConfig`, `ExchangeRate` trong hệ thống.

**Tại sao typed columns thay vì key-value?**

- Validation kiểu dữ liệu tường minh ở tầng DB và application.
- Không cần serialize/deserialize JSON.
- Dễ query trực tiếp từ DB khi debug.
- Khi cần thêm tham số mới: thêm cột + migration + `With<Section>Settings()` method trên entity.

---

## Liên quan

- [API Config — Tỷ Giá Ngoại Tệ](./API%20Config%20—%20Tỷ%20Giá%20Ngoại%20Tệ.md)
- `backend/src/KhamphuvongPOS.Domain/Entities/SystemConfig.cs` — Entity
- `backend/src/KhamphuvongPOS.Application/Features/Config/ConfigCommands.cs` — `UpdateExchangeFreeSettingsCommand`, `UpdateBuyBackOriginalPriceSettingsCommand`
- `backend/src/KhamphuvongPOS.Application/Features/Config/ConfigQueries.cs` — `GetSystemConfigQuery`, `SystemConfigResult`
