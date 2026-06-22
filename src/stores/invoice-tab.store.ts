/**
 * Invoice Tab Store — Zustand
 *
 * Quản lý toàn bộ state của hệ thống đa hóa đơn.
 * Mỗi tab là một InvoiceTab độc lập — cart, khách hàng, giảm giá riêng biệt.
 *
 * Quy tắc:
 *  - Luôn giữ ít nhất 1 tab (closeTab bỏ qua nếu chỉ còn 1)
 *  - Tab có status 'paying' không được đóng (rule 8 từ docs)
 *  - Persist: chỉ lưu tabs[], không lưu activeTabId (tránh stale sau reload)
 *  - Sau rehydrate: activeTabId được reset về tabs[0].id
 */

import type { CartItem } from "@/types/cart";
import type { FxLine, InvoiceTab, InvoiceTabStore } from "@/types/invoice-tab";
import type { TransactionType } from "@/types/transaction";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { genId } from "@/lib/utils";

let _tabCounter = 1;

function makeNewTab(type: TransactionType = "SellGold"): InvoiceTab {
  return {
    id: genId(),
    label: `INV-${String(_tabCounter++).padStart(3, "0")}`,
    status: "draft",
    createdAt: new Date().toISOString(),
    txnType: type,
    items: [],
    customerId: null,
    customerName: null,
    customerPhone: null,
    couponCode: null,
    discountAmount: 0,
    note: "",
    linkedInvoiceCode: null,
    linkedInvoiceItemKeys: [],
    cancelTransactionId: null,
    cancelInvoiceCode: null,
    fxLines: [],
    fxPaymentMethod: 'CASH',
    fxFromCurrency: 'USD',
    fxToCurrency: 'LAK',
    fxFromAmount: 0,
    fxToAmount: 0,
    fxLakAmount: 0,
    fxFromRate: 1,
    fxToRate: 1,
  };
}

function resolveActiveId(tabs: InvoiceTab[], activeTabId: string | null): string | undefined {
  if (activeTabId && tabs.find((t) => t.id === activeTabId)) return activeTabId;
  return tabs[0]?.id;
}

const firstTab = makeNewTab();

