# Quy ước API: Phân trang · Truyền Param · Filter · Response

> Tài liệu chuẩn hoá cách viết các endpoint kiểu **danh sách (list)** trong backend Khamphouvong POS.
> Mọi API list mới **phải** tuân theo quy ước trong tài liệu này để đảm bảo nhất quán giữa các module và với frontend.

---

## 1. Tổng quan

Backend áp dụng mô hình **phân trang tuỳ chọn (optional pagination)**:

- **Có `page`** → trả về object `PagedResult<T>` (kèm tổng số bản ghi để tính số trang).
- **Không có `page`** → trả về **mảng phẳng** toàn bộ dữ liệu (hoặc giới hạn bởi `limit` ở chế độ lookup).

Điều này cho phép **một endpoint duy nhất** phục vụ 2 nhu cầu:

- Màn hình bảng dữ liệu (journal, danh sách quản trị) → cần phân trang.
- Dropdown / autocomplete / POS lookup → chỉ cần một mảng ngắn gọn.

---

## 2. Truyền tham số (Query Parameters)

### 2.1. Tham số phân trang chuẩn

| Tham số    | Kiểu   | Mặc định  | Bắt buộc | Ý nghĩa                                                                            |
| ---------- | ------ | --------- | -------- | ---------------------------------------------------------------------------------- |
| `page`     | `int?` | `null`    | Không    | Trang cần lấy (**1-indexed**). `null` ⇒ **không** phân trang.                      |
| `pageSize` | `int`  | `20`      | Không    | Số bản ghi mỗi trang.                                                              |
| `limit`    | `int`  | `10`–`20` | Không    | (Chỉ chế độ lookup, ở một số endpoint) Số bản ghi tối đa khi **không** phân trang. |

### 2.2. Quy tắc

- Mọi tham số khai báo `[FromQuery]`, **nullable** và **có giá trị mặc định** — client không cần truyền đủ.
- `pageSize` mặc định **`20`**.
- Handler phải **chuẩn hoá** `page` về tối thiểu 1: `var page = Math.Max(1, p);`
- Tham số cuối cùng luôn là `CancellationToken ct = default`.
- Tên tham số dùng `camelCase` trên query string (ASP.NET tự bind PascalCase ↔ camelCase).

### 2.3. Ví dụ controller chuẩn

```csharp
[HttpGet]
public async Task<IActionResult> List(
    [FromQuery] Guid? branchId, [FromQuery] string? search, [FromQuery] bool? isActive,
    [FromQuery] int? page, [FromQuery] int pageSize = 20, CancellationToken ct = default)
{
    var result = await mediator.Send(new GetUsersQuery(branchId, search, isActive, page, pageSize), ct);
    // ... map sang DTO ...
    return result.Total is null
        ? Ok(data)                                                              // không phân trang → mảng
        : Ok(new PagedResult<object>(result.Total.Value, result.Page, result.PageSize, data)); // có → wrap
}
```

### 2.4. Ví dụ URL

```
GET /api/users                          → trả mảng toàn bộ (không phân trang)
GET /api/users?page=1&pageSize=20       → trả PagedResult, trang 1
GET /api/users?search=an&isActive=true  → mảng đã lọc, không phân trang
GET /api/users?page=2&search=an         → PagedResult trang 2, đã lọc
```

---

## 3. Filter

### 3.1. Quy tắc

- Mỗi filter là một **tham số `[FromQuery]` nullable** — không truyền ⇒ không áp dụng filter đó.
- Filter được khai báo trong **Query record** và truyền nguyên vào Repository.
- Logic lọc đặt **trong Repository** (qua một query-builder dùng chung cho cả bản phân trang và bản full), **không** đặt trong Controller hay Handler.
- Tìm kiếm văn bản (`search` / `q`): so khớp **không phân biệt hoa thường**, dùng `Contains` trên các cột đại diện (mã, tên, số điện thoại…).
- Filter dạng enum nhận **string** ở Controller rồi `Enum.TryParse(..., ignoreCase: true, ...)` → enum nullable trước khi gửi vào Query.

### 3.2. Bộ filter theo module (tham chiếu)

| Module       | Filter params                                                        |
| ------------ | -------------------------------------------------------------------- |
| Users        | `branchId`, `search`, `isActive`                                     |
| Products     | `categoryCode`, `search`                                             |
| Customers    | `search` / `q`                                                       |
| Inventory    | `branchId`, `category`, `trayId`, `status` (enum), `nguonGoc` (enum) |
| Transactions | `branchId`, `status`, `type`, `from`, `to`, `invoiceCode`, `q`       |
| Trade        | `branchId`, `loai`, `from`, `to`                                     |

### 3.3. Query-builder pattern (Repository)

Mỗi list có **một** `private IQueryable<T> BuildXxxQuery(...)` chứa toàn bộ logic filter + sort, dùng chung cho cả 2 method (full & paged):

