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

export type AppLocale = 'lo' | 'vi' | 'en'

type ErrorMap = Record<AppLocale, string>

// ─── Bảng mã lỗi ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, ErrorMap> = {

  // ── AUTH ──────────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS: {
    lo: 'ລະຫັດພະນັກງານ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ',
    vi: 'Mã nhân viên hoặc mật khẩu không đúng',
    en: 'Invalid employee code or password',
  },
  AUTH_TOKEN_EXPIRED: {
    lo: 'ເຊດຊັນໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່',
    vi: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
    en: 'Session expired, please log in again',
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    lo: 'ໂທເຄັນໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່',
    vi: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
    en: 'Session invalid, please log in again',
  },
  AUTH_ACCOUNT_INACTIVE: {
    lo: 'ບັນຊີຂອງທ່ານຖືກລະງັບ ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ',
    vi: 'Tài khoản đã bị vô hiệu hóa, liên hệ quản trị viên',
    en: 'Account is inactive, contact system admin',
  },
  AUTH_FORBIDDEN: {
    lo: 'ທ່ານບໍ່ມີສິດດຳເນີນການນີ້',
    vi: 'Bạn không có quyền thực hiện thao tác này',
    en: 'You do not have permission to perform this action',
  },

  // ── TRANSACTION ───────────────────────────────────────────────────────────
  TRANSACTION_NOT_FOUND: {
    lo: 'ບໍ່ພົບໃບຮຽກເກັບເງິນ',
    vi: 'Không tìm thấy giao dịch',
    en: 'Transaction not found',
  },
  TRANSACTION_ALREADY_COMPLETED: {
    lo: 'ການໂອນເງິນສຳເລັດແລ້ວ ບໍ່ສາມາດດັດແກ້ໄດ້',
    vi: 'Giao dịch đã hoàn tất, không thể chỉnh sửa',
    en: 'Transaction already completed and cannot be modified',
  },
  TRANSACTION_INVALID_STATUS: {
    lo: 'ສະຖານະການໂອນເງິນບໍ່ຖືກຕ້ອງສຳລັບການດຳເນີນການນີ້',
    vi: 'Trạng thái giao dịch không hợp lệ cho thao tác này',
    en: 'Invalid transaction status for this operation',
  },

  // ── TRADE ─────────────────────────────────────────────────────────────────
  TRADE_NOT_FOUND: {
    lo: 'ບໍ່ພົບການໂອນສິນຄ້າ',
    vi: 'Không tìm thấy giao dịch mua vào / đổi hàng',
    en: 'Trade transaction not found',
  },

  // ── CONFIG ────────────────────────────────────────────────────────────────
  CONFIG_PRICE_NOT_FOUND: {
    lo: 'ຍັງບໍ່ໄດ້ຕັ້ງລາຄາ ກະລຸນາຕິດຕໍ່ຜູ້ຄຸ້ມຄອງ',
    vi: 'Chưa có bảng giá, liên hệ quản lý để cài đặt',
    en: 'No price configuration found, contact manager',
  },
  CONFIG_RATE_NOT_FOUND: {
    lo: 'ບໍ່ພົບອັດຕາແລກປ່ຽນສຳລັບສະກຸນເງິນນີ້',
    vi: 'Không có tỷ giá cho loại ngoại tệ này',
    en: 'Exchange rate not found for this currency',
  },
  CONFIG_GOLD_PURITY_CODE_DUPLICATE: {
    lo: 'ລະຫັດຄວາມບໍລິສຸດຂອງທອງທີ່ຊ້ຳກັນ',
    vi: 'Mã độ tinh khiết vàng đã tồn tại',
    en: 'Gold purity code already exists',
  },

  // ── INVENTORY ─────────────────────────────────────────────────────────────
  INVENTORY_NOT_FOUND: {
    lo: 'ບໍ່ພົບສິນຄ້າໃນສາງ',
    vi: 'Không tìm thấy mục kho',
    en: 'Inventory item not found',
  },
  INVENTORY_INSUFFICIENT_STOCK: {
    lo: 'ສິນຄ້າໃນສາງບໍ່ພຽງພໍ',
    vi: 'Số lượng tồn kho không đủ',
    en: 'Insufficient stock quantity',
  },

  // ── PRODUCT ───────────────────────────────────────────────────────────────
  PRODUCT_NOT_FOUND: {
    lo: 'ບໍ່ພົບສິນຄ້າ',
    vi: 'Không tìm thấy sản phẩm',
    en: 'Product not found',
  },
  PRODUCT_CODE_DUPLICATE: {
    lo: 'ລະຫັດສິນຄ້າຊ້ຳກັນ',
    vi: 'Mã sản phẩm đã tồn tại',
    en: 'Product code already exists',
  },
  PRODUCT_CATEGORY_CODE_DUPLICATE: {
    lo: 'ລະຫັດໝວດໝູ່ສິນຄ້າຊ້ຳກັນ',
    vi: 'Mã danh mục đã tồn tại',
    en: 'Product category code already exists',
  },
  PRODUCT_CATEGORY_NOT_FOUND: {
    lo: 'ບໍ່ພົບໝວດໝູ່ສິນຄ້າ',
    vi: 'Không tìm thấy danh mục sản phẩm',
    en: 'Product category not found',
  },

  // ── USER ──────────────────────────────────────────────────────────────────
  USER_NOT_FOUND: {
    lo: 'ບໍ່ພົບຜູ້ໃຊ້',
    vi: 'Không tìm thấy người dùng',
    en: 'User not found',
  },
  USER_EMPLOYEE_CODE_DUPLICATE: {
    lo: 'ລະຫັດພະນັກງານຊ້ຳກັນ',
    vi: 'Mã nhân viên đã tồn tại',
    en: 'Employee code already exists',
  },

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  CUSTOMER_NOT_FOUND: {
    lo: 'ບໍ່ພົບລູກຄ້າ',
    vi: 'Không tìm thấy khách hàng',
    en: 'Customer not found',
  },
  CUSTOMER_PHONE_DUPLICATE: {
    lo: 'ເບີໂທລະສັບຖືກລົງທະບຽນໄວ້ແລ້ວ',
    vi: 'Số điện thoại đã được đăng ký',
    en: 'Phone number already registered',
  },

  // ── VALIDATION ────────────────────────────────────────────────────────────
  VALIDATION_FAILED: {
    lo: 'ຂໍ້ມູນທີ່ປ້ອນເຂົ້າບໍ່ຖືກຕ້ອງ',
    vi: 'Dữ liệu đầu vào không hợp lệ',
    en: 'Input validation failed',
  },

  // ── RESOURCE ──────────────────────────────────────────────────────────────
  RESOURCE_NOT_FOUND: {
    lo: 'ບໍ່ພົບຊັບພະຍາກອນ',
    vi: 'Không tìm thấy tài nguyên',
    en: 'Resource not found',
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  SYSTEM_INTERNAL_ERROR: {
    lo: 'ເກີດຂໍ້ຜິດພາດທີ່ລະບົບ ກະລຸນາລອງໃໝ່',
    vi: 'Lỗi hệ thống nội bộ, vui lòng thử lại',
    en: 'Internal server error, please try again',
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Trả về message hiển thị từ errorCode và locale.
 * Fallback chain: locale → 'en' → SYSTEM_INTERNAL_ERROR[locale]
 */
export function getErrorMessage(code: string, locale: AppLocale = 'lo'): string {
  return (
    ERROR_MESSAGES[code]?.[locale] ??
    ERROR_MESSAGES[code]?.['en'] ??
    ERROR_MESSAGES['SYSTEM_INTERNAL_ERROR'][locale]
  )
}

/**
 * Lấy toàn bộ messages validation từ response lỗi 422.
 * Trả về mảng flat các message lỗi theo từng field.
 */
export function getValidationMessages(
  errors: Record<string, string[]>,
  locale: AppLocale = 'lo'
): string[] {
  return Object.values(errors).flat().map(code => getErrorMessage(code, locale))
}

/**
 * Helper: extract errorCode từ axios error và convert sang message.
 * Dùng trong onError của useMutation.
 */
export function extractErrorMessage(
  err: unknown,
  locale: AppLocale = 'lo'
): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { errorCode?: string } } }).response
    const code = response?.data?.errorCode
    if (code) return getErrorMessage(code, locale)
  }
  return getErrorMessage('SYSTEM_INTERNAL_ERROR', locale)
}