export const useInvoiceTabStore = create<InvoiceTabStore>()(
  persist(
    (set, get) => ({
      tabs: [firstTab],
      activeTabId: firstTab.id,

      // ── Tab lifecycle ──────────────────────────────────────────────────────

      openTab() {
        const tab = makeNewTab("SellGold");
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      openTabWithType(type: TransactionType) {
        const tab = makeNewTab(type);
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      closeTab(id) {
        const { tabs, activeTabId } = get();
        if (tabs.length === 1) return;
        const target = tabs.find((t) => t.id === id);
        if (target?.status === "paying") return;
        const idx = tabs.findIndex((t) => t.id === id);
        const next = tabs[idx + 1] ?? tabs[idx - 1];
        set({
          tabs: tabs.filter((t) => t.id !== id),
          activeTabId: activeTabId === id ? next.id : activeTabId,
        });
      },

      switchTab(id) { set({ activeTabId: id }); },

      duplicateTab(id) {
        const src = get().tabs.find((t) => t.id === id);
        if (!src) return;
        const tab: InvoiceTab = {
          ...makeNewTab(),
          items: src.items.map((i) => ({ ...i })),
          customerId: src.customerId,
          customerName: src.customerName,
          customerPhone: src.customerPhone,
        };
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      holdTab(id) {
        set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, status: "holding" } : t) }));
      },

      updateTab(id, patch) {
        set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, ...patch } : t) }));
      },

      // ── Cart mutations ──────────────────────────────────────────────────────

      addItemToActive(item: CartItem) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;

        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            // Dedup: productId + itemRole, nhưng KHÔNG tính isReadOnly items (cancel mode)
            const existing = t.items.find(
              (i) => i.productId === item.productId && i.itemRole === item.itemRole && !i.isReadOnly,
            );
            const items = existing
              ? t.items.map((i) =>
                  i.productId === item.productId && i.itemRole === item.itemRole
                    ? { ...i, qty: i.qty + 1 }
                    : i,
                )
              : [...t.items, { ...item, qty: item.qty || 1 }];
            return { ...t, items };
          }),
        });
      },

      removeItemFromActive(productId: string) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            const items = t.items
              .map((i) => i.productId === productId && i.itemRole === 'Normal' ? { ...i, qty: i.qty - 1 } : i)
              .filter((i) => i.qty > 0);
            return { ...t, items };
          }),
        });
      },

      deleteItemFromActive(productId: string, itemRole?: 'Normal' | 'ExchangeIn') {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            const newItems = itemRole
              ? t.items.filter((i) => !(i.productId === productId && i.itemRole === itemRole))
              : t.items.filter((i) => i.productId !== productId);
            const newLinkedKeys = t.linkedInvoiceItemKeys.filter((k) => k !== productId);
            return {
              ...t,
              items: newItems,
              linkedInvoiceItemKeys: newLinkedKeys,
              linkedInvoiceCode: newLinkedKeys.length === 0 ? null : t.linkedInvoiceCode,
            };
          }),
        });
      },

      setItemQtyInActive(productId: string, qty: number, itemRole?: 'Normal' | 'ExchangeIn') {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            const matches = (i: CartItem) =>
              i.productId === productId && (itemRole == null || i.itemRole === itemRole);
            const items = qty <= 0
              ? t.items.filter((i) => !matches(i))
              : t.items.map((i) =>
                  matches(i) ? { ...i, qty, weightGramOverride: null } : i,
                );
            return { ...t, items };
          }),
        });
      },

      clearActiveCart() {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) =>
            t.id !== activeId ? t : {
              ...t,
              items: [],
              couponCode: null,
              discountAmount: 0,
              note: "",
              linkedInvoiceCode: null,
              linkedInvoiceItemKeys: [],
              cancelTransactionId: null,
              cancelInvoiceCode: null,
              customerId: null,
              customerName: null,
              fxLines: [],
            },
          ),
        });
      },

      updateCartItemInActive(productId: string, patch: Partial<CartItem>, itemRole?: 'Normal' | 'ExchangeIn') {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            return {
              ...t,
              items: t.items.map((i) => {
                if (i.productId !== productId) return i;
                if (itemRole != null && i.itemRole !== itemRole) return i;
                return { ...i, ...patch };
              }),
            };
          }),
        });
      },

      setLinkedInvoice(code: string, newItems: CartItem[]) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            // Xóa items từ HĐ cũ trước đó
            const keysToRemove = t.linkedInvoiceItemKeys;
            const remaining = t.items.filter((i) => !keysToRemove.includes(i.productId));
            return {
              ...t,
              items: [...newItems, ...remaining],
              linkedInvoiceCode: code,
              linkedInvoiceItemKeys: newItems.map((i) => i.productId),
            };
          }),
        });
      },

      clearLinkedInvoice() {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            return {
              ...t,
              items: t.items.filter((i) => !t.linkedInvoiceItemKeys.includes(i.productId)),
              linkedInvoiceCode: null,
              linkedInvoiceItemKeys: [],
            };
          }),
        });
      },

      getActiveTab() {
        const { tabs, activeTabId } = get();
        const activeId = resolveActiveId(tabs, activeTabId);
        return tabs.find((t) => t.id === activeId);
      },

      enterCancelMode(transactionId, invoiceCode, items, customerId, customerName, customerPhone) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            return {
              ...t,
              items,
              customerId,
              customerName,
              customerPhone,
              couponCode: null,
              discountAmount: 0,
              note: '',
              linkedInvoiceCode: null,
              linkedInvoiceItemKeys: [],
              cancelTransactionId: transactionId,
              cancelInvoiceCode: invoiceCode,
            };
          }),
        });
      },

      exitCancelMode() {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            return {
              ...t,
              items: [],
              customerId: null,
              customerName: null,
              customerPhone: null,
              cancelTransactionId: null,
              cancelInvoiceCode: null,
            };
          }),
        });
      },

      setFxLinesInActive(lines: FxLine[]) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) =>
            t.id !== activeId ? t : { ...t, fxLines: lines },
          ),
        });
      },

      setFxPaymentMethodInActive(method: 'CASH' | 'BANK') {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) =>
            t.id !== activeId ? t : { ...t, fxPaymentMethod: method },
          ),
        });
      },

      setFxDataInActive(fromCurrency, toCurrency, fromAmount, toAmount, lakAmount, fromRate, toRate) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;
        set({
          tabs: tabs.map((t) =>
            t.id !== activeId ? t : {
              ...t,
              fxFromCurrency: fromCurrency,
              fxToCurrency: toCurrency,
              fxFromAmount: fromAmount,
              fxToAmount: toAmount,
              fxLakAmount: lakAmount,
              fxFromRate: fromRate,
              fxToRate: toRate,
            },
          ),
        });
      },
    }),

    {
      // v4: thêm fxLines[] và fxPaymentMethod cho multi-line ExchangeCurrency
      name: "pos-invoice-tabs-v4",
      partialize: (s) => ({ tabs: s.tabs }),

      onRehydrateStorage: () => (state) => {
        if (!state || state.tabs.length === 0) return;

        state.tabs = state.tabs.map((t) => ({
          ...t,
          txnType: t.txnType ?? "SellGold",
          linkedInvoiceCode: t.linkedInvoiceCode ?? null,
          linkedInvoiceItemKeys: t.linkedInvoiceItemKeys ?? [],
          fxLines: t.fxLines ?? [],
          fxPaymentMethod: t.fxPaymentMethod ?? 'CASH',
          fxFromCurrency: t.fxFromCurrency ?? 'USD',
          fxToCurrency: t.fxToCurrency ?? 'LAK',
          fxFromAmount: t.fxFromAmount ?? 0,
          fxToAmount: t.fxToAmount ?? 0,
          fxLakAmount: t.fxLakAmount ?? 0,
          fxFromRate: t.fxFromRate ?? 1,
          fxToRate: t.fxToRate ?? 1,
          cancelTransactionId: t.cancelTransactionId ?? null,
          cancelInvoiceCode: t.cancelInvoiceCode ?? null,
          items: t.items
            .filter((i) => "productId" in i && !!i.productId)
            .map((i) => ({
              ...i,
              itemRole: i.itemRole ?? 'Normal',
              perItemDamage: i.perItemDamage ?? 0,
              perItemWearChi: i.perItemWearChi ?? 0,
              wearUnitGram: i.wearUnitGram ?? 3.75,
              isDamaged: i.isDamaged ?? false,
              isReadOnly: i.isReadOnly ?? false,
            })),
        }));

        state.activeTabId = state.tabs[0].id;

        const maxNum = state.tabs.reduce((max, t) => {
          const match = t.label.match(/INV-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        _tabCounter = maxNum + 1;
      },
    },
  ),
);
