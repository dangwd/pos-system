/**
 * Invoice Tab System — Data Model
 *
 * Mỗi InvoiceTab là một hóa đơn độc lập, có cart riêng biệt.
 * Thu ngân có thể mở nhiều tab song song và switch qua lại mà không mất dữ liệu.
 */

import type { CartItem } from "./cart";
import type { TransactionType } from "./transaction";

/** draft: đang soạn | holding: tạm giữ | paying: đang trong flow thanh toán */
export type InvoiceStatus = "draft" | "holding" | "paying";

export interface InvoiceTab {
  id: string;
  label: string;
  status: InvoiceStatus;
  createdAt: string;
  txnType: TransactionType;

  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  couponCode: string | null;
  discountAmount: number;
  note: string;

  // ── ExchangeGold: hóa đơn liên kết ──────────────────────────────────────────
  /** Mã HĐ bán vàng cũ đã liên kết (ExchangeGold) */
  linkedInvoiceCode: string | null;
  /** productId của các CartItem ExchangeIn được load từ HĐ liên kết */
  linkedInvoiceItemKeys: string[];

  // ── CancelMode: tra cứu để hủy hóa đơn ──────────────────────────────────────
  /** ID giao dịch đang cần hủy — null = không ở chế độ hủy */
  cancelTransactionId: string | null;
  /** Mã HĐ hiển thị (để hiện badge sau reload) */
  cancelInvoiceCode: string | null;

  // ── ExchangeCurrency: dữ liệu ngoại tệ ───────────────────────────────────────
  fxFromCurrency: string; // mặc định "USD"
  fxToCurrency: string; // mặc định "LAK"
  fxFromAmount: number; // số tiền khách đưa
  fxToAmount: number; // số tiền khách nhận
  fxLakAmount: number; // giá trị quy LAK (= foreignAmount × exchangeRate, ghi sổ)
  fxFromRate: number; // tỷ giá tiền nguồn → LAK (effectiveRate); 1 khi nguồn = LAK
  fxToRate: number; // tỷ giá tiền đích → LAK (effectiveRate); 1 khi đích = LAK
}

export interface InvoiceTabStore {
  tabs: InvoiceTab[];
  activeTabId: string | null;

  // Tab lifecycle
  openTab: () => void;
  openTabWithType: (type: TransactionType) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  holdTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<InvoiceTab>) => void;

  // Cart mutations — luôn tác động lên active tab
  addItemToActive: (item: CartItem) => void;
  removeItemFromActive: (productId: string) => void;
  deleteItemFromActive: (productId: string, itemRole?: 'Normal' | 'ExchangeIn') => void;
  setItemQtyInActive: (productId: string, qty: number) => void;
  clearActiveCart: () => void;

  /** Cập nhật một số trường của CartItem trong active tab (dùng cho Tiền công/ HAO HỤT) */
  updateCartItemInActive: (productId: string, patch: Partial<CartItem>) => void;

  /** Load items từ HĐ cũ vào active tab dưới dạng ExchangeIn */
  setLinkedInvoice: (code: string, items: CartItem[]) => void;
  /** Xóa HĐ liên kết và các ExchangeIn items tương ứng */
  clearLinkedInvoice: () => void;

  /** Vào chế độ hủy HĐ: xóa cart hiện tại, fill items + customer từ HĐ tìm được */
  enterCancelMode: (
    transactionId: string,
    invoiceCode: string,
    items: CartItem[],
    customerId: string | null,
    customerName: string | null,
    customerPhone: string | null,
  ) => void;
  /** Thoát chế độ hủy: reset cart + customer + cancel fields */
  exitCancelMode: () => void;

  getActiveTab: () => InvoiceTab | undefined;

  /** Cập nhật dữ liệu ngoại tệ cho active tab (ExchangeCurrency) */
  setFxDataInActive: (
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    toAmount: number,
    lakAmount: number,
    fromRate: number,
    toRate: number,
  ) => void;
}
