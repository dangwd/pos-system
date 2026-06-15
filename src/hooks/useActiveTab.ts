/**
 * useActiveTab — Facade hook cho tab đang active
 *
 * Khi switch tab → hook trả về data mới → component tự re-render.
 * Không cần prop drilling hay context thủ công.
 */

import {
  calcNetTotal,
  calcSubtotal,
  calcTotal,
  calcTotalA,
  calcTotalB,
} from "@/lib/pricing";
import { useInvoiceTabStore } from "@/stores/invoice-tab.store";
import { useMemo } from "react";

export function useActiveTab() {
  const {
    tabs,
    activeTabId,
    updateTab,
    addItemToActive,
    removeItemFromActive,
    deleteItemFromActive,
    setItemQtyInActive,
    clearActiveCart,
    updateCartItemInActive,
    setLinkedInvoice,
    clearLinkedInvoice,
    enterCancelMode,
    exitCancelMode,
    setFxDataInActive,
  } = useInvoiceTabStore();

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  );

  const items = activeTab?.items ?? [];
  const txnType = activeTab?.txnType ?? "SellGold";
  const discount = activeTab?.discountAmount ?? 0;

  // ── Computed values ────────────────────────────────────────────────────────

  /** Gross value tất cả items (weight × price) — cho hiển thị SummaryBar */
  const subtotal = useMemo(() => calcSubtotal(items), [items]);

  /** Tổng Normal items (hàng bán ra / mua vào) */
  const totalA = useMemo(() => calcTotalA(items), [items]);

  /** Tổng ExchangeIn items (vàng cũ, sau Tiền công/ HAO HỤT) */
  const totalB = useMemo(() => calcTotalB(items), [items]);

  /**
   * Chênh lệch có dấu:
   *  BuyGold:      âm  → tiệm chi ra
   *  ExchangeGold: dương/âm tuỳ A vs B
   *  SellGold:     luôn dương
   */
  const netTotal = useMemo(
    () => calcNetTotal(items, txnType, discount),
    [items, txnType, discount],
  );

  /** Số tiền thanh toán thực tế (luôn dương) */
  const total = useMemo(() => {
    // FX: bỏ qua items, lấy thẳng fxLakAmount
    if (txnType === "ExchangeCurrency") return activeTab?.fxLakAmount ?? 0;
    return calcTotal(items, discount, txnType);
  }, [items, discount, txnType, activeTab?.fxLakAmount]);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  // ── Actions ────────────────────────────────────────────────────────────────

  const setCustomer = (id: string, name: string, phone?: string | null) => {
    if (activeTab)
      updateTab(activeTab.id, {
        customerId: id,
        customerName: name,
        customerPhone: phone ?? null,
      });
  };

  const clearCustomer = () => {
    if (activeTab)
      updateTab(activeTab.id, {
        customerId: null,
        customerName: null,
        customerPhone: null,
      });
  };

  const setNote = (note: string) => {
    if (activeTab) updateTab(activeTab.id, { note });
  };

  const applyDiscount = (discountAmount: number) => {
    if (activeTab) updateTab(activeTab.id, { discountAmount });
  };

  const clearDiscount = () => {
    if (activeTab)
      updateTab(activeTab.id, { couponCode: null, discountAmount: 0 });
  };

  const setFxData = (
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    toAmount: number,
    lakAmount: number,
    fromRate: number,
    toRate: number,
  ) => {
    setFxDataInActive(
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      lakAmount,
      fromRate,
      toRate,
    );
  };

  return {
    tab: activeTab,
    subtotal,
    totalA,
    totalB,
    netTotal,
    total,
    totalQty,

    addItem: addItemToActive,
    removeItem: removeItemFromActive,
    deleteItem: deleteItemFromActive,
    setQty: setItemQtyInActive,
    clearCart: clearActiveCart,
    updateCartItem: updateCartItemInActive,
    setLinkedInvoice,
    clearLinkedInvoice,
    enterCancelMode,
    exitCancelMode,

    setCustomer,
    clearCustomer,
    setNote,
    applyDiscount,
    clearDiscount,
    setFxData,
  };
}
