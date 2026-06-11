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
import type { InvoiceTab, InvoiceTabStore } from "@/types/invoice-tab";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Label counter ────────────────────────────────────────────────────────────
// Module-level để tăng liên tục trong session; được hiệu chỉnh lại sau rehydrate

let _tabCounter = 1;

/** Tạo tab mới với label tự tăng */
function makeNewTab(): InvoiceTab {
  return {
    id: crypto.randomUUID(),
    label: `INV-${String(_tabCounter++).padStart(3, "0")}`,
    status: "draft",
    createdAt: new Date().toISOString(),
    items: [],
    customerId: null,
    customerName: null,
    couponCode: null,
    discountAmount: 0,
    note: "",
  };
}

/** Lấy active tab (fallback tabs[0] nếu activeTabId chưa được set) */
function resolveActiveId(
  tabs: InvoiceTab[],
  activeTabId: string | null,
): string | undefined {
  if (activeTabId && tabs.find((t) => t.id === activeTabId)) return activeTabId;
  return tabs[0]?.id;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const firstTab = makeNewTab();

export const useInvoiceTabStore = create<InvoiceTabStore>()(
  persist(
    (set, get) => ({
      tabs: [firstTab],
      activeTabId: firstTab.id,

      // ── Tab lifecycle ──────────────────────────────────────────────────────

      openTab() {
        const tab = makeNewTab();
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      closeTab(id) {
        const { tabs, activeTabId } = get();

        // Luôn giữ ít nhất 1 tab
        if (tabs.length === 1) return;

        // Rule 8: không đóng tab đang trong flow thanh toán
        const target = tabs.find((t) => t.id === id);
        if (target?.status === "paying") return;

        const idx = tabs.findIndex((t) => t.id === id);
        const next = tabs[idx + 1] ?? tabs[idx - 1];

        set({
          tabs: tabs.filter((t) => t.id !== id),
          // Nếu đóng tab đang active → chuyển sang tab kề
          activeTabId: activeTabId === id ? next.id : activeTabId,
        });
      },

      switchTab(id) {
        set({ activeTabId: id });
      },

      duplicateTab(id) {
        const src = get().tabs.find((t) => t.id === id);
        if (!src) return;
        const tab: InvoiceTab = {
          ...makeNewTab(),
          // Copy cart và khách hàng từ tab nguồn
          items: src.items.map((i) => ({ ...i })),
          customerId: src.customerId,
          customerName: src.customerName,
        };
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      holdTab(id) {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === id ? { ...t, status: "holding" } : t,
          ),
        }));
      },

      updateTab(id, patch) {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },

      // ── Cart mutations — tác động lên tab đang active ──────────────────────

      addItemToActive(item: CartItem) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;

        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            // Duplicate check by productId (1 mục kho = 1 đơn vị vật lý)
            const existing = t.items.find(
              (i) => i.productId === item.productId,
            );
            const items = existing
              ? t.items.map((i) =>
                  i.productId === item.productId
                    ? { ...i, qty: i.qty + 1 }
                    : i,
                )
              : [...t.items, { ...item, qty: 1 }];
            return { ...t, items };
          }),
        });
      },

      /** Giảm qty 1; tự động xóa nếu qty về 0 */
      removeItemFromActive(productId: string) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;

        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            const items = t.items
              .map((i) =>
                i.productId === productId
                  ? { ...i, qty: i.qty - 1 }
                  : i,
              )
              .filter((i) => i.qty > 0);
            return { ...t, items };
          }),
        });
      },

      /** Xóa hoàn toàn sản phẩm khỏi cart (không giảm từng bước) */
      deleteItemFromActive(productId: string) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;

        set({
          tabs: tabs.map((t) =>
            t.id !== activeId
              ? t
              : {
                  ...t,
                  items: t.items.filter(
                    (i) => i.productId !== productId,
                  ),
                },
          ),
        });
      },

      /** Set qty chính xác; qty <= 0 → xóa sản phẩm */
      setItemQtyInActive(productId: string, qty: number) {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;

        set({
          tabs: tabs.map((t) => {
            if (t.id !== activeId) return t;
            const items =
              qty <= 0
                ? t.items.filter((i) => i.productId !== productId)
                : t.items.map((i) =>
                    i.productId === productId ? { ...i, qty } : i,
                  );
            return { ...t, items };
          }),
        });
      },

      /** Xóa toàn bộ cart + coupon + note của tab active */
      clearActiveCart() {
        const { tabs } = get();
        const activeId = resolveActiveId(tabs, get().activeTabId);
        if (!activeId) return;

        set({
          tabs: tabs.map((t) =>
            t.id !== activeId
              ? t
              : {
                  ...t,
                  items: [],
                  couponCode: null,
                  discountAmount: 0,
                  note: "",
                },
          ),
        });
      },

      getActiveTab() {
        const { tabs, activeTabId } = get();
        const activeId = resolveActiveId(tabs, activeTabId);
        return tabs.find((t) => t.id === activeId);
      },
    }),

    {
      // v2: đổi tên key để xóa dữ liệu cũ (CartItem schema thay đổi — cần productId)
      name: "pos-invoice-tabs",

      // Chỉ persist tabs[], không persist activeTabId để tránh stale sau reload
      partialize: (s) => ({ tabs: s.tabs }),

      // Sau khi rehydrate: lọc items lỗi schema cũ, khôi phục activeTabId, đồng bộ counter
      onRehydrateStorage: () => (state) => {
        if (!state || state.tabs.length === 0) return;

        // Loại bỏ CartItem không có productId (schema cũ trước khi migrate)
        state.tabs = state.tabs.map((t) => ({
          ...t,
          items: t.items.filter(
            (i) => "productId" in i && !!i.productId,
          ),
        }));

        // Set activeTabId về tab đầu tiên
        state.activeTabId = state.tabs[0].id;

        // Đồng bộ _tabCounter để label mới không trùng label cũ
        const maxNum = state.tabs.reduce((max, t) => {
          const match = t.label.match(/INV-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        _tabCounter = maxNum + 1;
      },
    },
  ),
);
