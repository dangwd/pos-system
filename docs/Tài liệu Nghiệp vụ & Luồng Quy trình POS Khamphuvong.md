# Tài liệu Nghiệp vụ & Luồng Quy trình

# Hệ thống POS Khamphouvong

**Phiên bản**: 1.1 (đối chiếu mã nguồn)
**Ngày**: 11/06/2026
**Căn cứ**: Báo cáo khảo sát quy trình + Tài liệu Kiến trúc + **rà soát code backend hiện tại**

> ⚠️ Một số mục đã được hiệu chỉnh cho khớp **code thực tế** (vai trò & phân quyền, đơn vị trọng lượng, loại/mã giao dịch, luồng trạng thái, tác động kho). Phần nào nghiệp vụ mong muốn nhưng **chưa** code thì được ghi chú rõ.

---

## Mục lục

1. [Tổng quan nghiệp vụ](#1-tổng-quan-nghiệp-vụ)
2. [Các vai trò người dùng](#2-các-vai-trò-người-dùng)
3. [Nghiệp vụ Mua Vàng (Mua vào)](#3-nghiệp-vụ-mua-vàng-mua-vào)
4. [Nghiệp vụ Bán Vàng / Bán Bạc (Bán ra)](#4-nghiệp-vụ-bán-vàng--bán-bạc-bán-ra)
5. [Nghiệp vụ Mua Thêm (Trade-up)](#5-nghiệp-vụ-mua-thêm-trade-up)
6. [Nghiệp vụ Đổi Hàng (Exchange)](#6-nghiệp-vụ-đổi-hàng-exchange)
7. [Nghiệp vụ Đổi Thành Tiền (Partial Redemption)](#7-nghiệp-vụ-đổi-thành-tiền-partial-redemption)
8. [Nghiệp vụ Thu Đổi Ngoại Tệ](#8-nghiệp-vụ-thu-đổi-ngoại-tệ)
9. [Nghiệp vụ Xuất / Nhập Kho](#9-nghiệp-vụ-xuất--nhập-kho)
10. [Nghiệp vụ Quản lý Dòng Tiền / Sổ Quỹ](#10-nghiệp-vụ-quản-lý-dòng-tiền--sổ-quỹ)
11. [Công thức tính giá](#11-công-thức-tính-giá)
12. [Quy trình phê duyệt giao dịch](#12-quy-trình-phê-duyệt-giao-dịch)
13. [Chức năng các module hệ thống](#13-chức-năng-các-module-hệ-thống)
14. [Phân quyền theo chức năng](#14-phân-quyền-theo-chức-năng)
15. [Ràng buộc nghiệp vụ quan trọng](#15-ràng-buộc-nghiệp-vụ-quan-trọng)

---

## 1. Tổng quan nghiệp vụ

Khamphouvong là chuỗi cửa hàng kinh doanh vàng, bạc và ngoại tệ tại Vientiane, Lào. Hoạt động chính gồm:

| Loại nghiệp vụ       | Mô tả ngắn                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| **Mua vào**          | Thu mua vàng từ khách, chi tiền Kip                                               |
| **Bán ra**           | Bán vàng/bạc cho khách, thu tiền Kip                                              |
| **Mua thêm**         | Khách đổi vàng cũ lấy sản phẩm mới có giá trị cao hơn, thanh toán phần chênh lệch |
| **Đổi hàng**         | Khách đổi sản phẩm cùng hoặc khác loại, xử lý phí phát sinh                       |
| **Đổi thành tiền**   | Khách đổi một phần vàng thành tiền mặt, phần còn lại lấy sản phẩm                 |
| **Thu đổi ngoại tệ** | Đổi ngoại tệ (THB, USD...) sang Kip Lào                                           |
| **Xuất / Nhập kho**  | Điều chỉnh tồn kho vàng/bạc theo trọng lượng                                      |
| **Quản lý sổ quỹ**   | Theo dõi thu/chi tiền mặt và tài khoản ngân hàng theo ngày                        |

**Bản đồ loại giao dịch trong code** — hai hệ song song:

`TransactionType` (bảng `transactions`, mã HĐ `{prefix}-{yyyyMMdd}-{8 ký tự}`):

| Enum              | Mã  | Nghiệp vụ      |     | Enum               | Mã  | Nghiệp vụ                         |
| ----------------- | --- | -------------- | --- | ------------------ | --- | --------------------------------- |
| `SellGold`        | BV  | Bán vàng       |     | `BuyMoreGold`      | MT  | Mua thêm                          |
| `SellSilver`      | BB  | Bán bạc        |     | `ExchangeGold`     | DV  | Đổi vàng                          |
| `BuyGold`         | MV  | Mua vàng       |     | `ExchangeFree`     | DMF | Đổi miễn phí (≤ 30 ngày)          |
| `ExchangeToMoney` | DTT | Đổi thành tiền |     | `ExchangeCurrency` | NT  | Thu đổi ngoại tệ (không đụng kho) |

`TradeType` (bảng `trade_txns`, nghiệp vụ thu đổi phức tạp qua `TradeService`): `MuaThem` · `DoiHang` · `DoiMienPhi` · `DoiThanhTien`.

**Đơn vị tiền tệ**: Kip Lào (₭ / LAK) — chính; THB, USD — phụ
**Đơn vị trọng lượng** (seed sẵn, cấu hình được qua `weight-units`): **Chỉ** (3,75g), **Lượng** (37,5g), **Cây** (375g), **Bath** (15g), **Gram** (1g). _(Không có "Phân" trong seed hiện tại.)_
**Tuổi vàng**: cấu hình động qua `gold-purities` (mã + hàm lượng + nhóm) — seed sẵn 9999, 750…; bạc dùng nhóm `Silver`
**Nguồn giá vàng**: giá 9999 (tham chiếu Pisico) được **nhập tay vào hệ thống** qua màn Cấu hình giá. Mỗi lần cập nhật **tạo bản ghi `PriceConfig` mới** (giữ lịch sử). Hệ thống **chưa** tích hợp tự động feed giá bên thứ 3.

---

## 2. Các vai trò người dùng

Hệ thống dùng **RBAC động**: 4 vai trò seed sẵn (`IsSystem`) + **17 quyền (permission)** gán qua bảng `role_permissions`. SystemAdmin có thể tạo thêm role và gán lại quyền.

| Vai trò (enum)                       | Đăng nhập mẫu | Quyền hạn chính (permission)                                                                                                                                                      |
| ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nhân viên bán hàng** `Cashier`     | `NV001`       | Lập đơn giao dịch (`TRANSACTION_CREATE`), lập đơn thu đổi (`TRADE_CREATE`), xem kho (`INVENTORY_VIEW`)                                                                            |
| **Thủ quỹ** `ThuQuy`                 | `TQ001`       | Lập đơn GD, **quản lý sổ quỹ** (`CASH_LEDGER_MANAGE`), **báo cáo ngày** (`REPORT_DAILY`), xem kho                                                                                 |
| **Quản lý / Chủ cửa hàng** `Manager` | `QL001`       | **Duyệt GD & thu đổi**, xem tất cả GD, **quản lý kho** (`INVENTORY_MANAGE`), quản lý sổ quỹ, **cấu hình giá/đơn vị/đá/tuổi vàng**, **quản lý sản phẩm**, dashboard + báo cáo ngày |
| **Quản trị hệ thống** `SystemAdmin`  | `ADMIN001`    | **Toàn quyền (17 permission)** — gồm **quản lý người dùng & phân quyền** (`USER_MANAGE`) và **quản lý chi nhánh** (`BRANCH_MANAGE`)                                               |

> Không còn tách "Trưởng chi nhánh" vs "Quản trị hội sở" — code chỉ có **một** quyền duyệt chung (`TRANSACTION_APPROVE` / `TRADE_APPROVE`, thuộc `Manager` & `SystemAdmin`). Quản lý chi nhánh & người dùng hiện **chỉ** thuộc `SystemAdmin`.

---

## 3. Nghiệp vụ Mua Vàng (Mua vào)

### 3.1 Mô tả

Cửa hàng thu mua vàng từ khách hàng. Vàng được phân loại theo nguồn gốc (vàng của quán / vàng ngoài) để xác định xử lý tiếp theo.

### 3.2 Luồng quy trình

```
Khách mang vàng đến
         │
         ▼
Nhân viên tiếp nhận & kiểm tra ban đầu
(loại hàng: nhẫn, vòng cổ, khối vàng...)
         │
         ▼
Cân trọng lượng + xác định hàm lượng
(9999, 750, ...)
         │
         ▼
Phân loại nguồn gốc vàng
    ┌────┴────┐
    │         │
Vàng của quán  Vàng ngoài (không phải của Khamphouvong)
    │              │
    ▼              ▼
Kiểm tra        Tính tiền theo giá mua vào
tình trạng      Chi tiền Kip cho khách
    │           Chuyển vàng về xưởng để xử lý
    ├── Không hư hỏng, không hao hụt
    │       └─► Nhập lại tồn kho, có thể bán lại
    │
    └── Hư hỏng / hao hụt trọng lượng
            └─► Chuyển về xưởng xử lý
         │
         ▼
Quy đổi tiền
(Tiền Kip = Trọng lượng × Giá mua vào)
Nếu khách cần: quy đổi sang ngoại tệ
         │
         ▼
Chi tiền cho khách + In chứng từ
Ghi sổ quỹ (CHI)
```

### 3.3 Quy tắc nghiệp vụ

| Quy tắc                   | Chi tiết                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| Giá mua vào               | Theo bảng giá mua vào hiện hành do Pisico quy định (thấp hơn giá bán ra) |
| Vàng ngoài                | Không bán lại ngay, chuyển về xưởng kiểm định/xử lý                      |
| Vàng của quán, nguyên vẹn | Có thể nhập thẳng vào quầy bán lại                                       |
| Phân loại hàng            | Ghi rõ: nhẫn / vòng cổ / khối vàng / lắc tay... và hàm lượng             |
| Ghi nhận tồn kho          | Nhập kho theo trọng lượng (chỉ)                                          |

### 3.4 Ví dụ số liệu

| Tình huống                                   | Tính toán           | Kết quả                                          |
| -------------------------------------------- | ------------------- | ------------------------------------------------ |
| Mua 1 chỉ nhẫn vàng Khamphouvong, nguyên vẹn | 1 chỉ × 8.700.000 ₭ | Chi 8.700.000 ₭ cho khách; nhập lại kho bán được |
| Mua 2 chỉ vòng cổ vàng ngoài                 | 2 chỉ × 8.700.000 ₭ | Chi 17.400.000 ₭ cho khách; chuyển xưởng         |

### 3.5 Thông tin trên chứng từ mua vào

- Loại sản phẩm, trọng lượng (chỉ/gram), hàm lượng
- Giá mua vào tại thời điểm giao dịch
- Số tiền chi cho khách (Kip hoặc ngoại tệ)
- Phân loại: vàng của quán / vàng ngoài
- Tên, SĐT khách hàng; nhân viên thực hiện; ngày giờ; số tủ

---

## 4. Nghiệp vụ Bán Vàng / Bán Bạc (Bán ra)

### 4.1 Mô tả

Khách mua sản phẩm vàng hoặc bạc tại quầy. Thu ngân tính giá theo công thức tiêu chuẩn gồm: giá vàng + tiền đá đính kèm + tiền gia công thợ.

### 4.2 Luồng quy trình

```
Khách chọn sản phẩm tại quầy
         │
         ▼
Nhân viên xác định sản phẩm:
- Mã sản phẩm / tên
- Trọng lượng (chỉ/baht/phân + gram)
- Hàm lượng (9999/750/...)
- Đá đính kèm (nếu có)
         │
         ▼
Hệ thống tải giá vàng hiện tại (theo giờ)
         │
         ▼
Tính tổng tiền:
  Tiền vàng = Trọng lượng × Giá vàng bán ra
  Tiền đá = theo bảng định mức (phụ thuộc trọng lượng vàng)
  Tiền công = nhân viên tự báo (khác theo thợ)
  TỔNG = Tiền vàng + Tiền đá + Tiền công
         │
         ▼
Hiển thị tổng tiền cho khách xác nhận
         │
         ▼
Chọn phương thức thanh toán:
  - Tiền mặt Kip
  - Chuyển khoản
  - Kết hợp tiền mặt + chuyển khoản
         │
         ▼
Tạo hóa đơn + Xuất tồn kho (-) + Ghi sổ quỹ (THU)
In chứng từ bán hàng
```

### 4.3 Đặc thù tính giá đá đính kèm

Tiền đá không cố định mà phụ thuộc vào **trọng lượng vàng mua**:

| Trọng lượng vàng | Tiền đá (ví dụ)     |
| ---------------- | ------------------- |
| 1 chỉ vàng       | 500.000 ₭           |
| 2 chỉ vàng       | 700.000 ₭           |
| 3 chỉ vàng       | 1.000.000 ₭ (ví dụ) |

> Nguyên tắc: mua càng nhiều vàng → tiền đá đính kèm cho sản phẩm đó càng cao.

### 4.4 Tiền công gia công thợ

- Do nhân viên quầy tự báo giá; **khác nhau theo từng thợ**
- Không cố định, nhân viên nhập trực tiếp khi lập đơn
- Ví dụ: nhẫn 1 chỉ = 300.000 ₭; vòng 2 chỉ = 600.000 ₭

### 4.5 Bán bạc

- Giá bạc do cửa hàng tự quy định (không theo bảng Pisico)
- Tính theo gram: `Tiền bạc = Trọng lượng (gram) × Đơn giá bạc (₭/gram)`
- Ví dụ: 120 gram × 25.000 ₭ = 3.000.000 ₭

### 4.6 Bán đá riêng lẻ

- Đá không đi kèm vàng, cửa hàng tự định giá
- Nhân viên nhập giá bán trực tiếp (không tính theo công thức)

### 4.7 Ví dụ số liệu

| Giao dịch          | Tính toán                                  | Tổng tiền         |
| ------------------ | ------------------------------------------ | ----------------- |
| Bán nhẫn 1 chỉ     | 9.000.000 + 500.000 (đá) + 300.000 (công)  | **9.800.000 ₭**   |
| Bán vòng 2 chỉ     | 18.000.000 + 700.000 (đá) + 600.000 (công) | **19.300.000 ₭**  |
| Bán bạc 120g       | 120 × 25.000                               | **3.000.000 ₭**   |
| Thanh toán kết hợp | TM: 10.000.000 + CK: 9.300.000             | Tổng 19.300.000 ₭ |

### 4.8 Thông tin trên chứng từ bán hàng

| Trường             | Ví dụ           |
| ------------------ | --------------- |
| Loại sản phẩm      | Nhẫn vàng 9999  |
| Trọng lượng (chỉ)  | 1 chỉ           |
| Trọng lượng (gram) | 3,75 gram       |
| Tiền vàng          | 9.000.000 ₭     |
| Tiền công          | 300.000 ₭       |
| Tiền đá            | 500.000 ₭       |
| Tổng tiền          | 9.800.000 ₭     |
| Tên khách          | Somphone        |
| SĐT khách          | 020 5555 8888   |
| Nhân viên bán      | NV001 - Chantha |
| Ngày bán           | 13/05/2026      |
| Thời gian          | 10:30           |
| Số quầy/tủ         | Tủ 2            |
| TT tiền mặt        | 5.000.000 ₭     |
| TT chuyển khoản    | 4.800.000 ₭     |

---

## 5. Nghiệp vụ Mua Thêm (Trade-up)

### 5.1 Mô tả

Khách mang vàng của Khamphouvong đến và muốn **đổi lấy sản phẩm mới có giá trị cao hơn**, thanh toán thêm phần chênh lệch. Chỉ áp dụng cho vàng của cửa hàng — vàng ngoài phải đi theo luồng mua vào rồi bán ra thông thường.

### 5.2 Luồng quy trình

```
Khách mang vàng Khamphouvong đến
         │
         ▼
Nhân viên kiểm tra: đúng vàng của quán?
    ┌────┴────┐
    │ Không   │ Có
    ▼         ▼
  Chuyển   Kiểm tra tình trạng vật lý
  sang       │
  luồng    ┌─┴──────────────────┐
  Mua vào  │ Không hư hại,      │ Hư hại/hao hụt
           │ không hao hụt      │ trọng lượng
           │                    │
           ▼                    ▼
       Tính giá SP mới      Tính phí hư hại
       theo giá bán ra      + Tính tiền hao hụt
       hiện tại             (Hao hụt × Giá bán ra)
           │                    │
           └────────┬───────────┘
                    ▼
        Tính tiền khách trả thêm:
        = Giá SP mới - Giá trị vàng cũ (theo giá bán ra)
          + Phí hư hại (nếu có) + Tiền hao hụt (nếu có)
                    │
                    ▼
        Khách xác nhận + Thanh toán
                    │
                    ▼
        Tạo giao dịch + Xuất SP mới (-) + Nhập vàng cũ (+)
        Ghi sổ quỹ (THU phần chênh lệch)
        In chứng từ
```

### 5.3 Quy tắc nghiệp vụ

| Quy tắc           | Chi tiết                                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| Điều kiện áp dụng | Chỉ vàng của Khamphouvong mới được mua thêm trực tiếp                           |
| Định giá vàng cũ  | Theo **giá bán ra** hiện tại (không phải giá mua vào)                           |
| Phí hư hại        | Do nhân viên quy định theo trọng lượng sản phẩm (ví dụ: nhẫn 1 chỉ = 300.000 ₭) |
| Tiền hao hụt      | = Trọng lượng hao hụt (chỉ) × Giá vàng bán ra tại thời điểm GD                  |
| Vàng ngoài        | Không áp dụng mua thêm → xử lý riêng: mua vào trước, bán ra sau                 |

### 5.4 Ví dụ số liệu

| Tình huống                                   | Tính toán                                                  | Kết quả                                                        |
| -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| Đổi nhẫn 1 chỉ → vòng 2 chỉ, không hư hại    | Vòng 2 chỉ = 19.300.000; Nhẫn 1 chỉ = 9.000.000            | Khách trả thêm **10.300.000 ₭**                                |
| Đổi nhẫn 1 chỉ (hao hụt 0,05 chỉ) → vòng mới | Hao hụt = 0,05 × 9.000.000 = 450.000; Phí hư hại = 300.000 | Phí phát sinh thêm **750.000 ₭** (cộng thêm vào chênh lệch SP) |

---

## 6. Nghiệp vụ Đổi Hàng (Exchange)

### 6.1 Mô tả

Khách mang sản phẩm của Khamphouvong đến đổi sang sản phẩm khác (cùng loại hoặc khác loại). Chỉ áp dụng cho sản phẩm của cửa hàng.

### 6.2 Các trường hợp đổi hàng

#### Trường hợp 1 — Đổi cùng loại, cùng trọng lượng, không hư hại

```
Nhẫn 1 chỉ → Nhẫn 1 chỉ khác
Không phát sinh phí → Đổi miễn phí (hoặc theo chính sách)
```

#### Trường hợp 2 — Đổi cùng loại, nhưng có hư hại / hao hụt

Xử lý tương tự quy tắc **Mua Thêm** — tính phí hư hại và tiền hao hụt trước khi hoàn tất.

#### Trường hợp 3 — Đổi sang loại khác (ví dụ: nhẫn → vòng có đá)

```
Tiền thu thêm = Tiền đá sản phẩm mới + Tiền công sản phẩm mới
              + Phí hư hại (nếu có) + Tiền hao hụt (nếu có)
```

> **Lưu ý**: Nếu sản phẩm cũ cũng có đá, cửa hàng có thể **miễn tiền đá cũ** theo chính sách, giúp giảm tiền khách phải trả thêm.

#### Trường hợp 4 — Đổi miễn phí trong vòng 1 tháng

Điều kiện:

- Sản phẩm của Khamphouvong
- Thời gian từ ngày mua đến ngày đổi ≤ 1 tháng
- Sản phẩm không hư hỏng
- Giá trị sản phẩm đổi bằng nhau

→ Khách được đổi hoàn toàn miễn phí, không phát sinh khoản tiền nào.

### 6.3 Ví dụ số liệu

| Tình huống                                                 | Tính toán                   | Kết quả                      |
| ---------------------------------------------------------- | --------------------------- | ---------------------------- |
| Nhẫn 1 chỉ → Nhẫn 1 chỉ, không hư hại                      | Không phát sinh             | Đổi miễn phí                 |
| Nhẫn 1 chỉ → Vòng 1 chỉ có đá (đá: 500k, công: 400k)       | 500.000 + 400.000           | Khách trả thêm **900.000 ₭** |
| Mua ngày 01/05, đổi ngày 20/05, không hư hại, cùng giá trị | Trong 1 tháng, đủ điều kiện | Đổi **miễn phí**             |

---

## 7. Nghiệp vụ Đổi Thành Tiền (Partial Redemption)

### 7.1 Mô tả

Khách mang vàng của Khamphouvong đến, muốn **đổi một phần thành tiền mặt** và dùng phần còn lại để lấy sản phẩm khác.

### 7.2 Luồng quy trình

```
Khách mang vàng, xác định:
  - Phần A: muốn đổi thành tiền mặt
  - Phần B: muốn đổi lấy sản phẩm mới
         │
         ▼
Nhân viên kiểm tra trọng lượng tổng,
tình trạng hư hỏng, hao hụt
         │
         ▼
Định giá phần A (đổi thành tiền):
  Tiền định giá A = Trọng lượng A × Giá mua vào
         │
         ▼
Tính chi phí phát sinh (nếu có):
  - Tiền đá sản phẩm B
  - Tiền gia công sản phẩm B
  - Phí hư hại (nếu có)
         │
         ▼
Tính tiền khách thực nhận:
  = Tiền định giá A - Tiền đá B - Tiền công B - Phí hư hại
         │
         ▼
Khách nhận tiền mặt + nhận sản phẩm B
Tạo giao dịch + Ghi sổ quỹ + In chứng từ
```

### 7.3 Ví dụ số liệu

**Khách mang 4 chỉ vàng, muốn đổi 2 chỉ thành tiền, 2 chỉ lấy sản phẩm mới:**

| Bước                               | Tính toán                                | Giá trị          |
| ---------------------------------- | ---------------------------------------- | ---------------- |
| Tiền định giá 2 chỉ đổi thành tiền | 2 × 8.700.000                            | 17.400.000 ₭     |
| Tiền đá sản phẩm mới               | —                                        | 700.000 ₭        |
| Tiền gia công sản phẩm mới         | —                                        | 600.000 ₭        |
| Phí hư hại                         | —                                        | 600.000 ₭        |
| **Tiền khách thực nhận**           | 17.400.000 - 700.000 - 600.000 - 600.000 | **15.500.000 ₭** |

Đồng thời khách nhận sản phẩm mới tương ứng 2 chỉ còn lại.

---

## 8. Nghiệp vụ Thu Đổi Ngoại Tệ

### 8.1 Mô tả

Khách mang ngoại tệ (THB, USD...) đổi sang Kip Lào theo tỷ giá hiện hành của cửa hàng.

### 8.2 Luồng quy trình

```
Khách cung cấp:
  - Loại ngoại tệ (THB / USD / ...)
  - Số lượng
         │
         ▼
Hệ thống tải tỷ giá hiện tại từ cấu hình
         │
         ▼
Tính tiền LAK = Số lượng ngoại tệ × (Tỷ giá + Điều chỉnh)
         │
         ▼
Hiển thị số tiền Kip khách nhận
         │
         ▼
Khách xác nhận → Thu ngoại tệ → Chi Kip cho khách
Tạo giao dịch (type = ExchangeCurrency, mã NT-...; KHÔNG đụng tồn kho)
Ghi sổ quỹ (CHI tiền Kip, THU ngoại tệ)
In chứng từ đổi tiền
```

### 8.3 Quy tắc nghiệp vụ

| Quy tắc           | Chi tiết                                       |
| ----------------- | ---------------------------------------------- |
| Nguồn tỷ giá      | Cấu hình trong hệ thống, cập nhật bởi HQ Admin |
| Tỷ giá áp dụng    | Tỷ giá tại **thời điểm giao dịch** (snapshot)  |
| Điều chỉnh tỷ giá | Có thể cộng thêm khoản điều chỉnh (spread)     |
| Ngoại tệ hỗ trợ   | THB, USD, và các loại được cấu hình            |

---

## 9. Nghiệp vụ Xuất / Nhập Kho

### 9.1 Mô tả

Quản lý tồn kho vàng/bạc theo trọng lượng tại từng chi nhánh. Tồn kho thay đổi tự động khi có giao dịch, hoặc được điều chỉnh thủ công khi cần.

### 9.2 Các trường hợp biến động kho

| Nghiệp vụ                    | Tác động tồn kho                                          |
| ---------------------------- | --------------------------------------------------------- |
| Bán vàng/bạc                 | Xuất kho (-) theo trọng lượng                             |
| Mua vàng vào (vàng của quán) | Nhập kho (+) theo trọng lượng                             |
| Mua thêm (trade-up)          | Xuất SP mới (-), Nhập vàng cũ (+)                         |
| Đổi hàng                     | Xuất SP mới (-), Nhập SP cũ (+)                           |
| Đổi thành tiền               | Nhập vàng cũ phần A (+), Xuất SP mới phần B (-)           |
| Điều chỉnh thủ công          | Xuất hoặc Nhập theo lệnh của Quản lý (`INVENTORY_MANAGE`) |

> **Khớp code (`ResolveInventoryDirection`):** chiều kho **tự động** suy theo `TransactionType` + `ItemRole`: `SellGold/SellSilver` + `ExchangeGold/ExchangeFree` (vai trò thường) ⇒ **OUT**; `BuyGold/BuyMoreGold/ExchangeToMoney` và phần hàng-vào của thu đổi ⇒ **IN**; `ExchangeCurrency` ⇒ **bỏ qua**.
>
> **3 điểm cần lưu ý (đã xác minh từ code):**
>
> 1. Tồn kho được áp dụng **ngay khi TẠO giao dịch** (`ApplyInventoryChangesAsync`), **không** chờ duyệt/hoàn tất. Duyệt/từ chối **không** đảo ngược kho.
> 2. `InventoryItem.WeightGram` là **TỔNG cả lô** (= mỗi-món × số lượng); điều chỉnh thủ công suy trọng lượng theo bình quân mỗi đơn vị.
> 3. **Chưa có endpoint khai báo tồn kho ban đầu** độc lập. `InventoryItem` chỉ phát sinh qua giao dịch nhập (chiều IN) hoặc dữ liệu seed; `POST /api/inventory/{id}/adjust` yêu cầu mục kho **đã tồn tại**.

### 9.3 Cấu trúc tồn kho

```
Chuỗi Khamphouvong
  └── Chi nhánh A (Vientiane Main)
      ├── Tủ 1 (Khay trưng bày 1)
      │   ├── Nhẫn vàng 9999 — X chỉ — Y chiếc
      │   └── Vòng vàng 750  — X chỉ — Y chiếc
      └── Tủ 2 (Khay trưng bày 2)
          └── ...
```

### 9.4 Thông tin tồn kho theo mặt hàng

| Thông tin    | Mô tả                                          |
| ------------ | ---------------------------------------------- |
| Nhóm hàng    | Nhẫn / Vòng / Lắc / Đồng tiền / Bạc Mỹ nghệ... |
| Tên sản phẩm | Tên đầy đủ                                     |
| Tuổi vàng    | 9999 / 750 / ...                               |
| Trọng lượng  | Chỉ / Baht / Phân + gram                       |
| Số lượng     | Số chiếc                                       |
| Giá trị tồn  | Tính theo giá hiện tại                         |

### 9.5 Báo cáo nhập xuất tồn

Theo kỳ (ngày/tuần/tháng):

| Chỉ tiêu      | Mô tả                         |
| ------------- | ----------------------------- |
| Tồn đầu kỳ    | Trọng lượng/số lượng đầu kỳ   |
| Nhập trong kỳ | Mua vào + nhập từ điều chuyển |
| Xuất trong kỳ | Bán ra + xuất điều chuyển     |
| Tồn cuối kỳ   | = Đầu kỳ + Nhập - Xuất        |

### 9.6 Ví dụ

Xuất kho 10 nhẫn 1 chỉ + 5 vòng 2 chỉ:

- Trọng lượng xuất nhẫn = 10 × 1 = 10 chỉ
- Trọng lượng xuất vòng = 5 × 2 = 10 chỉ
- Tổng xuất = **20 chỉ**; Kho giảm 20 chỉ vàng

---

## 10. Nghiệp vụ Quản lý Dòng Tiền / Sổ Quỹ

### 10.1 Mô tả

Theo dõi toàn bộ thu/chi tiền mặt và tài khoản ngân hàng theo từng ngày tại mỗi chi nhánh. Hiện trạng khảo sát: chủ yếu đang quản lý sổ tiền mặt trên giấy — hệ thống sẽ số hóa toàn bộ.

### 10.2 Luồng quy trình trong ngày

```
ĐẦU NGÀY
  │ Nhân viên nhập số dư đầu ngày
  │ (= Số cuối ngày hôm trước)
  │ Theo từng loại tiền: Kip, THB, USD
  │ Theo nguồn: Tiền mặt / Tài khoản ngân hàng
  ▼
TRONG NGÀY
  │ Ghi nhận thu/chi theo từng giao dịch phát sinh:
  │   THU: bán hàng, đổi ngoại tệ, nộp quỹ từ hội sở
  │   CHI: mua vàng, bù chênh lệch đổi hàng, chi phí vận hành
  │ Phân biệt phương thức: Tiền mặt / Chuyển khoản
  │ Phân biệt loại tiền: Kip / THB / USD
  ▼
CUỐI NGÀY
  │ Kiểm kê tiền mặt theo từng mệnh giá:
  │   Ví dụ: 10 tờ × 100.000 ₭ + 20 tờ × 50.000 ₭ + ...
  │ Hệ thống tự tính tổng theo mệnh giá
  │ So sánh: Số dư đầu ngày + Phát sinh = Số cuối ngày lý thuyết
  │ Đối chiếu với số kiểm kê thực tế
  │ Xác định: Thừa / Thiếu quỹ
  │ Lưu vết: người kiểm, thời điểm kiểm, ảnh/giấy kèm theo
  ▼
BÁO CÁO TỒN QUỸ
  Cơ cấu: Tiền mặt / Tài khoản / Theo loại tiền
  Chênh lệch thừa/thiếu nếu có
```

### 10.3 Phân loại nghiệp vụ sổ quỹ

| Loại    | Nghiệp vụ                                                                  |
| ------- | -------------------------------------------------------------------------- |
| **THU** | Bán vàng/bạc; Thu đổi ngoại tệ (thu tiền Kip ra); Nộp quỹ từ hội sở        |
| **CHI** | Mua vàng từ khách; Bù chênh lệch đổi vàng/đổi thành tiền; Chi phí vận hành |

### 10.4 Kiểm kê tiền mặt cuối ngày

Hệ thống hỗ trợ nhập số tờ theo từng mệnh giá:

| Mệnh giá              | Số tờ | Thành tiền   |
| --------------------- | ----- | ------------ |
| 100.000 ₭             | X tờ  | X × 100.000  |
| 50.000 ₭              | X tờ  | X × 50.000   |
| 20.000 ₭              | X tờ  | X × 20.000   |
| 10.000 ₭              | X tờ  | X × 10.000   |
| 5.000 ₭               | X tờ  | X × 5.000    |
| **Tổng tiền mặt Kip** | —     | Tự động tính |

Tương tự cho THB, USD nếu cần quản lý.

---

## 11. Công thức tính giá

### 11.1 Bán vàng

```
Tiền vàng 1 dòng  = Trọng lượng (chỉ) × Giá vàng bán ra (₭/chỉ)
Tổng tiền hàng    = Σ Tiền từng dòng
Tổng phải thu     = Tổng tiền hàng + Phí gia công + Phí đá đính kèm
```

### 11.2 Mua vàng

```
Tiền mua vào = Trọng lượng (chỉ) × Giá vàng mua vào (₭/chỉ)
Tổng phải chi = Tiền mua vào
  (không có phí gia công hay đá khi mua vào)
```

### 11.3 Mua thêm (Trade-up)

```
Giá trị vàng cũ   = Trọng lượng cũ × Giá bán ra hiện tại
Giá SP mới        = Trọng lượng mới × Giá bán ra + Tiền đá + Tiền công
Tiền hao hụt      = Trọng lượng hao hụt × Giá bán ra hiện tại
Tổng khách trả    = Giá SP mới - Giá trị vàng cũ + Phí hư hại + Tiền hao hụt
```

### 11.4 Đổi hàng (khác loại)

```
Tiền thu thêm = Tiền đá SP mới + Tiền công SP mới
              + Phí hư hại (nếu có) + Tiền hao hụt (nếu có)
              - Tiền đá SP cũ (nếu cửa hàng miễn theo chính sách)
```

### 11.5 Đổi thành tiền

```
Tiền định giá phần đổi tiền = Trọng lượng A × Giá mua vào
Tiền khách thực nhận        = Tiền định giá A - Tiền đá SP B - Tiền công SP B - Phí hư hại
```

### 11.6 Thu đổi ngoại tệ

```
Tiền LAK = Số lượng ngoại tệ × (Tỷ giá + Điều chỉnh tỷ giá)
```

### 11.7 Bán bạc

```
Tổng tiền bạc = Trọng lượng (gram) × Đơn giá bạc (₭/gram)
```

### 11.8 Lãi gộp tạm tính (Theo dõi lời/lỗ)

```
Doanh thu bán   = Tiền vàng + Tiền đá + Tiền công
Giá vốn vàng    = Trọng lượng × Giá mua vào
Lãi gộp tạm    = Doanh thu bán - Giá vốn vàng
(Chưa trừ chi phí vận hành)
```

Ví dụ: Mua 1 chỉ vào = 8.700.000 ₭; Bán ra = 9.800.000 ₭
→ Lãi gộp = **1.100.000 ₭** trên 1 chỉ vàng

---

## 12. Quy trình phê duyệt giao dịch

### 12.1 Trạng thái giao dịch (`TransactionStatus`)

Enum: `Draft(0) · Pending(1) · Approved(2) · Rejected(3) · Completed(4)`

```
        tạo GD (mặc định)
              ▼
        ┌──────────┐  DepositAmount > 0 /   ┌──────────┐
        │  DRAFT   │ ───RequestApproval()──►│ PENDING  │  (đặt cọc / chờ duyệt)
        └────┬─────┘                        └────┬─────┘
             │                                   ├───────────────┐
             │ Complete()                        ▼               ▼
             │                              ┌──────────┐   ┌──────────┐
             │                              │ APPROVED │   │ REJECTED │
             │                              └────┬─────┘   └──────────┘
             │                                   │ Complete()
             ▼                                   ▼
        ┌────────────────────────────────────────────┐
        │                 COMPLETED                   │  KHÔNG THỂ SỬA/XÓA
        └────────────────────────────────────────────┘
```

> **Khớp code:** `Complete()` chấp nhận từ **Draft, Pending hoặc Approved**. Giao dịch tạo mới luôn ở **Draft**, **trừ khi** `DepositAmount > 0` thì tự chuyển **Pending** (`SetDeposit`). `Approve()`/`Reject()` chỉ áp dụng từ **Pending**.

### 12.2 Quy tắc phân luồng

| Điều kiện                        | Luồng                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Giao dịch thường (không đặt cọc) | Tạo ở **DRAFT**                                                                          |
| Có đặt cọc (`DepositAmount > 0`) | Tạo ở **PENDING** (đặt hàng trước)                                                       |
| Duyệt / Từ chối                  | `PENDING → APPROVED / REJECTED` — cần quyền `TRANSACTION_APPROVE` (Manager, SystemAdmin) |
| Hoàn tất                         | `Complete()` từ Draft/Pending/Approved → **COMPLETED**                                   |
| Điều chỉnh tồn kho thủ công      | Cần quyền `INVENTORY_MANAGE` (Manager, SystemAdmin)                                      |

> **Chưa có trong code (khác mô tả khảo sát):** không có logic **tự động** đẩy sang PENDING theo "hạn mức giá trị" hay "liên chi nhánh" — **đặt cọc** là yếu tố duy nhất tự chuyển PENDING. Các thao tác **Approve / Reject / Complete đã có ở tầng domain + handler nhưng CHƯA gắn endpoint HTTP** (API hiện chỉ expose: tạo GD, xem chi tiết, danh sách). Toàn chuỗi dùng **chung quỹ**, không tách luồng liên nhánh.

### 12.3 Giao dịch đảo phiếu

- Giao dịch đã COMPLETED **không thể sửa hoặc xóa**
- Nếu cần điều chỉnh: tạo **giao dịch đảo phiếu mới** có liên kết đến giao dịch gốc

---

## 13. Chức năng các module hệ thống

### 13.1 Module Quầy Giao Dịch (POS Counter)

Trung tâm nghiệp vụ của hệ thống — nhân viên quầy sử dụng để tạo mọi loại giao dịch.

| Chức năng           | Mô tả                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Chọn loại nghiệp vụ | Mua vào / Bán ra / Mua thêm / Đổi hàng / Đổi thành tiền / Thu đổi ngoại tệ |
| Tải giá tự động     | Tải giá vàng, tỷ giá ngoại tệ hiện hành khi mở form                        |
| Thêm hàng vào đơn   | Chọn sản phẩm, nhập trọng lượng/số lượng                                   |
| Tính tiền tự động   | Hệ thống tính tổng tiền theo công thức nghiệp vụ tương ứng                 |
| Nhập phí thủ công   | Phí gia công, phí đá (nhân viên nhập tay)                                  |
| Chọn phương thức TT | Tiền mặt / Chuyển khoản / Kết hợp                                          |
| Xác nhận & lưu      | Tạo giao dịch, cập nhật tồn kho, ghi sổ quỹ                                |
| In chứng từ         | Xuất và in phiếu bán hàng/mua hàng                                         |

### 13.2 Module Nhật Ký Hóa Đơn (Invoice Journal)

| Chức năng         | Mô tả                                          |
| ----------------- | ---------------------------------------------- |
| Danh sách hóa đơn | Lọc theo: chi nhánh, ngày, loại GD, trạng thái |
| Tìm kiếm          | Theo mã HĐ, tên nhân viên, số tiền             |
| Xem chi tiết      | Popup "Báo cáo chi tiết chứng từ quầy"         |
| In lại chứng từ   | Xuất và in lại chứng từ đã lưu                 |
| Lọc theo quầy/tủ  | Xem GD theo từng tủ phục vụ                    |

### 13.3 Module Kho Hàng Hóa (Inventory)

| Chức năng             | Mô tả                                      |
| --------------------- | ------------------------------------------ |
| Xem tồn kho hiện tại  | Tồn kho theo chi nhánh, khay/tủ, nhóm hàng |
| Báo cáo nhập xuất tồn | Tồn đầu kỳ / Nhập / Xuất / Tồn cuối kỳ     |
| Điều chỉnh tồn kho    | Điều chỉnh thủ công (cần phê duyệt)        |
| Lịch sử biến động     | Xem từng lần nhập/xuất kho                 |

### 13.4 Module Sổ Quỹ Thu Chi (Cash Ledger)

| Chức năng            | Mô tả                                              |
| -------------------- | -------------------------------------------------- |
| Số dư đầu ngày       | Nhập và lưu số dư đầu ngày theo loại tiền          |
| Sổ quỹ hoạt động     | Danh sách thu/chi trong ngày theo thứ tự thời gian |
| Tổng thu / Chi       | Tổng hợp theo kỳ                                   |
| Kiểm kê cuối ngày    | Nhập số tờ theo mệnh giá, tự tính tổng             |
| Đối chiếu thừa/thiếu | So sánh lý thuyết vs thực tế                       |
| Báo cáo tồn quỹ      | Cơ cấu tiền mặt + tài khoản                        |

### 13.5 Module Hội Sở Quản Trị (Admin Dashboard)

| Chức năng               | Đối tượng                                           |
| ----------------------- | --------------------------------------------------- |
| Dashboard KPI           | Tổng thu, Tổng chi, Lợi nhuận gộp, Số GD toàn chuỗi |
| Duyệt giao dịch         | Danh sách GD chờ duyệt từ tất cả chi nhánh          |
| Bảng xếp hạng chi nhánh | Hiệu suất từng chi nhánh/quầy                       |
| Báo cáo tổng hợp        | Xem dữ liệu toàn chuỗi                              |

### 13.6 Module Thiết Lập Cấu Hình (System Configuration)

| Chức năng                  | Mô tả                                          |
| -------------------------- | ---------------------------------------------- |
| Cập nhật bảng giá vàng     | Giá vàng 9999 theo chỉ/baht (mua vào & bán ra) |
| Cập nhật giá bạc           | Đơn giá bạc theo gram                          |
| Cập nhật tỷ giá ngoại tệ   | THB, USD và các loại khác                      |
| Điều chỉnh tỷ giá (spread) | Khoản điều chỉnh cộng thêm vào tỷ giá          |
| Thử nghiệm nhanh           | Panel tính toán thử không tạo GD thật          |
| Lịch sử thay đổi giá       | Xem audit trail toàn bộ lần cập nhật giá       |

---

## 14. Phân quyền theo chức năng

Bảng dưới khớp **đúng `role_permissions` seed trong code** (4 role × 17 permission):

| Hành động (permission)                                                                          | `Cashier` | `ThuQuy` | `Manager` | `SystemAdmin` |
| ----------------------------------------------------------------------------------------------- | :-------: | :------: | :-------: | :-----------: |
| Lập đơn giao dịch (`TRANSACTION_CREATE`)                                                        |     ✓     |    ✓     |     ✓     |       ✓       |
| Lập đơn thu đổi (`TRADE_CREATE`)                                                                |     ✓     |    ✗     |     ✓     |       ✓       |
| Xem kho (`INVENTORY_VIEW`)                                                                      |     ✓     |    ✓     |     ✓     |       ✓       |
| Xem tất cả giao dịch (`TRANSACTION_VIEW_ALL`)                                                   |     ✗     |    ✗     |     ✓     |       ✓       |
| Duyệt GD / thu đổi (`TRANSACTION_APPROVE`, `TRADE_APPROVE`)                                     |     ✗     |    ✗     |     ✓     |       ✓       |
| Quản lý kho — nhập/xuất/điều chỉnh (`INVENTORY_MANAGE`)                                         |     ✗     |    ✗     |     ✓     |       ✓       |
| Quản lý sổ quỹ (`CASH_LEDGER_MANAGE`)                                                           |     ✗     |    ✓     |     ✓     |       ✓       |
| Báo cáo ngày (`REPORT_DAILY`)                                                                   |     ✗     |    ✓     |     ✓     |       ✓       |
| Dashboard (`REPORT_DASHBOARD`)                                                                  |     ✗     |    ✗     |     ✓     |       ✓       |
| Cấu hình giá/tỷ giá (`CONFIG_PRICE`)                                                            |     ✗     |    ✗     |     ✓     |       ✓       |
| Cấu hình đơn vị/đá/tuổi vàng (`CONFIG_WEIGHT_UNIT`, `CONFIG_STONE_PRICE`, `CONFIG_GOLD_PURITY`) |     ✗     |    ✗     |     ✓     |       ✓       |
| Quản lý sản phẩm & danh mục (`PRODUCT_MANAGE`)                                                  |     ✗     |    ✗     |     ✓     |       ✓       |
| Quản lý chi nhánh (`BRANCH_MANAGE`)                                                             |     ✗     |    ✗     |     ✗     |       ✓       |
| Quản lý người dùng & phân quyền (`USER_MANAGE`)                                                 |     ✗     |    ✗     |     ✗     |       ✓       |

> **Lưu ý:** quản lý **chi nhánh** và **người dùng/phân quyền** hiện **chỉ** `SystemAdmin`. `Manager` gom toàn bộ quyền vận hành cửa hàng (duyệt, kho, giá, sản phẩm, báo cáo). Vì RBAC động, `SystemAdmin` có thể gán lại quyền cho role bất kỳ.

---

## 15. Ràng buộc nghiệp vụ quan trọng

| Ràng buộc                                        | Mô tả                                                                                             | Lý do                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Không sửa GD đã COMPLETED**                    | Chỉ tạo giao dịch đảo phiếu mới                                                                   | Đảm bảo tính toàn vẹn dữ liệu tài chính                                       |
| **Snapshot giá tại thời điểm GD**                | Giá vàng/tỷ giá phải lưu vào dòng giao dịch                                                       | Giá thay đổi theo giờ; tránh sai lệch khi tra cứu lại                         |
| **Không ghi đè bảng giá cũ**                     | Mỗi cập nhật giá tạo bản ghi mới với `effective_from`                                             | Cần tra cứu giá tại bất kỳ thời điểm lịch sử                                  |
| **Vàng ngoài không mua thêm trực tiếp**          | Phải qua luồng mua vào rồi bán ra                                                                 | Kiểm soát chất lượng và nguồn gốc hàng hóa                                    |
| **Giá gia công nhân viên tự báo**                | Không cố định, khác theo từng thợ                                                                 | Phản ánh thực tế vận hành cửa hàng                                            |
| **Đổi miễn phí trong 1 tháng**                   | Chỉ áp dụng khi: vàng quán + ≤1 tháng + không hư + cùng giá                                       | Chính sách bảo hành của cửa hàng                                              |
| **Kiểm kê theo mệnh giá**                        | Nhập số tờ từng mệnh giá để tính tổng                                                             | Phương pháp kiểm quỹ thực tế                                                  |
| **Số cuối ngày hôm trước = Số đầu ngày hôm sau** | Liên tục, không gián đoạn                                                                         | Đảm bảo sổ quỹ khớp liên tục                                                  |
| **Đặt cọc đẩy GD sang chờ duyệt**                | `DepositAmount > 0` ⇒ trạng thái `PENDING`; `Manager`/`SystemAdmin` duyệt (`TRANSACTION_APPROVE`) | Kiểm soát đơn đặt hàng trước. _(Hạn mức giá trị / liên chi nhánh: chưa code)_ |
| **Mọi thay đổi giá phải ghi audit log**          | Lưu: ai thay đổi, khi nào, giá trị cũ/mới                                                         | Minh bạch, truy vết khi có tranh chấp                                         |

---

_Tài liệu tổng hợp từ Báo cáo khảo sát quy trình thực tế tại Khamphouvong và Tài liệu Kiến trúc hệ thống POS, **đã đối chiếu mã nguồn backend (11/06/2026)**. Xem thêm: `docs/API Reference.md`, `docs/Sơ đồ Kiến trúc & Luồng Nghiệp vụ.md`. Cập nhật khi nghiệp vụ hoặc code thay đổi._
