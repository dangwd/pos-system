# Sơ đồ Kiến trúc & Luồng Nghiệp vụ — POS Khamphouvong

> Tài liệu trực quan hoá kiến trúc hệ thống và các luồng nghiệp vụ chính, dùng sơ đồ **Mermaid** (render trực tiếp trên GitHub và VSCode — cài extension _Markdown Preview Mermaid Support_ nếu cần).
> Các sơ đồ được dựng từ **mã nguồn thực tế** (entities, EF configurations, handlers), không phải mô tả lý thuyết.

## Mục lục

1. [Kiến trúc triển khai (Deployment)](#1-kiến-trúc-triển-khai-deployment)
2. [Clean Architecture & phân lớp](#2-clean-architecture--phân-lớp)
3. [Vòng đời một request (CQRS pipeline)](#3-vòng-đời-một-request-cqrs-pipeline)
4. [Bản đồ module nghiệp vụ](#4-bản-đồ-module-nghiệp-vụ)
5. [ERD — Tổ chức & Phân quyền](#5-erd--tổ-chức--phân-quyền)
6. [ERD — Sản phẩm, Định giá & Kho](#6-erd--sản-phẩm-định-giá--kho)
7. [ERD — Giao dịch & Quỹ](#7-erd--giao-dịch--quỹ)
8. [Luồng xác thực JWT](#8-luồng-xác-thực-jwt)
9. [Máy trạng thái giao dịch](#9-máy-trạng-thái-giao-dịch)
10. [Luồng bán hàng POS & tác động tồn kho](#10-luồng-bán-hàng-pos--tác-động-tồn-kho)
11. [Kho — Nhập kho và Xuất kho](#11-kho--nhập-kho-và-xuất-kho)
12. [Các loại giao dịch](#12-các-loại-giao-dịch)
13. [Luồng Thu đổi / Trade](#13-luồng-thu-đổi--trade)
14. [Chuỗi thiết lập định giá (Vàng / Bạc / Đá)](#14-chuỗi-thiết-lập-định-giá-vàng--bạc--đá)
15. [Luồng sổ quỹ tiền mặt hàng ngày](#15-luồng-sổ-quỹ-tiền-mặt-hàng-ngày)
16. [Ghi chú độ chính xác](#16-ghi-chú-độ-chính-xác)

---

## 1. Kiến trúc triển khai (Deployment)

Mô hình **Modular Monolith**: Client → Nginx → Frontend SPA + Backend API → PostgreSQL.

```mermaid
flowchart TB
    subgraph CLIENT["Tầng Người dùng"]
        POS["POS Bán hàng<br/>Web / Tablet"]
        ADMIN["Quản trị & Báo cáo"]
        QUY["Sổ quỹ / Kiểm kê"]
    end

    NGINX["API Gateway · Nginx<br/>TLS · Định tuyến · Rate-limit"]

    subgraph APP["Ứng dụng (Docker Compose)"]
        FE["Frontend SPA<br/>React + Ant Design + Vite"]
        API["Backend API :5000<br/>ASP.NET Core 9 · Clean Arch · CQRS"]
    end

    PG[("PostgreSQL :5432<br/>pos_Khamphouvong")]
    REDIS[("Redis · Cache / Khoá giá")]
    OBJ[("Object Store / Disk<br/>ảnh, chứng từ")]

    POS --> NGINX
    ADMIN --> NGINX
    QUY --> NGINX
    NGINX -->|"/"| FE
    NGINX -->|"/api/*"| API
    API --> PG
    API -.->|kiến trúc tham chiếu| REDIS
    API -.->|kiến trúc tham chiếu| OBJ
```

> **Lưu ý:** `docker-compose.yml` hiện tại gồm **postgres + backend + frontend + nginx**. Redis và Object Store nằm trong kiến trúc tham chiếu nhưng **chưa được triển khai** trong compose hiện tại (vẽ nét đứt).

---

## 2. Clean Architecture & phân lớp

Phụ thuộc một chiều: `API → Application → Domain`, `Infrastructure → Application/Domain`. API là composition root (đăng ký DI).

```mermaid
flowchart TD
    subgraph API["API — Presentation"]
        CTRL["Controllers (thin)<br/>chỉ gọi mediator.Send()"]
        MW["ExceptionHandlingMiddleware<br/>map exception → errorCode"]
        AUTHZ["JwtService · PermissionHandler"]
    end

    subgraph APP["Application — CQRS"]
        CQRS["Commands / Queries + Handlers<br/>(MediatR)"]
        VAL["ValidationBehavior<br/>(FluentValidation pipeline)"]
        IREPO["Repository Interfaces"]
        SVC["PricingCalculator · ITradeService"]
    end

    subgraph DOM["Domain — lõi nghiệp vụ"]
        ENT["Entities · Enums"]
        EXC["PosException<br/>BusinessRule / NotFound / Forbidden"]
    end

    subgraph INFRA["Infrastructure — persistence"]
        DBCTX["AppDbContext (EF Core + Npgsql)"]
        REPO["Repository Implementations"]
        CFG["IEntityTypeConfiguration"]
        SEED["DbSeeder"]
    end

    CTRL --> CQRS
    CQRS --> VAL
    CQRS --> IREPO
    CQRS --> SVC
    CQRS --> ENT
    APP --> DOM
    REPO -.->|hiện thực| IREPO
    INFRA --> APP
    INFRA --> DOM
    API -.->|đăng ký DI| INFRA
```

| Lớp                | Trách nhiệm                                        | Không được phép                            |
| ------------------ | -------------------------------------------------- | ------------------------------------------ |
| **Domain**         | Entities, Enums, Exceptions — thuần nghiệp vụ      | Phụ thuộc lớp khác                         |
| **Application**    | CQRS handlers, repository **interfaces**, services | Inject `AppDbContext`                      |
| **Infrastructure** | EF Core, repository **implementations**, seeder    | —                                          |
| **API**            | Controllers mỏng, middleware, JWT, DI              | Đặt business logic / inject `AppDbContext` |

---

## 3. Vòng đời một request (CQRS pipeline)

```mermaid
sequenceDiagram
    actor C as Client
    participant N as Nginx
    participant M as ExceptionMiddleware
    participant A as Auth / Authz
    participant Ctl as Controller
    participant Med as MediatR
    participant V as ValidationBehavior
    participant H as Handler
    participant R as Repository
    participant DB as PostgreSQL

    C->>N: HTTP /api/...
    N->>M: forward (:5000)
    M->>A: JWT + Permission (RBAC)
    A->>Ctl: action
    Ctl->>Med: mediator.Send(Command/Query)
    Med->>V: FluentValidation
    alt dữ liệu không hợp lệ
        V-->>M: ValidationException
        M-->>C: 422 VALIDATION_FAILED + errors
    else hợp lệ
        V->>H: Handle()
        H->>R: repository method
        R->>DB: EF Core query / SaveChanges
        DB-->>R: rows
        R-->>H: entities
        alt vi phạm nghiệp vụ
            H-->>M: BusinessRule/NotFoundException
            M-->>C: 4xx + errorCode
        else thành công
            H-->>Ctl: Result
            Ctl-->>C: 200 JSON
        end
    end
```

Thứ tự ưu tiên map lỗi trong `ExceptionHandlingMiddleware`:
`ValidationException` → 422 · `PosException` (dùng `StatusCode`/`ErrorCode`) · `UnauthorizedAccessException` → 403 · còn lại → 500 `SYSTEM_INTERNAL_ERROR`.

---

## 4. Bản đồ module nghiệp vụ

```mermaid
flowchart LR
    AUTH["Auth & RBAC<br/>users · roles · permissions"]
    MASTER["Danh mục<br/>branches · counters · products · customers"]
    PRICE["Giá & Định giá<br/>price_configs · exchange_rates<br/>gold_purities · stone_price_rules · weight_units"]
    POS["Bán hàng POS<br/>transactions · transaction_items"]
    TRADE["Mua vào / Thu đổi<br/>trade_txns"]
    INV["Kho<br/>inventory · adjustment_logs"]
    CASH["Quỹ & Dòng tiền<br/>opening_balance · manual_entry · cash_count"]
    REPORT["Báo cáo & Lãi/Lỗ"]

    AUTH --> POS
    AUTH --> TRADE
    MASTER --> POS
    MASTER --> TRADE
    PRICE --> POS
    PRICE --> TRADE
    POS --> INV
    TRADE --> INV
    POS --> CASH
    TRADE --> CASH
    POS --> REPORT
    CASH --> REPORT
    INV --> REPORT
```

---

## 5. ERD — Tổ chức & Phân quyền

```mermaid
erDiagram
    BRANCH ||--o{ COUNTER : "có"
    BRANCH ||--o{ APPUSER : "thuộc (index, không FK)"
    COUNTER ||--o{ APPUSER : "phân công (SetNull)"
    APPROLE ||--o{ APPUSER : "vai trò (Restrict)"
    APPUSER ||--o{ REFRESHTOKEN : "phiên (Cascade)"
    APPROLE ||--o{ ROLE_PERMISSION : "gán (Cascade)"
    APPPERMISSION ||--o{ ROLE_PERMISSION : "thuộc (Cascade)"

    BRANCH {
        guid Id PK
        string Name
        bool IsHeadquarters
        bool IsActive
    }
    COUNTER {
        guid Id PK
        guid BranchId FK
        string CounterName
        bool IsActive
    }
    APPUSER {
        guid Id PK
        string EmployeeCode UK
        string Username UK
        guid RoleId FK
        guid BranchId "index"
        guid CounterId FK "nullable"
        bool IsActive
    }
    APPROLE {
        guid Id PK
        string Code UK
        string Name
        bool IsSystem
    }
    APPPERMISSION {
        guid Id PK
        string Code UK
        string Group
    }
    ROLE_PERMISSION {
        guid RoleId PK
        guid PermissionId PK
    }
    REFRESHTOKEN {
        guid Id PK
        guid UserId FK
        string Token UK
        datetime ExpiresAt
        bool IsRevoked
    }
```

---

## 6. ERD — Sản phẩm, Định giá & Kho

```mermaid
erDiagram
    PRODUCTCATEGORY ||--o{ PRODUCT : "phân loại (Restrict)"
    WEIGHTUNIT ||--o{ PRODUCT : "đơn vị (SetNull)"
    GOLDPURITY ||--o{ PRODUCT : "hàm lượng (Restrict)"
    GOLDPURITY ||--o{ PRICECONFIGITEM : "hàm lượng (Restrict)"
    WEIGHTUNIT ||--o{ PRICECONFIGITEM : "đơn vị (Restrict)"
    PRICECONFIG ||--o{ PRICECONFIGITEM : "chi tiết (Cascade)"
    GOLDPURITY ||--o{ INVENTORYITEM : "loại (SetNull)"

    PRODUCTCATEGORY {
        guid Id PK
        string Code UK "Gold/Silver/Stone/Currency"
        string Name
    }
    PRODUCT {
        guid Id PK
        string ProductCode UK
        guid ProductCategoryId FK
        guid GoldPurityId FK "nullable (Đá/Ngoại tệ = null)"
        guid WeightUnitId FK "nullable"
        decimal WeightGram
        enum ProductType
    }
    GOLDPURITY {
        guid Id PK
        string Ma UK "9999/750/925"
        decimal HamLuong
        string Category "Gold | Silver"
    }
    PRICECONFIG {
        guid Id PK
        guid UpdatedBy
        datetime EffectiveFrom
    }
    PRICECONFIGITEM {
        guid Id PK
        guid PriceConfigId FK
        guid GoldPurityId FK
        guid WeightUnitId FK "đơn vị tính giá"
        string PurityCode "snapshot"
        string WeightUnitCode "snapshot"
        decimal GramPerUnit "snapshot"
        decimal BuyPrice "giá mua / đơn vị"
        decimal SellPrice "giá bán / đơn vị"
    }
    STONEPRICERULE {
        guid Id PK
        decimal TuSoChi
        decimal DenSoChi
        decimal GiaDa
    }
    WEIGHTUNIT {
        guid Id PK
        string MaTocDoc UK "chi/luong/cay"
        decimal GramPerUnit "nguồn sự thật"
        bool IsSystem
    }
    EXCHANGERATE {
        guid Id PK
        string CurrencyCode "THB/USD"
        decimal RateToLak
        decimal Adjustment
        datetime EffectiveFrom
    }
    INVENTORYITEM {
        guid Id PK
        guid BranchId "index"
        guid ProductId "snapshot, không FK"
        string Purity
        int Quantity
        decimal WeightGram
        enum NguonGoc "Quan | Ngoai"
        enum TrangThai
        guid PurityId FK "nullable"
    }
```

> `STONEPRICERULE` và `EXCHANGERATE` là bảng cấu hình độc lập (không FK), nên đứng riêng.

---

## 7. ERD — Giao dịch & Quỹ

```mermaid
erDiagram
    CUSTOMER ||--o{ TRANSACTION : "khách (SetNull)"
    TRANSACTION ||--o{ TRANSACTIONITEM : "dòng hàng (Cascade)"
    WEIGHTUNIT ||--o{ TRANSACTIONITEM : "đơn vị (SetNull)"
    CUSTOMER ||--o{ TRADETXN : "khách (SetNull)"
    INVENTORYITEM ||--o{ TRADETXN : "item cũ (Restrict)"
    INVENTORYITEM ||--o{ TRADETXN : "item mới (Restrict)"
    CASHCOUNTSHEET ||--o{ CASHCOUNTITEM : "mệnh giá (Cascade)"

    TRANSACTION {
        guid Id PK
        string InvoiceCode UK
        enum Type "8 loại"
        enum Status "Draft..Completed"
        guid BranchId "không FK"
        guid CashierId "không FK"
        string CounterId "chuỗi, không FK"
        guid CustomerId FK "nullable"
        decimal TotalAmount
        decimal DepositAmount
        string PaymentMethod "CASH/BANK"
    }
    TRANSACTIONITEM {
        guid Id PK
        guid TransactionId FK
        guid ProductId "snapshot"
        decimal WeightGram
        decimal UnitPriceLak "đơn giá/gram"
        decimal LaborFee
        decimal StoneFee
        enum ItemRole "Normal | ExchangeIn"
    }
    TRADETXN {
        guid Id PK
        string TxnCode UK
        enum Loai "MuaThem/DoiHang/DoiMienPhi/DoiThanhTien"
        guid ItemCuId FK
        guid ItemMoiId FK "nullable"
        guid CustomerId FK "nullable"
        decimal PhiHuHai
        decimal TienHaoHut
        decimal TienCong
        decimal ChenhLech "dương khách trả, âm hoàn"
    }
    CUSTOMER {
        guid Id PK
        string Name
        string PhoneNumber
        string LoyaltyTier
    }
    DAILYOPENINGBALANCE {
        guid Id PK
        guid BranchId "UK(BranchId,Date)"
        date Date
        decimal CashAmountLak
        decimal BankAmountLak
    }
    MANUALCASHENTRY {
        guid Id PK
        string EntryCode
        string Direction "IN | OUT"
        string Method "CASH | BANK"
        decimal AmountLak
    }
    CASHCOUNTSHEET {
        guid Id PK
        guid BranchId
        date Date
        bool IsFinalized
        string HandoverCode
    }
    CASHCOUNTITEM {
        guid Id PK
        guid SheetId FK
        int Denomination
        int Quantity
    }
```

---

## 8. Luồng xác thực JWT

```mermaid
sequenceDiagram
    actor C as Client
    participant Ctl as AuthController
    participant H as LoginHandler
    participant R as AuthRepository
    participant J as JwtService
    participant DB as PostgreSQL

    Note over C,DB: Đăng nhập
    C->>Ctl: POST /api/auth/login (username, password)
    Ctl->>H: LoginCommand
    H->>R: FindUserWithRoleAsync (Include Role + Permissions)
    R->>DB: query
    H->>H: BCrypt.Verify + check IsActive
    H->>J: GenerateAccessToken (sub, role_code, permission[])
    H->>J: GenerateRefreshToken
    H->>R: AddRefreshTokenAsync
    H-->>C: accessToken + refreshToken + role + permissions

    Note over C,DB: Làm mới token
    C->>Ctl: POST /api/auth/refresh (refreshToken)
    Ctl->>H: RefreshTokenCommand
    H->>R: FindValidRefreshTokenWithUserAsync
    H->>H: revoke token cũ
    H->>J: cấp accessToken + refreshToken mới
    H-->>C: cặp token mới
```

- Access token chứa claim: `sub` (userId), `unique_name`, `role_code`, và nhiều claim `permission`.
- `PermissionHandler` kiểm tra claim `permission` khớp policy `[Authorize(Policy = ...)]` trên từng endpoint.

---

## 9. Máy trạng thái giao dịch

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Pending: RequestApproval()
    Draft --> Pending: SetDeposit(> 0)
    Draft --> Completed: Complete()
    Pending --> Approved: Approve(by)
    Pending --> Rejected: Reject(by)
    Approved --> Completed: Complete(paymentMethod)
    Completed --> [*]
    Rejected --> [*]

    note right of Completed
        Đã COMPLETED không sửa/xóa
        chỉ tạo phiếu đảo
    end note
```

> **Quan trọng:** tồn kho được áp dụng **ngay khi tạo giao dịch** (`ApplyInventoryChangesAsync`), không phải lúc duyệt/hoàn tất. Duyệt/từ chối **không** đảo ngược tồn kho.

---

## 10. Luồng bán hàng POS & tác động tồn kho

```mermaid
flowchart TD
    A["POST /api/transactions"] --> B{"Type = ExchangeFree?"}
    B -->|Có| B1["Kiểm tra hóa đơn tham chiếu<br/>tồn tại & ≤ 30 ngày"]
    B -->|Không| C
    B1 --> C["Tạo Transaction (Draft)<br/>sinh InvoiceCode theo loại"]
    C --> D["Lặp các dòng hàng:<br/>validate WeightUnit · tính WeightGram<br/>snapshot UnitPriceLak"]
    D --> E["Set Customer / Currency / Deposit / Note"]
    E --> F["Lưu Transaction"]
    F --> G["ApplyInventoryChanges"]
    G --> H{"ResolveDirection<br/>(Type, ItemRole)"}
    H -->|IN| I["Lấy/Tạo InventoryItem → Increase"]
    H -->|OUT| J["Lấy InventoryItem → Decrease<br/>(thiếu hàng ⇒ lỗi)"]
    H -->|NULL| K["Bỏ qua (ExchangeCurrency)"]
    I --> L["Ghi InventoryAdjustmentLog (ADJ-xxx)"]
    J --> L
    L --> M["Trả TransactionId"]
    K --> M
```

**Ma trận chiều tồn kho** (`ResolveInventoryDirection`):

| Loại giao dịch              | ItemRole   | Tồn kho    |
| --------------------------- | ---------- | ---------- |
| SellGold / SellSilver       | Normal     | **OUT**    |
| ExchangeGold / ExchangeFree | Normal     | **OUT**    |
| BuyGold / BuyMoreGold       | bất kỳ     | **IN**     |
| ExchangeGold / ExchangeFree | ExchangeIn | **IN**     |
| ExchangeToMoney             | bất kỳ     | **IN**     |
| ExchangeCurrency            | —          | **bỏ qua** |

> Công thức tổng: `TotalAmount = SubtotalAmount − ExchangeCredit + LaborFee + StoneFee`. `LineTotal` mỗi dòng = `WeightGram × UnitPriceLak`. `DepositAmount > 0` tự chuyển Draft → Pending.

---

## 11. Kho — Nhập kho và Xuất kho

Tồn kho (`inventory_items`) biến động qua **hai đường**, cả hai đều cộng/trừ `Quantity` + `WeightGram` của `InventoryItem` và ghi một bản ghi `InventoryAdjustmentLog` (`ADJ-xxx`):

| Đường        | Kích hoạt                                                    | Chiều                                           | Tham chiếu   |
| ------------ | ------------------------------------------------------------ | ----------------------------------------------- | ------------ |
| **Tự động**  | Giao dịch POS / Thu đổi (`ApplyInventoryChangesAsync`)       | IN/OUT theo ma trận `ResolveInventoryDirection` | Mục 10       |
| **Thủ công** | `POST /api/inventory/{id}/adjust` (policy `InventoryManage`) | `IN` = **nhập kho** · `OUT` = **xuất kho**      | (sơ đồ dưới) |

### 11.1. Luồng điều chỉnh thủ công (`AdjustInventoryCommandHandler`)

```mermaid
flowchart TD
    A["POST /api/inventory/{id}/adjust<br/>policy: InventoryManage"] --> B{"Direction ∈ {IN, OUT}?"}
    B -->|Không| E1["422 INVENTORY_INVALID_DIRECTION"]
    B -->|Có| C{"Quantity > 0?"}
    C -->|Không| E2["422 INVENTORY_INVALID_QUANTITY"]
    C -->|Có| D{"Reason có nội dung?"}
    D -->|Rỗng| E3["422 INVENTORY_REASON_REQUIRED"]
    D -->|Có| F["Lấy InventoryItem theo Id"]
    F -->|Không thấy| E4["404 INVENTORY_NOT_FOUND"]
    F -->|Thấy| G{"Direction = OUT<br/>và Quantity > tồn?"}
    G -->|Có| E5["422 INVENTORY_INSUFFICIENT_STOCK"]
    G -->|Không| H["perUnit = WeightGram / Quantity<br/>deltaWeight = perUnit × Quantity"]
    H --> I{"Direction"}
    I -->|IN| J["item.Increase(qty, deltaWeight)<br/>📥 NHẬP KHO"]
    I -->|OUT| K["item.Decrease(qty, deltaWeight)<br/>📤 XUẤT KHO"]
    J --> L["Sinh AdjustmentCode = ADJ-{seq:D3}<br/>Tạo InventoryAdjustmentLog"]
    K --> L
    L --> M["AdjustAndSaveAsync(item, log)<br/>1 SaveChanges — nguyên tử"]
    M --> N["200 OK · { item, log }"]
```

**Quy ước:**

- `deltaWeight` suy ra từ **trọng lượng bình quân mỗi đơn vị** (`WeightGram / Quantity`), không nhập tay → giữ nhất quán tổng trọng lượng.
- `AdjustmentCode = ADJ-{seq:D3}` với `seq` = số log hiện có + 1.
- `InventoryItem.Decrease` tự ném lỗi khi vượt tồn; handler kiểm tra trước để trả `INVENTORY_INSUFFICIENT_STOCK` (422) đúng chuẩn errorCode.
- `AdjustAndSaveAsync(item, log)` ghi **item + log trong một `SaveChanges`** (nguyên tử).

### 11.2. Vòng đời trạng thái mục kho (`ItemTrangThai`)

```mermaid
stateDiagram-v2
    [*] --> TiepNhan: nhập kho mới (mặc định)
    TiepNhan --> DaDinhGia: định giá
    DaDinhGia --> TrenQuay: đưa lên quầy
    TrenQuay --> DaBan: bán / Item mới sau thu đổi
    TrenQuay --> ChuyenXuong: Item cũ thu đổi · vàng ngoài / lỗi
    DaBan --> [*]
    ChuyenXuong --> [*]

    note right of ChuyenXuong
        PATCH /api/inventory/{id}/status
        có thể đặt bất kỳ trạng thái
    end note
```

| `ItemTrangThai`   | Ý nghĩa                                                     |
| ----------------- | ----------------------------------------------------------- |
| `TiepNhan` (1)    | Vừa tiếp nhận, chưa định giá (mặc định khi nhập)            |
| `DaDinhGia` (2)   | Đã định giá                                                 |
| `TrenQuay` (3)    | Đang trưng bày, có thể bán                                  |
| `ChuyenXuong` (4) | Chuyển xuống xưởng (vàng ngoài / lỗi / item cũ sau thu đổi) |
| `DaBan` (5)       | Đã bán ra                                                   |

**Nguồn gốc hàng** (`ItemNguonGoc`): `Quan` = vàng của quán (được mua thêm / đổi hàng / đổi miễn phí) · `Ngoai` = vàng ngoài (chỉ mua vào, chuyển xuống xưởng).

### 11.3. Các endpoint Kho

| Method | Route                        | Mục đích                                                                           |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| GET    | `/api/inventory`             | Danh sách tồn — lọc `branchId / category / trayId / status / nguonGoc`; phân trang |
| GET    | `/api/inventory/{id}`        | Chi tiết một mục kho                                                               |
| POST   | `/api/inventory/{id}/adjust` | **Nhập (IN) / Xuất (OUT)** thủ công kèm lý do                                      |
| PATCH  | `/api/inventory/{id}/status` | Đổi `TrangThai`                                                                    |
| GET    | `/api/inventory/adjustments` | Lịch sử điều chỉnh (`ADJ-xxx`)                                                     |

> Ma trận chiều tồn kho **tự động** theo loại giao dịch: xem Mục 10. Cấu trúc bảng `inventory_items`: xem ERD Mục 6. Mã lỗi liên quan: `INVENTORY_INVALID_DIRECTION`, `INVENTORY_INVALID_QUANTITY`, `INVENTORY_REASON_REQUIRED`, `INVENTORY_INSUFFICIENT_STOCK`, `INVENTORY_NOT_FOUND`, `INVENTORY_INVALID_STATUS`.

---

## 12. Các loại giao dịch

Hệ thống có **hai luồng song song**: `Transaction` (bán hàng POS) và `TradeTxn` (thu đổi phức tạp).

**`TransactionType`** (bảng `transactions`):

| Enum               | Tiền tố mã | Ý nghĩa                                 |
| ------------------ | ---------- | --------------------------------------- |
| `SellGold`         | BV         | Bán vàng cho khách                      |
| `SellSilver`       | BB         | Bán bạc cho khách                       |
| `BuyGold`          | MV         | Mua vàng từ khách                       |
| `BuyMoreGold`      | MT         | Mua thêm (bù cho đơn có sẵn)            |
| `ExchangeGold`     | DV         | Đổi vàng (cũ ↔ mới)                     |
| `ExchangeFree`     | DMF        | Đổi miễn phí (cần tham chiếu ≤ 30 ngày) |
| `ExchangeCurrency` | NT         | Thu đổi ngoại tệ (không đụng kho)       |
| `ExchangeToMoney`  | DTT        | Đổi vàng lấy tiền mặt                   |

**`TradeType`** (bảng `trade_txns`): `MuaThem`, `DoiHang`, `DoiMienPhi`, `DoiThanhTien`.

---

## 13. Luồng Thu đổi / Trade

`CreateTradeCommandHandler` định tuyến theo `TradeType` sang `TradeService`:

```mermaid
sequenceDiagram
    actor C as Client
    participant Ctl as TradeController
    participant H as CreateTradeHandler
    participant S as TradeService
    participant P as PricingCalculator
    participant DB as PostgreSQL

    C->>Ctl: POST /api/trade (CreateTradeTxnRequest)
    Ctl->>H: CreateTradeCommand
    alt DoiHang / MuaThem
        H->>S: ExecuteDoiHangAsync
        S->>DB: lấy ItemCu, ItemMoi
        S->>S: ItemCu.NguonGoc = Quan? · ItemMoi.TrangThai = TrenQuay?
        S->>DB: PriceConfig mới nhất → SellPricePerChi theo Purity (fallback 9999)
        S->>P: CalculateTienHaoHut + CalculateTradeChenhLech
        S->>DB: tạo TradeTxn · ItemCu→ChuyenXuong · ItemMoi→DaBan
    else DoiMienPhi
        H->>S: ExecuteDoiMienPhiAsync
        S->>S: cùng giá trị ±1% · trong 31 ngày
        S->>DB: TradeTxn (ChenhLech = 0)
    else DoiThanhTien
        H->>S: ExecuteDoiThanhTienAsync
        S->>DB: BuyPricePerChi theo Purity
        S->>P: CalculateDoiThanhTien (số chỉ × giá mua − đá − công − phí)
        S->>DB: TradeTxn (ChenhLech = −tiền khách nhận)
    end
    H-->>C: TradeTxnResponse
```

Công thức chênh lệch (đổi hàng):

```
ChenhLech = [ WeightMới/3.75 × giáBán/Chỉ + TiềnĐáMới + TiềnCông + PhíHưHại + TiềnHaoHụt ]
          −  [ WeightCũ/3.75 × giáBán/Chỉ ]
```

`ChenhLech > 0` → khách trả thêm · `< 0` → cửa hàng hoàn lại.

---

## 14. Chuỗi thiết lập định giá (Vàng / Bạc / Đá)

```mermaid
flowchart TD
    WU["WeightUnit<br/>(Chỉ = 3.75g) — nguồn sự thật"] --> PC["PricingCalculator<br/>quy đổi gram ↔ chỉ/lượng/cây"]

    CAT["ProductCategory<br/>Gold · Silver · Stone"] --> PROD["Product<br/>(Purity chuỗi, WeightGram)"]
    PROD -.->|FK tùy chọn| WU

    GP["GoldPurity<br/>Ma + HamLuong + Category"] --> PCI
    WU --> PCI
    PCFG["PriceConfig (versioned)"] --> PCI["PriceConfigItem<br/>GoldPurityId + WeightUnitId<br/>BuyPrice + SellPrice / đơn vị"]

    subgraph PRICING["Mỗi (hàm lượng × đơn vị) = 1 dòng giá"]
        PCI -->|"đơn vị Chỉ"| GOLD["giá Mua/Bán / Chỉ"]
        PCI -->|"đơn vị Gram"| SILVER["giá Mua/Bán / gram"]
        PCI -->|"đơn vị Bath…"| BATH["giá Mua/Bán / Bath"]
    end

    STONE["StonePriceRule<br/>(khoảng số chỉ → GiaDa)"] -.->|gợi ý| SALE
    PROD --> SALE["Lập đơn / Định giá"]
    GOLD --> SALE
    SILVER --> SALE
    PC --> SALE
    FX["ExchangeRate<br/>(RateToLak + Adjustment)"] --> SALE
```

| Nhóm         | Hàm lượng                    | Định giá                                                                                     |
| ------------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| **Vàng**     | `GoldPurity` Category=Gold   | `PriceConfigItem` — giá/**Chỉ**                                                              |
| **Bạc**      | `GoldPurity` Category=Silver | `PriceConfigItem` — giá/**gram**                                                             |
| **Đá**       | ❌ không có hàm lượng        | **Nhập giá tay** khi bán (`StoneFee` / đơn giá); `StonePriceRule` chỉ gợi ý theo số chỉ vàng |
| **Ngoại tệ** | —                            | `ExchangeRate`: `số tiền × (RateToLak + Adjustment)`                                         |

> Mỗi lần cập nhật giá tạo **bản ghi `PriceConfig` mới** (không ghi đè) → giữ lịch sử. `PriceConfigItem` snapshot `PurityCode/Category/HamLuong` để hiển thị không cần JOIN và bất biến theo thời điểm.

---

## 15. Luồng sổ quỹ tiền mặt hàng ngày

```mermaid
flowchart TD
    A["1· Mở quỹ đầu ca<br/>POST /opening-balance"] --> B["DailyOpeningBalance<br/>CashAmountLak + BankAmountLak"]
    C["Giao dịch bán hàng (COMPLETED)"] --> F
    G["2· Thu/Chi thủ công<br/>POST /manual-entry"] --> H["ManualCashEntry<br/>IN/OUT · CASH/BANK · quy đổi LAK"]
    H --> F
    B --> F["3· Sổ quỹ ngày<br/>GET /daily<br/>Kỳ vọng = Đầu ca + Σ(GD × dấu)"]
    F --> I["4· Kiểm đếm tiền<br/>PUT /cash-count"]
    I --> J["CashCountSheet + items<br/>theo từng mệnh giá"]
    J --> K["5· Chốt bàn giao ca<br/>POST /handover"]
    K --> L["Sinh HandoverCode (BGQ-...)<br/>So Thực tế ⟷ Kỳ vọng → chênh lệch"]
    F -.->|số kỳ vọng| K
```

Quy ước dấu khi tính quỹ kỳ vọng: bán hàng `+`, mua vào / đổi ngoại tệ `−`; thu/chi thủ công theo `Direction` (IN `+`, OUT `−`); tách riêng theo `Method` (CASH / BANK).

---

## 16. Ghi chú độ chính xác

Những điểm đã xác minh từ mã nguồn — đáng lưu ý khi đọc sơ đồ:

1. **Tham chiếu lỏng (không FK):** nhiều khoá là `Guid`/`string` phục vụ snapshot & audit chứ **không** ràng buộc FK ở DB:
   - `Transaction.BranchId / CashierId / StaffId`, và `Transaction.CounterId` là **chuỗi** (không FK tới `counters`).
   - `InventoryItem.ProductId / BranchId`, `TradeTxn.BranchId / EmployeeId`, các trường `UpdatedBy / CreatedById` trong cấu hình giá & quỹ.
   - `Product.Purity` là **chuỗi tự do**, không FK tới `GoldPurity` — khớp giá tại thời điểm bán bằng so khớp chuỗi `PurityCode`.
2. **FK thật & hành vi xóa:** `AppUser→AppRole` (Restrict), `AppUser→Counter` (SetNull), `Product→Category` (Restrict), `Product/TransactionItem→WeightUnit` (SetNull), `PriceConfigItem→GoldPurity` (Restrict) & `→PriceConfig` (Cascade), `TradeTxn→InventoryItem` ×2 (Restrict), `role_permissions / refresh_tokens / cash_count_items` (Cascade).
3. **Hai hệ giao dịch:** `Transaction` (POS, 8 `TransactionType`) và `TradeTxn` (4 `TradeType`) là hai luồng riêng biệt.
4. **Snapshot pattern:** `TransactionItem`, `PriceConfigItem`, `InventoryAdjustmentLog` lưu bản sao tên/đơn vị/hàm lượng để bất biến theo lịch sử.
5. **Redis / Object Store:** có trong kiến trúc tham chiếu nhưng **chưa** có trong `docker-compose.yml` hiện tại.
6. **Enum lưu dạng chuỗi** trong DB (`HasConversion<string>`); tiền & trọng lượng dùng `decimal`.

---

_Tài liệu sinh từ rà soát mã nguồn (entities, EF configurations, handlers, services). Khi nghiệp vụ thay đổi, cập nhật lại sơ đồ tương ứng. Xem thêm: `docs/API Reference.md` và `docs/Tài liệu Kiến trúc & Thiết kế POS Khamphouvong.md`._
