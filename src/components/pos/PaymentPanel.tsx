/**
 * PaymentPanel — Panel thanh toán bên phải màn hình POS
 *
 * Cấu trúc:
 *  1. StoreHeader       — tên cửa hàng / chi nhánh
 *  2. OrderLookup       — tra cứu hóa đơn cũ (F6)
 *  3. CustomerSection   — gắn khách hàng (F4)
 *  4. PaymentBreakdown  — chi tiết: tổng, giảm, tiền thực thu
 *  5. CheckoutButton    — mở PaymentModal
 */

"use client";

import { CustomerCreateDialog } from "@/components/admin/customers/CustomerCreateDialog";
import { Button } from "antd";
import { Input } from "@/components/ui/input";
import { useActiveTab } from "@/hooks/useActiveTab";
import { useCustomers } from "@/hooks/useCustomers";
import type { Customer } from "@/types/customer";
import {
  CreditCard,
  Loader2,
  Plus,
  Receipt,
  ScanLine,
  Search,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKip(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {children}
      </p>
      {action}
    </div>
  );
}

// ─── 1. StoreHeader ───────────────────────────────────────────────────────────

function StoreHeader() {
  const t = useTranslations("pos.payment.panel");
  return (
    <div className="px-4 py-3.5 bg-primary text-primary-foreground shrink-0">
      <p className="text-xs font-extrabold tracking-wide uppercase text-center leading-snug">
        {t("storeName")}
      </p>
      <p className="text-[10px] mt-0.5 opacity-60 tracking-widest text-center uppercase">
        {t("storeAddress")}
      </p>
    </div>
  );
}

// ─── 2. OrderLookup ───────────────────────────────────────────────────────────

function OrderLookup() {
  const t = useTranslations("pos.payment.panel");
  const [code, setCode] = useState("");
  const scanRef = useRef<HTMLButtonElement>(null);

  // F6 → focus order lookup input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F6") {
        e.preventDefault();
        document.getElementById("pos-order-lookup")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="px-4 py-3 shrink-0">
      <SectionLabel
        action={
          <button className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
            <Receipt className="h-2.5 w-2.5" />
            {t("reprint")}
          </button>
        }
      >
        {t("lookupLabel")}
      </SectionLabel>
      <div className="flex gap-1.5">
        <Input
          id="pos-order-lookup"
          placeholder={t("lookupPlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.trim()) {
              e.preventDefault();
              scanRef.current?.click();
            }
          }}
          className="h-8 text-xs flex-1"
        />
        <button
          ref={scanRef}
          className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border bg-muted hover:bg-accent transition-colors"
        >
          <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ─── 3. CustomerSection ───────────────────────────────────────────────────────