```csharp
private IQueryable<Product> BuildProductsQuery(string? categoryCode, string? search)
{
    var query = db.Products
        .Include(p => p.ProductCategory)
        .Where(p => p.IsActive);

    if (!string.IsNullOrEmpty(categoryCode))
        query = query.Where(p => p.ProductCategory.Code == categoryCode);

    if (!string.IsNullOrWhiteSpace(search))
    {
        var term = search.ToLower().Trim();
        query = query.Where(p =>
            p.ProductName.ToLower().Contains(term) ||
            p.ProductCode.ToLower().Contains(term));
    }

    return query.OrderBy(p => p.ProductCategory.SortOrder).ThenBy(p => p.ProductName);
}
```

### 3.4. Hai method Repository cho mỗi list

```csharp
// 1) Bản đầy đủ (không phân trang)
public Task<List<Product>> GetProductsAsync(string? categoryCode, string? search = null, CancellationToken ct = default)
    => BuildProductsQuery(categoryCode, search).ToListAsync(ct);

// 2) Bản phân trang — trả kèm Total
public async Task<(List<Product> Items, int Total)> GetProductsPagedAsync(
    string? categoryCode, string? search, int page, int pageSize, CancellationToken ct = default)
{
    var query = BuildProductsQuery(categoryCode, search);
    var total = await query.CountAsync(ct);
    var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
    return (items, total);
}
```

> **Công thức bỏ qua bản ghi:** `Skip((page - 1) * pageSize).Take(pageSize)` — luôn 1-indexed.

---

## 4. Handler — quyết định phân trang

Handler chọn nhánh dựa trên `page`:

```csharp
public async Task<UserListResult> Handle(GetUsersQuery request, CancellationToken ct)
{
    // Có page → phân trang, Total có giá trị
    if (request.Page is int p)
    {
        var page = Math.Max(1, p);
        var (items, total) = await repo.GetUsersPagedAsync(
            request.BranchId, request.Search, request.IsActive, page, request.PageSize, ct);
        return new UserListResult(items, total, page, request.PageSize);
    }

    // Không có page → lấy toàn bộ, Total = null (cờ "không phân trang")
    var all = await repo.GetUsersAsync(request.BranchId, request.Search, request.IsActive, ct);
    return new UserListResult(all, null, 1, request.PageSize);
}
```

**Quy ước cốt lõi:** `Total == null` ⇔ **không phân trang**. Controller dựa vào đây để quyết định wrap hay không.

Result record của Query có dạng:

```csharp
public record UserListResult(IReadOnlyList<AppUser> Items, int? Total, int Page, int PageSize);
```

---

## 5. Format Response

### 5.1. Wrapper phân trang chuẩn — `PagedResult<T>`

Khai báo tại `Application/DTOs/TransactionDtos.cs`. Response phân trang là **object lồng nhau**: mảng `data` + object `pagination` chứa đủ metadata để FE dựng component phân trang.

```csharp
public record PaginationMeta(int Page, int PageSize, int TotalItems, int TotalPages);

public record PagedResult<T>(IEnumerable<T> Data, PaginationMeta Pagination)
{
    // Tự tính TotalPages — luôn dùng factory này, không new trực tiếp
    public static PagedResult<T> Create(IEnumerable<T> data, int page, int pageSize, int totalItems)
    {
        int totalPages = pageSize > 0 ? (int)Math.Ceiling(totalItems / (double)pageSize) : 0;
        return new PagedResult<T>(data, new PaginationMeta(page, pageSize, totalItems, totalPages));
    }
}
```

| Trường                  | Ý nghĩa                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `data`                  | Mảng bản ghi của trang hiện tại.                                        |
| `pagination.page`       | Trang hiện tại (1-indexed).                                             |
| `pagination.pageSize`   | Kích thước trang.                                                       |
| `pagination.totalItems` | **Tổng** số bản ghi khớp filter (không phải số phần tử trong trang).    |
| `pagination.totalPages` | Tổng số trang — `ceil(totalItems / pageSize)`, backend tính sẵn cho FE. |

### 5.2. Hai dạng body trả về

**a) Có phân trang** (`?page=1`):

```json
{
  "data": [{ "id": "...", "employeeCode": "NV001", "fullName": "..." }],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 137,
    "totalPages": 7
  }
}
```

**b) Không phân trang** (không có `page`): **mảng phẳng**, không bọc — phục vụ dropdown / autocomplete / POS lookup.

```json
[
  { "id": "...", "name": "Khách A", "phoneNumber": "020..." },
  { "id": "...", "name": "Khách B", "phoneNumber": "020..." }
]
```

### 5.3. Pattern wrap ở Controller

Dùng factory `PagedResult<T>.Create(data, page, pageSize, totalItems)` — **không** `new` trực tiếp (để `TotalPages` luôn được tính):

