/**
 * lib/errors.ts — Map errorCode → message đa ngôn ngữ
 *
 * Backend trả errorCode dạng SCREAMING_SNAKE_CASE (RFC 7807 mở rộng).
 * Frontend map sang text hiển thị theo ngôn ngữ hiện tại.
 *
 * Quy tắc khi thêm mã lỗi mới:
 *  1. Thêm entry vào ERROR_MESSAGES (bắt buộc có lo + vi + en)
 *  2. Cập nhật bảng mã lỗi trong CLAUDE.md § Backend API Contract
 *  3. KHÔNG hardcode text lỗi trong component — luôn qua getErrorMessage()
 *
 * Sử dụng: getErrorMessage('AUTH_INVALID_CREDENTIALS', 'vi')
 */

import { ApiError } from "./api-error";

export type AppLocale = "lo" | "vi" | "en";

type ErrorMap = Record<AppLocale, string>;

// ─── Bảng mã lỗi ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, ErrorMap> = {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS: {
    lo: "ລະຫັດພະນັກງານ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ",
    vi: "Mã nhân viên hoặc mật khẩu không đúng",
    en: "Invalid employee code or password",
  },
  AUTH_TOKEN_EXPIRED: {
    lo: "ເຊດຊັນໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່",
    vi: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại",
    en: "Session expired, please log in again",
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    lo: "ໂທເຄັນໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່",
    vi: "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại",
    en: "Session invalid, please log in again",
  },
  AUTH_ACCOUNT_INACTIVE: {
    lo: "ບັນຊີຂອງທ່ານຖືກລະງັບ ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ",
    vi: "Tài khoản đã bị vô hiệu hóa, liên hệ quản trị viên",
    en: "Account is inactive, contact system admin",
  },
  AUTH_FORBIDDEN: {
    lo: "ທ່ານບໍ່ມີສິດດຳເນີນການນີ້",
    vi: "Bạn không có quyền thực hiện thao tác này",
    en: "You do not have permission to perform this action",
  },

  // ── TRANSACTION ───────────────────────────────────────────────────────────
  TRANSACTION_NOT_FOUND: {
    lo: "ບໍ່ພົບໃບຮຽກເກັບເງິນ",
    vi: "Không tìm thấy giao dịch",
    en: "Transaction not found",
  },
  TRANSACTION_ALREADY_CANCELLED: {
    lo: "ໃບບິນນີ້ຖືກຍົກເລີກໄປແລ້ວ",
    vi: "Hóa đơn đã bị hủy trước đó",
    en: "Transaction has already been cancelled",
  },
  PAYMENT_COMBINED_AMOUNTS_REQUIRED: {
    lo: "ກະລຸນາລະບຸ cashAmount ແລະ bankAmount ສຳລັບການຊຳລະທີ່ລວມກັນ",
    vi: "Thiếu cashAmount hoặc bankAmount khi thanh toán kết hợp",
    en: "cashAmount and bankAmount are required for COMBINED payment",
  },
  PAYMENT_COMBINED_AMOUNTS_INVALID: {
    lo: "cashAmount ຫຼື bankAmount ບໍ່ສາມາດເປັນຕົວເລກລົບໄດ້",
    vi: "cashAmount hoặc bankAmount không được âm",
    en: "cashAmount and bankAmount must be non-negative",
  },
  PAYMENT_COMBINED_AMOUNTS_MISMATCH: {
    lo: "cashAmount + bankAmount ≠ totalAmount",
    vi: "Tổng cashAmount + bankAmount phải bằng tổng hóa đơn",
    en: "cashAmount + bankAmount must equal totalAmount",
  },

  // ── TRADE ─────────────────────────────────────────────────────────────────
  // (Backend trả RESOURCE_NOT_FOUND cho GET /api/trade/{id} không tồn tại)
  TRADE_ITEM_NOT_QUAN: {
    lo: "ສິນຄ້ານີ້ບໍ່ແມ່ນສິນຄ້າຂອງຮ້ານ",
    vi: "Sản phẩm không phải của cửa hàng",
    en: "Product does not belong to this store",
  },
  TRADE_FREE_EXCHANGE_EXPIRED: {
    lo: "ໝົດກຳນົດປ່ຽນຟຣີ (ເກີນ 31 ວັນ)",
    vi: "Hết thời hạn đổi miễn phí (quá 31 ngày)",
    en: "Free exchange period has expired (over 31 days)",
  },
  TRADE_FREE_EXCHANGE_INVALID_VALUE: {
    lo: "ສ່ວນຕ່າງລາຄາເກີນ 1% ບໍ່ສາມາດດ່ຽນຟຣີ",
    vi: "Chênh lệch giá trị vượt 1%, không áp dụng đổi miễn phí",
    en: "Value difference exceeds 1%, free exchange not applicable",
  },

  // ── CONFIG ────────────────────────────────────────────────────────────────
  CONFIG_PRICE_NOT_FOUND: {
    lo: "ຍັງບໍ່ໄດ້ຕັ້ງລາຄາ ກະລຸນາຕິດຕໍ່ຜູ້ຄຸ້ມຄອງ",
    vi: "Chưa có bảng giá, liên hệ quản lý để cài đặt",
    en: "No price configuration found, contact manager",
  },
  CONFIG_RATE_NOT_FOUND: {
    lo: "ບໍ່ພົບອັດຕາແລກປ່ຽນສຳລັບສະກຸນເງິນນີ້",
    vi: "Không có tỷ giá cho loại ngoại tệ này",
    en: "Exchange rate not found for this currency",
  },
  CONFIG_PRICE_ITEMS_EMPTY: {
    lo: "ລາຍການລາຄາບໍ່ສາມາດຫວ່າງໄດ້",
    vi: "Danh sách giá không được rỗng",
    en: "Price items cannot be empty",
  },
  CONFIG_GOLD_PURITY_NOT_FOUND: {
    lo: "ບໍ່ພົບຄວາມບໍລິສຸດຂອງທອງ",
    vi: "Không tìm thấy hàm lượng vàng",
    en: "Gold purity not found",
  },
  CONFIG_GOLD_PURITY_CODE_DUPLICATE: {
    lo: "ລະຫັດຄວາມບໍລິສຸດຂອງທອງທີ່ຊ້ຳກັນ",
    vi: "Mã hàm lượng vàng đã tồn tại",
    en: "Gold purity code already exists",
  },
  CONFIG_WEIGHT_UNIT_NOT_FOUND: {
    lo: "ບໍ່ພົບໜ່ວຍນ້ຳໜັກ",
    vi: "Không tìm thấy đơn vị trọng lượng",
    en: "Weight unit not found",
  },
  CONFIG_WEIGHT_UNIT_CODE_DUPLICATE: {
    lo: "ລະຫັດໜ່ວຍວັດແທກຊ້ຳກັນ",
    vi: "Mã đơn vị trọng lượng đã tồn tại",
    en: "Weight unit code already exists",
  },
  CONFIG_WEIGHT_UNIT_SYSTEM_PROTECTED: {
    lo: "ໜ່ວຍລະບົບບໍ່ສາມາດລຶບໄດ້",
    vi: "Đơn vị hệ thống không thể xóa",
    en: "System weight unit cannot be deleted",
  },
  CONFIG_STONE_RULE_NOT_FOUND: {
    lo: "ບໍ່ພົບກົດລາຄາຫີນ",
    vi: "Không tìm thấy quy tắc giá đá",
    en: "Stone price rule not found",
  },
  CONFIG_GOLD_PURITY_IN_USE: {
    lo: "ຄວາມບໍລິສຸດຖືກໃຊ້ງານຢູ່ ບໍ່ສາມາດລຶບໄດ້",
    vi: "Hàm lượng đang được dùng trong sản phẩm hoặc bảng giá, không thể xóa",
    en: "Gold purity is in use by products or price config, cannot delete",
  },
  CONFIG_WEIGHT_UNIT_IN_USE: {
    lo: "ໜ່ວຍນ້ຳໜັກຖືກໃຊ້ງານຢູ່ ບໍ່ສາມາດລຶບໄດ້",
    vi: "Đơn vị đang được dùng trong sản phẩm hoặc bảng giá, không thể xóa",
    en: "Weight unit is in use by products or price config, cannot delete",
  },

  // ── INVENTORY ─────────────────────────────────────────────────────────────
  INVENTORY_NOT_FOUND: {
    lo: "ບໍ່ພົບສິນຄ້າໃນສາງ",
    vi: "Tồn kho không đủ",
    en: "Inventory item not found",
  },
  INVENTORY_INSUFFICIENT_STOCK: {
    lo: "ສິນຄ້າໃນສາງບໍ່ພຽງພໍ",
    vi: "Số lượng tồn kho không đủ",
    en: "Insufficient stock quantity",
  },
  INVENTORY_ITEM_NOT_AVAILABLE: {
    lo: 'ສິນຄ້າບໍ່ໄດ້ຢູ່ໃນສະຖານະ "ເທິງເຄົ້າ"',
    vi: "Sản phẩm không ở trạng thái trên quầy",
    en: 'Inventory item is not in "on display" status',
  },
  INVENTORY_INVALID_DIRECTION: {
    lo: "ທິດທາງຕ້ອງເປັນ IN ຫຼື OUT",
    vi: "Direction phải là IN hoặc OUT",
    en: "Direction must be IN or OUT",
  },
  INVENTORY_INVALID_QUANTITY: {
    lo: "ຈຳນວນການປັບແຕ່ງຕ້ອງມີຄ່າຫຼາຍກ່ວາ 0",
    vi: "Số lượng điều chỉnh phải lớn hơn 0",
    en: "Adjustment quantity must be greater than 0",
  },
  INVENTORY_REASON_REQUIRED: {
    lo: "ກະລຸນາລະບຸເຫດຜົນໃນການປັບແຕ່ງ",
    vi: "Lý do điều chỉnh kho là bắt buộc",
    en: "Inventory adjustment reason is required",
  },
  INVENTORY_BULK_EMPTY: {
    lo: "ລາຍການ bulk update ບໍ່ສາມາດຫວ່າງໄດ້",
    vi: "Danh sách cập nhật hàng loạt không được rỗng",
    en: "Bulk update items list cannot be empty",
  },
  INVENTORY_INVALID_STATUS: {
    lo: "ສະຖານະ trangThai ບໍ່ຖືກຕ້ອງ",
    vi: "Giá trị trạng thái trangThai không hợp lệ",
    en: "Invalid trangThai status value",
  },
  EXCHANGE_FREE_REFERENCE_REQUIRED: {
    lo: "ExchangeFree ຕ້ອງລະບຸ referenceInvoiceCode",
    vi: "ExchangeFree bắt buộc truyền mã hóa đơn gốc (referenceInvoiceCode)",
    en: "referenceInvoiceCode is required for ExchangeFree",
  },
  EXCHANGE_FREE_REFERENCE_NOT_FOUND: {
    lo: "ບໍ່ພົບໃບບິນທ່ຽງຕ້ອງ",
    vi: "Không tìm thấy hóa đơn gốc",
    en: "Reference invoice not found",
  },
  EXCHANGE_FREE_REFERENCE_EXPIRED: {
    lo: "ໃບບິນທ່ຽງຕ້ອງເກີນ 30 ວັນ ໝົດສິດດ່ຽນຟຣີ",
    vi: "Hóa đơn gốc quá 30 ngày, không còn hiệu lực đổi miễn phí",
    en: "Reference invoice is over 30 days old, free exchange no longer valid",
  },

  // ── PRODUCT ───────────────────────────────────────────────────────────────
  PRODUCT_NOT_FOUND: {
    lo: "ບໍ່ພົບສິນຄ້າ",
    vi: "Không tìm thấy sản phẩm",
    en: "Product not found",
  },
  PRODUCT_CODE_DUPLICATE: {
    lo: "ລະຫັດສິນຄ້າຊ້ຳກັນ",
    vi: "Mã sản phẩm đã tồn tại",
    en: "Product code already exists",
  },
  PRODUCT_CATEGORY_CODE_DUPLICATE: {
    lo: "ລະຫັດໝວດໝູ່ສິນຄ້າຊ້ຳກັນ",
    vi: "Mã danh mục đã tồn tại",
    en: "Product category code already exists",
  },
  PRODUCT_CATEGORY_NOT_FOUND: {
    lo: "ບໍ່ພົບໝວດໝູ່ສິນຄ້າ",
    vi: "Không tìm thấy danh mục sản phẩm",
    en: "Product category not found",
  },
  PRODUCT_CATEGORY_HAS_PRODUCTS: {
    lo: "ໝວດໝູ່ຍັງມີສິນຄ້າ, ບໍ່ສາມາດລຶບໄດ້",
    vi: "Danh mục còn sản phẩm, không thể xóa",
    en: "Category still has products, cannot delete",
  },
  PRODUCT_PRICE_NOT_CONFIGURED: {
    lo: "ສິນຄ້ານີ້ຍັງບໍ່ມີລາຄາ ກະລຸນາຕັ້ງລາຄາໃນຕາຕະລາງລາຄາ",
    vi: "Sản phẩm chưa có giá trong bảng giá, không thể bán",
    en: "Product price not configured for this purity and unit, cannot sell",
  },
  PRODUCT_WEIGHT_UNIT_REQUIRED: {
    lo: "ສິນຄ້ານີ້ຕ້ອງການໜ່ວຍນ້ຳໜັກ ກະລຸນາລະບຸໜ່ວຍ",
    vi: "Sản phẩm vàng/bạc phải chọn đơn vị tính giá",
    en: "Gold/silver product must have a weight unit configured",
  },
  PRODUCT_PURITY_OR_UNIT_LOCKED: {
    lo: "ສິນຄ້ານີ້ມີທຸລະກຳແລ້ວ ບໍ່ສາມາດແກ້ໄຂຄວາມບໍລິສຸດ ຫຼື ໜ່ວຍໄດ້",
    vi: "Sản phẩm đã phát sinh giao dịch, không thể sửa hàm lượng hoặc đơn vị tính",
    en: "Product already has transactions; purity and unit cannot be changed",
  },

  // ── USER ──────────────────────────────────────────────────────────────────
  USER_NOT_FOUND: {
    lo: "ບໍ່ພົບຜູ້ໃຊ້",
    vi: "Không tìm thấy người dùng",
    en: "User not found",
  },
  USER_EMPLOYEE_CODE_DUPLICATE: {
    lo: "ລະຫັດພະນັກງານນີ້ມີຢູ່ແລ້ວ",
    vi: "Mã nhân viên đã tồn tại trong hệ thống",
    en: "Employee code already exists",
  },
  BRANCH_NOT_FOUND: {
    lo: "ບໍ່ພົບສາຂາ ຫຼື ສາຂາບໍ່ດຳເນີນການ",
    vi: "Không tìm thấy chi nhánh hoặc chi nhánh không hoạt động",
    en: "Branch not found or inactive",
  },
  COUNTER_NOT_FOUND: {
    lo: "ບໍ່ພົບເຄົ້າເຕີ ຫຼື ເຄົ້າເຕີຖືກປິດໃຊ້ງານ",
    vi: "Không tìm thấy quầy hoặc quầy đã ngừng hoạt động",
    en: "Counter not found or inactive",
  },
  COUNTER_BRANCH_MISMATCH: {
    lo: "ເຄົ້າເຕີບໍ່ສັງກັດສາຂາຂອງພະນັກງານ",
    vi: "Quầy không thuộc chi nhánh của nhân viên",
    en: "Counter does not belong to the employee's branch",
  },
  ROLE_NOT_FOUND: {
    lo: "ບໍ່ພົບບົດບາດ",
    vi: "Không tìm thấy vai trò",
    en: "Role not found",
  },
  ROLE_CODE_DUPLICATE: {
    lo: "ລະຫັດບົດບາດຊ້ຳກັນ",
    vi: "Mã vai trò đã tồn tại",
    en: "Role code already exists",
  },
  ROLE_CODE_REQUIRED: {
    lo: "ກະລຸນາລະບຸລະຫັດບົດບາດ",
    vi: "Mã vai trò không được để trống",
    en: "Role code is required",
  },
  ROLE_NAME_REQUIRED: {
    lo: "ກະລຸນາລະບຸຊື່ບົດບາດ",
    vi: "Tên vai trò không được để trống",
    en: "Role name is required",
  },
  ROLE_SYSTEM_PROTECTED: {
    lo: "ບໍ່ສາມາດແກ້ໄຂ/ລຶບບົດບາດລະບົບໄດ້",
    vi: "Không thể sửa hoặc xóa vai trò hệ thống",
    en: "System role cannot be modified or deleted",
  },
  ROLE_IN_USE: {
    lo: "ບົດບາດກຳລັງຖືກໃຊ້ງານ ບໍ່ສາມາດລຶບໄດ້",
    vi: "Vai trò đang được gán cho người dùng, không thể xóa",
    en: "Role is assigned to users and cannot be deleted",
  },

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  CUSTOMER_REQUIRED: {
    lo: "ກະລຸນາເລືອກລູກຄ້າກ່ອນລ້າງໃບບິນ",
    vi: "Vui lòng chọn khách hàng trước khi lập hóa đơn",
    en: "Please select a customer before creating an invoice",
  },
  CUSTOMER_NOT_FOUND: {
    lo: "ບໍ່ພົບລູກຄ້າ",
    vi: "Không tìm thấy khách hàng",
    en: "Customer not found",
  },
  CUSTOMER_PHONE_DUPLICATE: {
    lo: "ເບີໂທລະສັບຖືກລົງທະບຽນໄວ້ແລ້ວ",
    vi: "Số điện thoại đã được đăng ký",
    en: "Phone number already registered",
  },

  // ── VALIDATION ────────────────────────────────────────────────────────────
  VALIDATION_FAILED: {
    lo: "ຂໍ້ມູນທີ່ປ້ອນເຂົ້າບໍ່ຖືກຕ້ອງ",
    vi: "Dữ liệu đầu vào không hợp lệ",
    en: "Input validation failed",
  },

  // ── RESOURCE ──────────────────────────────────────────────────────────────
  RESOURCE_NOT_FOUND: {
    lo: "ບໍ່ພົບຊັບພະຍາກອນ",
    vi: "Không tìm thấy tài nguyên",
    en: "Resource not found",
  },

  // ── CASH LEDGER ───────────────────────────────────────────────────────────
  CASH_ACTIVITY_NOT_FOUND: {
    lo: "ບໍ່ພົບລາຍການກິດຈະກຳ",
    vi: "Không tìm thấy bút toán",
    en: "Cash activity not found",
  },
  CASH_VOUCHER_NOT_FOUND: {
    lo: "ບໍ່ພົບໃບສຳຄັນ",
    vi: "Không tìm thấy phiếu thu/chi",
    en: "Cash voucher not found",
  },
  CASH_VOUCHER_INVALID_DIRECTION: {
    lo: "ທິດທາງໃບສຳຄັນຕ້ອງເປັນ IN ຫຼື OUT",
    vi: "Direction của phiếu phải là IN hoặc OUT",
    en: "Voucher direction must be IN or OUT",
  },
  CASH_VOUCHER_INVALID_AMOUNT: {
    lo: "ຈຳນວນເງິນໃບສຳຄັນຕ້ອງ > 0",
    vi: "Số tiền phiếu phải lớn hơn 0",
    en: "Voucher amount must be greater than 0",
  },
  CASH_VOUCHER_AMOUNT_REQUIRED: {
    lo: "ກະລຸນາລະບຸ cashAmount ຫຼື bankAmount",
    vi: "Phải cung cấp cashAmount hoặc bankAmount",
    en: "cashAmount or bankAmount is required",
  },
  CASH_VOUCHER_REASON_INVALID: {
    lo: "ລະຫັດເຫດຜົນບໍ່ຖືກຕ້ອງ ຫຼື ບໍ່ກົງກັບທິດທາງ",
    vi: "Mã lý do không hợp lệ hoặc không khớp với direction",
    en: "Reason code is invalid or does not match the voucher direction",
  },

  // ── SALES SHIFT ───────────────────────────────────────────────────────────
  COUNTER_NOT_ASSIGNED: {
    lo: 'ພະນັກງານຍັງບໍ່ໄດ້ຮັບການຈັດສັນເຄົ້າເຕີ ກະລຸນາຕິດຕໍ່ຜູ້ຈັດການ',
    vi: 'Nhân viên chưa được phân công quầy, liên hệ quản lý',
    en: 'Employee has not been assigned to a counter, contact manager',
  },
  SALES_SHIFT_NOT_OPEN: {
    lo: 'ບໍ່ມີກະທີ່ເປີດຢູ່ ກະລຸນາເປີດກະກ່ອນດຳເນີນການ',
    vi: 'Không có ca đang mở, vui lòng mở ca trước khi thực hiện giao dịch',
    en: 'No open shift found. Please open a shift before performing transactions',
  },
  SALES_SHIFT_ALREADY_OPEN_FOR_USER: {
    lo: 'ທ່ານມີກະທີ່ກຳລັງເປີດຢູ່ ບໍ່ສາມາດເປີດກະໃໝ່ໄດ້',
    vi: 'Nhân viên đang có ca mở, không thể mở ca mới',
    en: 'You already have an open shift',
  },
  SALES_SHIFT_ALREADY_OPEN_FOR_COUNTER: {
    lo: 'ເຄົ້າເຕີນີ້ກຳລັງຖືກໃຊ້ງານໂດຍພະນັກງານອື່ນ',
    vi: 'Quầy này đang có ca mở bởi nhân viên khác',
    en: 'This counter already has an open shift by another employee',
  },
  SALES_SHIFT_ALREADY_CLOSED: {
    lo: 'ກະນີ້ໄດ້ຖືກປິດໄປແລ້ວ',
    vi: 'Ca bán hàng đã được đóng trước đó',
    en: 'This shift has already been closed',
  },
  SALES_SHIFT_NOT_FOUND: {
    lo: 'ບໍ່ພົບກະບ່ານຂາຍ',
    vi: 'Không tìm thấy ca bán hàng',
    en: 'Sales shift not found',
  },
  SALES_SHIFT_COUNTER_MISMATCH: {
    lo: 'ກະນີ້ບໍ່ໄດ້ສັງກັດເຄົ້າເຕີຂອງທ່ານ',
    vi: 'Ca bán hàng không thuộc quầy của nhân viên',
    en: 'Shift does not belong to your assigned counter',
  },

  // ── CURRENCY ──────────────────────────────────────────────────────────────
  CURRENCY_NOT_FOUND: {
    lo: 'ບໍ່ພົບສະກຸນເງິນ',
    vi: 'Không tìm thấy loại tiền tệ',
    en: 'Currency not found',
  },
  CURRENCY_CODE_DUPLICATE: {
    lo: 'ລະຫັດສະກຸນເງິນນີ້ມີຢູ່ແລ້ວ',
    vi: 'Mã tiền tệ đã tồn tại trong hệ thống',
    en: 'Currency code already exists',
  },
  CURRENCY_IN_USE: {
    lo: 'ສະກຸນເງິນກຳລັງຖືກໃຊ້ງານໃນກະ ບໍ່ສາມາດລຶບໄດ້',
    vi: 'Tiền tệ đang được dùng trong ca bán hàng, không thể xóa',
    en: 'Currency is in use by sales shifts and cannot be deleted',
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  SYSTEM_INTERNAL_ERROR: {
    lo: "ເກີດຂໍ້ຜິດພາດທີ່ລະບົບ ກະລຸນາລອງໃໝ່",
    vi: "Lỗi hệ thống nội bộ, vui lòng thử lại",
    en: "Internal server error, please try again",
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Trả về message hiển thị từ errorCode và locale.
 * Fallback chain: locale → 'en' → SYSTEM_INTERNAL_ERROR[locale]
 */
export function getErrorMessage(
  code: string,
  locale: AppLocale = "lo",
): string {
  return (
    ERROR_MESSAGES[code]?.[locale] ??
    ERROR_MESSAGES[code]?.["en"] ??
    ERROR_MESSAGES["SYSTEM_INTERNAL_ERROR"][locale]
  );
}

/**
 * Lấy toàn bộ messages validation từ response lỗi 422.
 * Trả về mảng flat các message lỗi theo từng field.
 */
export function getValidationMessages(
  errors: Record<string, string[]>,
  locale: AppLocale = "lo",
): string[] {
  return Object.values(errors)
    .flat()
    .map((code) => getErrorMessage(code, locale));
}

/**
 * Helper: extract errorCode từ ApiError (hoặc axios error thô) và convert sang message.
 * Dùng trong onError của useMutation.
 */
export function extractErrorMessage(
  err: unknown,
  locale: AppLocale = "lo",
): string {
  if (err instanceof ApiError) {
    return getErrorMessage(err.code, locale);
  }
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { errorCode?: string } } })
      .response;
    const code = response?.data?.errorCode;
    if (code) return getErrorMessage(code, locale);
  }
  return getErrorMessage("SYSTEM_INTERNAL_ERROR", locale);
}