function CustomerSection() {
  const t = useTranslations("pos.payment.panel");
  const { tab, setCustomer, clearCustomer } = useActiveTab();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: customers = [], isFetching } = useCustomers(debouncedQuery);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // F4 → focus customer search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F4") {
        e.preventDefault();
        document.getElementById("pos-customer-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (customer: Customer) => {
    setCustomer(customer.id, customer.name, customer.phoneNumber);
    setQuery("");
    setDebouncedQuery("");
    setFocusedIndex(-1);
    setOpen(false);
  };

  return (
    <div className="px-4 py-3 shrink-0">
      <SectionLabel>{t("customerLabel")}</SectionLabel>

      {tab?.customerName ? (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{tab.customerName}</p>
            {(tab.customerPhone) && (
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {tab.customerPhone}
              </p>
            )}
          </div>
          <button
            onClick={clearCustomer}
            className="shrink-0 p-1 rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0">
              <Input
                id="pos-customer-search"
                placeholder={t("customerSearch")}
                prefix={<Search className="h-3 w-3 text-muted-foreground" />}
                suffix={isFetching ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusedIndex(-1);
                  setOpen(!!e.target.value);
                }}
                onFocus={() => query && setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setQuery(""); setFocusedIndex(-1); }
                  if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex((p) => Math.min(p + 1, customers.length - 1)); if (!open && customers.length) setOpen(true); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex((p) => Math.max(p - 1, -1)); }
                  if (e.key === "Enter") {
                    const target = focusedIndex >= 0 ? customers[focusedIndex] : customers[0];
                    if (target) handleSelect(target);
                  }
                }}
                className="h-8 text-xs"
              />
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              title={t("createCustomer")}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border bg-muted hover:bg-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {open &&
            (customers.length > 0 || (debouncedQuery && !isFetching)) && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
                {customers.length > 0 ? (
                  customers.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0${focusedIndex === i ? " bg-accent text-accent-foreground" : ""}`}
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {c.phoneNumber}
                          {c.loyaltyTier ? ` · ${c.loyaltyTier}` : ""}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-5 text-center text-xs text-muted-foreground">
                    {t("customerNotFound")}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      <CustomerCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

// ─── 4a. FxBreakdown — dùng khi txnType === ExchangeCurrency ─────────────────

function FxBreakdown() {
  const { tab, total } = useActiveTab()
  const from = tab?.fxFromAmount ?? 0
  const fromCurr = tab?.fxFromCurrency ?? 'USD'
  const to = tab?.fxToAmount ?? 0
  const toCurr = tab?.fxToCurrency ?? 'LAK'
  const lak = tab?.fxLakAmount ?? 0
  const rate = from > 0 ? Math.round(lak / from) : 0

  return (
    <div className="px-4 py-3 flex-1 flex flex-col gap-3">
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Khách nộp quầy</span>
          <span className="text-xs font-semibold tabular-nums">
            {from > 0 ? from.toLocaleString('en', { maximumFractionDigits: 2 }) : '—'} {fromCurr}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Tỷ suất quy đổi</span>
          <span className="text-xs font-semibold tabular-nums text-primary">
            {rate > 0 ? `1 ${fromCurr} = ${rate.toLocaleString('lo-LA')} ₭` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Khách hàng thực nhận</span>
          <span className="text-xs font-semibold tabular-nums">
            {to > 0 ? to.toLocaleString('en', { maximumFractionDigits: 4 }) : '—'} {toCurr}
          </span>
        </div>
      </div>

      <div className="border-t border-border" />

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
          Giá trị quy LAK
        </p>
        <p className="text-3xl font-black tabular-nums tracking-tight leading-none text-foreground">
          {total.toLocaleString('lo-LA')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">₭ (Kip Lào)</p>
      </div>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Bút toán hoán đổi ngoại tệ sẽ được ghi tự động vào Sổ Quỹ Kết.
      </p>
    </div>
  )
}

// ─── 4. PaymentBreakdown ──────────────────────────────────────────────────────

interface PaymentBreakdownProps {
  subtotal: number;
  discount: number;
  total: number;
  onApplyDiscount: (discountAmount: number) => void;
  onClearDiscount: () => void;
}

function PaymentBreakdown({
  subtotal,
  discount,
  total,
  onApplyDiscount,
  onClearDiscount,
}: PaymentBreakdownProps) {
  const t = useTranslations("pos.payment.panel");
  const [discountInput, setDiscountInput] = useState("");

  const handleApply = () => {
    const amount = parseInt(discountInput.replace(/\D/g, ""), 10);
    if (!isNaN(amount) && amount > 0) {
      onApplyDiscount(amount);
      setDiscountInput("");
    }
  };

  return (
    <div className="px-4 py-3 flex-1 flex flex-col gap-3">
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {t("subtotalLabel")}
          </span>
          <span className="text-xs font-medium tabular-nums">
            {formatKip(subtotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {t("discountLabel")}
          </span>
          <span
            className={`text-xs font-medium tabular-nums ${discount > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            -{formatKip(discount)}
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-border/60" />

      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
          {t("discountLabel")}
        </p>
        {discount > 0 ? (
          <div className="flex items-center justify-between bg-secondary rounded-md px-3 py-2 border border-border">
            <span className="text-xs font-semibold tabular-nums">
              -{formatKip(discount)}
            </span>
            <button
              onClick={onClearDiscount}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Input
              placeholder={t("discountInput")}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              className="h-8 text-xs flex-1"
              type="number"
              min={0}
            />
            <Button
              size="small"
              onClick={handleApply}
              disabled={!discountInput.trim()}
              className="h-8 text-xs px-3 shrink-0"
            >
              {t("applyDiscount")}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">
          {t("balance")}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatKip(total)}
        </span>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
          {t("totalDue")}
        </p>
        <p className="text-3xl font-black tabular-nums text-foreground tracking-tight leading-none">
          {total.toLocaleString("lo-LA")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{t("currency")}</p>
      </div>
    </div>
  );
}

// ─── PaymentPanel Root ────────────────────────────────────────────────────────

export interface PaymentPanelProps {
  subtotal: number;
  total: number;
  discount: number;
  isCheckingOut: boolean;
  cartEmpty: boolean;
  onOpenPayment: () => void;
  onDirectCheckout: () => void;
  onApplyDiscount: (discountAmount: number) => void;
  onClearDiscount: () => void;
}

export function PaymentPanel({
  subtotal,
  total,
  discount,
  isCheckingOut,
  cartEmpty,
  onOpenPayment,
  onDirectCheckout,
  onApplyDiscount,
  onClearDiscount,
}: PaymentPanelProps) {
  const t = useTranslations("pos.payment.panel");
  const { tab } = useActiveTab();
  const isFx = tab?.txnType === 'ExchangeCurrency';
  const isExchangeType = isFx
    || tab?.txnType === 'ExchangeGold'
    || tab?.txnType === 'ExchangeFree'
    || tab?.txnType === 'ExchangeToMoney';
  const fxDisabled = isFx && (!tab?.fxFromAmount || tab.fxFromAmount <= 0);

  return (
    <aside className="flex flex-col w-72 lg:w-80 shrink-0 border-l bg-card overflow-y-auto">
      <StoreHeader />
      {!isExchangeType && <OrderLookup />}
      {!isExchangeType && <div className="mx-4 border-t border-dashed border-border/50" />}

      <CustomerSection />

      <div className="mx-4 border-t border-border/50" />

      {isFx ? (
        <FxBreakdown />
      ) : (
        <PaymentBreakdown
          subtotal={subtotal}
          discount={discount}
          total={total}
          onApplyDiscount={onApplyDiscount}
          onClearDiscount={onClearDiscount}
        />
      )}

      <div className="px-4 pb-4 pt-2 shrink-0">
        {isFx ? (
          <Button
            type="primary"
            block
            size="large"
            icon={<CreditCard size={16} />}
            loading={isCheckingOut}
            disabled={fxDisabled || isCheckingOut}
            onClick={onDirectCheckout}
            style={{ fontWeight: 700 }}
          >
            {isCheckingOut ? t("processing") : "LẬP KHAI & PHÁT HÀNH PHIẾU FX"}
          </Button>
        ) : (
          <Button
            type="primary"
            block
            size="large"
            icon={<CreditCard size={16} />}
            loading={isCheckingOut}
            disabled={cartEmpty || isCheckingOut}
            onClick={onOpenPayment}
            style={{ fontWeight: 700 }}
          >
            {isCheckingOut ? t("processing") : t("checkout")}
          </Button>
        )}
      </div>
    </aside>
  );
}