```csharp
return result.Total is null
    ? Ok(data)
    : Ok(PagedResult<object>.Create(data, result.Page, result.PageSize, result.Total.Value));
```

> **Frontend tiêu thụ** (đã đồng bộ): `res.data.data` → mảng; `res.data.pagination.totalItems` → tổng; `pagination.totalPages` → số trang. Interface `PagedResult<T>` & `PaginationMeta` tại `frontend/src/types/index.ts`.

### 5.4. Map dữ liệu (DTO / anonymous object)

- **Không** trả thẳng entity domain ra ngoài — luôn chọn field qua `record` DTO hoặc anonymous object.
- Nested object (Role, Counter, Customer…) map thành object con gọn gàng.

```csharp
var data = result.Items.Select(u => new
{
    u.Id, u.EmployeeCode, u.Username, u.FullName, u.Phone, u.IsActive,
    Role = new { u.Role.Id, u.Role.Code, u.Role.Name },
    CounterName = u.Counter != null ? u.Counter.CounterName : null,
}).ToList();
```

### 5.5. Lỗi & i18n

- Theo CLAUDE.md: response lỗi **chỉ chứa `errorCode`** (SCREAMING_SNAKE_CASE), không trả message ngôn ngữ tự nhiên.
- Get một bản ghi không thấy: throw `NotFoundException("XXX_NOT_FOUND")` trong Handler — middleware tự map → 404 + `errorCode`.

---

## 6. Ngoại lệ đã biết — Module Trade

`TradeController` đã được **chuẩn hoá** dùng chung `PagedResult<T>` (shape JSON giống mọi API), nhưng vẫn còn **2 khác biệt** ở tham số đầu vào:

```csharp
[HttpGet]
public async Task<IActionResult> List(
    [FromQuery] Guid? branchId, [FromQuery] string? loai,
    [FromQuery] DateTime? from, [FromQuery] DateTime? to,
    [FromQuery] int page = 1, [FromQuery] int limit = 20, CancellationToken ct = default)
{
    var result = await mediator.Send(new GetTradesQuery(branchId, loai, from, to, page, limit), ct);
    return Ok(PagedResult<TradeTxnResponse>.Create(result.Data, result.Page, result.PageSize, result.Total));
}
```

Còn khác chuẩn ở chỗ:

- `page` **mặc định = 1** (luôn phân trang, không có chế độ mảng phẳng — Trade không phục vụ lookup).
- Dùng `limit` làm tên tham số kích thước trang thay cho `pageSize`.

> ✅ Response của Trade nay giống hệt các API khác: `{ data, pagination: { page, pageSize, totalItems, totalPages } }`.
> **Khuyến nghị cho API mới:** theo **Mục 2–5** (dùng `pageSize` + optional pagination). Riêng `page=1` mặc định của Trade là chấp nhận được khi API _luôn_ cần phân trang.

---

## 7. Checklist khi thêm một API List mới

- [ ] Query record có đủ filter params + `int? Page = null`, `int PageSize = 20`.
- [ ] Result record dạng `(IReadOnlyList<T> Items, int? Total, int Page, int PageSize)`.
- [ ] Repository có `BuildXxxQuery(...)` dùng chung + 2 method `GetXxxAsync` (full) & `GetXxxPagedAsync` (paged trả `(Items, Total)`).
- [ ] Handler: `page != null` → paged (Total có giá trị); ngược lại → full (Total = null). Chuẩn hoá `Math.Max(1, page)`.
- [ ] Controller: params `[FromQuery]` nullable, `pageSize = 20`, `ct` cuối; map entity → DTO; wrap theo `result.Total is null ? Ok(data) : Ok(PagedResult<object>.Create(data, page, pageSize, total))`.
- [ ] Filter so khớp text không phân biệt hoa thường; enum parse `ignoreCase: true`.
- [ ] Không lộ entity domain; không trả message lỗi ngôn ngữ tự nhiên.

---

## 8. Bảng tra nhanh (Quick Reference)

| Khía cạnh             | Quy ước                                                            |
| --------------------- | ------------------------------------------------------------------ |
| Bật phân trang        | Truyền `?page=N`                                                   |
| Page index            | Bắt đầu từ **1**                                                   |
| pageSize mặc định     | **20**                                                             |
| Cờ "không phân trang" | `Total == null`                                                    |
| Wrapper               | `{ data, pagination: { page, pageSize, totalItems, totalPages } }` |
| Factory               | `PagedResult<T>.Create(data, page, pageSize, totalItems)`          |
| Skip/Take             | `Skip((page-1)*pageSize).Take(pageSize)`                           |
| Filter                | `[FromQuery]` nullable, áp dụng trong Repository builder           |
| Search                | `Contains`, không phân biệt hoa thường                             |
| Lỗi                   | Chỉ `errorCode`, không message tự nhiên                            |
| Khác chuẩn tham số    | **Trade** dùng `limit` + `page=1` mặc định (xem Mục 6)             |
