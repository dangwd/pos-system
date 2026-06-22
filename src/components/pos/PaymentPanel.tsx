/**
 * PaymentPanel — Panel thanh toán bên phải màn hình POS
 *
 * Sau khi bỏ PaymentModal, panel này tích hợp luôn:
 *  1. StoreHeader       — tên cửa hàng / chi nhánh
 *  2. OrderLookup       — tra cứu hóa đơn cũ (F6)
 *  3. CustomerSection   — gắn khách hàng (F4)
 *  4. ItemsSection      — danh sách hàng hoá (từ modal cũ)
 *  5. PaymentBreakdown  — chi tiết tài chính
 *  6. PaymentMethodSection — chọn PTTT + nhập COMBINED
 *  7. CheckoutBar       — nút thanh toán / hủy HĐ
 */

"use client";

import { CustomerCreateDialog } from "@/components/admin/customers/CustomerCreateDialog";
import { ExchangeInvoiceLookup } from "@/components/pos/ExchangeInvoiceLookup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { useActiveTab } from "@/hooks/useActiveTab";
import { useAuthStore } from "@/stores/auth.store";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactionLookup, useCancelTransaction } from "@/hooks/useTransactions";
import {
  PAYMENT_METHOD_KEYS,
  type PaymentMethodKey,
} from "@/lib/strategies/payment.strategy";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/customer";
import { Button } from "antd";
import { InputNumber } from "@/components/ui/antd-number-input";
import {
  AppstoreOutlined,
  BankOutlined,
  WalletOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  ScanOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
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
  const { user } = useAuthStore();
  return (
    <div className="px-4 py-2.5 bg-primary/8 border-b border-primary/12 shrink-0">
      <p className="text-[11px] font-bold tracking-widest text-primary uppercase text-center leading-snug">
        {t("storeName")}
      </p>
      <p className="text-[10px] mt-0.5 text-muted-foreground tracking-wide text-center">
        {user?.branchName ?? t("storeAddress")}
        {user?.counterName && (
          <span className="ml-2 text-primary/70">· {user.counterName}</span>
        )}
      </p>
    </div>
  );
}

// ─── 2. OrderLookup ───────────────────────────────────────────────────────────

function OrderLookup() {
  const t = useTranslations("pos.payment.panel");
  const toast = useToast();
  const { tab, enterCancelMode, exitCancelMode } = useActiveTab();
  const { result, cancelItems, isSearching, notFound, search, clear: clearSearch } = useTransactionLookup();
  const [code, setCode] = useState("");

  useEffect(() => {
    clearSearch();
    setCode("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.id]);

  const wasCancelMode = useRef(false);
  useEffect(() => {
    if (tab?.cancelTransactionId) {
      wasCancelMode.current = true;
    } else if (wasCancelMode.current) {
      wasCancelMode.current = false;
      clearSearch();
      setCode("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.cancelTransactionId]);

  useEffect(() => {
    if (!result) return;
    enterCancelMode(
      result.id,
      result.invoiceCode,
      cancelItems,
      result.customer?.id ?? null,
      result.customer?.name ?? null,
      result.customer?.phoneNumber ?? null,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

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

  const handleClear = () => { clearSearch(); exitCancelMode(); setCode(""); };
  const isCancelledStatus = result?.status === "Cancelled";
  const cancelInvoiceCode = tab?.cancelInvoiceCode;

  return (
    <div className="px-4 py-3 shrink-0">
      <SectionLabel>{t("lookupLabel")}</SectionLabel>

      {!result && !cancelInvoiceCode && (
        <>
          <div className="flex gap-1.5">
            <Input
              id="pos-order-lookup"
              placeholder={t("lookupPlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").trim();
                if (pasted) {
                  e.preventDefault();
                  setCode(pasted);
                  search(pasted).then(found => {
                    if (found) toast.success(t("lookupFound", { code: pasted }));
                    else toast.error(t("lookupNotFound", { code: pasted }));
                  });
                }
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) { e.preventDefault(); search(code.trim()); } }}
              className="h-8 text-xs flex-1"
            />
            <button
              onClick={() => code.trim() && search(code.trim())}
              disabled={isSearching || !code.trim()}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isSearching
                ? <LoadingOutlined className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                : <ScanOutlined className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
          {notFound && (
            <p className="mt-1.5 text-[10px] text-destructive flex items-center gap-1">
              <ExclamationCircleOutlined className="h-3 w-3" /> {t("lookupNotFoundAlert")}
            </p>
          )}
        </>
      )}

      {!result && cancelInvoiceCode && (
        <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          <CloseCircleOutlined className="h-3.5 w-3.5 text-destructive shrink-0" />
          <span className="flex-1 text-xs font-mono truncate text-destructive">{cancelInvoiceCode}</span>
          <button onClick={handleClear} className="shrink-0 p-1 rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors">
            <CloseOutlined className="h-3 w-3" />
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-md border bg-muted/40 text-[11px] overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b bg-muted/60">
            <span className="flex-1 font-mono font-bold text-xs truncate">{result.invoiceCode}</span>
            <span className={cn("shrink-0 text-[10px] font-semibold px-1 py-0.5 rounded",
              isCancelledStatus
                ? "bg-destructive/10 text-destructive"
                : "bg-green-100/80 dark:bg-green-950/40 text-green-700 dark:text-green-400")}>
              {isCancelledStatus ? t("lookupResultCancelled") : t("lookupResultCompleted")}
            </span>
            <button onClick={handleClear} className="shrink-0 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
              <CloseOutlined className="h-3 w-3" />
            </button>
          </div>
          <div className="px-2.5 py-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("lookupResultDate")}</span>
              <span className="tabular-nums">{new Date(result.transactedAt).toLocaleDateString("lo-LA")}</span>
            </div>
            {result.customer && (
              <>
                <div className="flex gap-2 justify-between">
                  <span className="text-muted-foreground shrink-0">{t("lookupResultCustomer")}</span>
                  <span className="font-medium truncate">{result.customer.name}</span>
                </div>
                {result.customer.phoneNumber && (
                  <div className="flex gap-2 justify-between">
                    <span className="text-muted-foreground shrink-0">{t("lookupResultPhone")}</span>
                    <span className="font-mono truncate">{result.customer.phoneNumber}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("lookupResultTotal")}</span>
              <span className="font-bold tabular-nums text-primary">{result.totalAmount.toLocaleString("lo-LA")} ₭</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. CustomerSection ───────────────────────────────────────────────────────

function CustomerSection({ showError }: { showError: boolean }) {
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F4") { e.preventDefault(); document.getElementById("pos-customer-search")?.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (customer: Customer) => {
    setCustomer(customer.id, customer.name, customer.phoneNumber);
    setQuery(""); setDebouncedQuery(""); setFocusedIndex(-1); setOpen(false);
  };

  return (
    <div className="px-4 py-3 shrink-0">
      <SectionLabel>
        <span>{t("customerLabel")} <span className="text-destructive">*</span></span>
      </SectionLabel>

      {tab?.customerName ? (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserOutlined className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{tab.customerName}</p>
            {tab.customerPhone && (
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{tab.customerPhone}</p>
            )}
          </div>
          {!tab.cancelTransactionId && (
            <button onClick={clearCustomer} className="shrink-0 p-1 rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors">
              <CloseOutlined className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0">
              <Input
                id="pos-customer-search"
                placeholder={t("customerSearch")}
                prefix={<SearchOutlined className="h-3 w-3 text-muted-foreground" />}
                suffix={isFetching ? <LoadingOutlined className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setFocusedIndex(-1); setOpen(!!e.target.value); }}
                onFocus={() => query && setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setQuery(""); setFocusedIndex(-1); }
                  if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex((p) => Math.min(p + 1, customers.length - 1)); if (!open && customers.length) setOpen(true); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex((p) => Math.max(p - 1, -1)); }
                  if (e.key === "Enter") { const target = focusedIndex >= 0 ? customers[focusedIndex] : customers[0]; if (target) handleSelect(target); }
                }}
                status={showError ? "error" : undefined}
                className="h-8 text-xs"
              />
            </div>
            <button onClick={() => setCreateOpen(true)} title={t("createCustomer")}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border bg-muted hover:bg-accent transition-colors">
              <PlusOutlined className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          {showError && (
            <p className="mt-1 text-[10px] text-destructive">
              {t("customerRequired")}
            </p>
          )}
          {open && (customers.length > 0 || (debouncedQuery && !isFetching)) && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
              {customers.length > 0 ? customers.map((c, i) => (
                <button key={c.id} type="button" onClick={() => handleSelect(c)}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0",
                    focusedIndex === i && "bg-accent text-accent-foreground")}>
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserOutlined className="h-3 w-3 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {c.phoneNumber}{c.loyaltyTier ? ` · ${c.loyaltyTier}` : ""}
                    </p>
                  </div>
                </button>
              )) : (
                <div className="px-3 py-5 text-center text-xs text-muted-foreground">{t("customerNotFound")}</div>
              )}
            </div>
          )}
        </div>
      )}

      <CustomerCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

// ─── 5. FxBreakdown ──────────────────────────────────────────────────────────

function FxBreakdown() {
  const t = useTranslations("pos.payment.panel");
  const { tab } = useActiveTab();
  const lines = tab?.fxLines ?? [];

  // Gom tổng theo toCurrency
  const totalsPerCurrency = lines.reduce<Record<string, number>>((acc, l) => {
    const lakEquiv = Math.round(l.fromAmount * l.fromRateToLak);
    const toAmt = l.toRateToLak > 0 ? Math.round((lakEquiv / l.toRateToLak) * 10000) / 10000 : 0;
    if (toAmt > 0) acc[l.toCurrency] = (acc[l.toCurrency] ?? 0) + toAmt;
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsPerCurrency);
  const hasAnyTotal = totalEntries.length > 0;

  return (
    <div className="px-4 py-3 flex flex-col gap-3 shrink-0">
      {/* Per-line summary */}
      {lines.length > 0 && (
        <div className="space-y-1.5">
          {lines.map((l, idx) => {
            const lakEquiv = Math.round(l.fromAmount * l.fromRateToLak);
            const toAmt =
              l.toRateToLak > 0
                ? Math.round((lakEquiv / l.toRateToLak) * 10000) / 10000
                : 0;
            const toFmt =
              toAmt > 0
                ? l.toCurrency === "LAK"
                  ? Math.round(toAmt).toLocaleString("lo-LA")
                  : toAmt.toLocaleString("en", { maximumFractionDigits: 4 })
                : "—";
            return (
              <div key={l.id} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {idx + 1}.{" "}
                  {l.fromAmount > 0
                    ? l.fromAmount.toLocaleString("en", { maximumFractionDigits: 2 })
                    : "—"}{" "}
                  {l.fromCurrency}
                  <span className="text-muted-foreground/50 mx-1">
                    @ {l.fromRateToLak > 0 ? l.fromRateToLak.toLocaleString("en") : "—"}
                  </span>
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {toFmt} {l.toCurrency === "LAK" ? "₭" : l.toCurrency}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border" />

      {/* Total — grouped by toCurrency */}
      <div className={cn(
        "rounded-lg border overflow-hidden",
        hasAnyTotal ? "border-primary/20" : "border-border",
      )}>
        <div className={cn(
          "px-4 py-2 border-b text-center",
          hasAnyTotal ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border",
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            {t("fxCustomerReceives")}
          </p>
        </div>
        {hasAnyTotal ? (
          <div className="divide-y divide-border/50">
            {totalEntries.map(([currency, amount]) => {
              const formatted =
                currency === "LAK"
                  ? Math.round(amount).toLocaleString("lo-LA")
                  : amount.toLocaleString("en", { maximumFractionDigits: 4 });
              return (
                <div key={currency} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {currency === "LAK" ? "LAK (₭ Kip)" : currency}
                  </span>
                  <span className="text-lg font-black tabular-nums tracking-tight text-foreground">
                    {formatted}{" "}
                    <span className="text-xs font-semibold">
                      {currency === "LAK" ? "₭" : currency}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black tabular-nums text-muted-foreground/30">—</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        {t("fxNote")}
      </p>
    </div>
  );
}

// ─── 6b. PaymentBreakdown ────────────────────────────────────────────────────

function PaymentBreakdown({
  onApplyDiscount,
  onClearDiscount,
}: {
  onApplyDiscount: (amount: number) => void;
  onClearDiscount: () => void;
}) {
  const t = useTranslations("pos.payment.panel");
  const { tab, total, subtotal, totalA, totalB, netTotal } = useActiveTab();
  const txnType = tab?.txnType ?? "SellGold";
  const discount = tab?.discountAmount ?? 0;
  const isExchange = txnType === "ExchangeGold" || txnType === "ExchangeFree" || txnType === "ExchangeToMoney";
  const isBuy = txnType === "BuyGold" || txnType === "BuySilver";
  const totalLaborFee = (tab?.items ?? []).reduce((s, i) => s + (i.laborFee ?? 0), 0);
  const totalStoneFee = (tab?.items ?? []).reduce((s, i) => s + (i.stoneFee ?? 0), 0);
  const [discountInput, setDiscountInput] = useState("");

  const handleApply = () => {
    const amount = parseInt(discountInput.replace(/\D/g, ""), 10);
    if (!isNaN(amount) && amount > 0) { onApplyDiscount(amount); setDiscountInput(""); }
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-3 shrink-0">
      {/* Rows */}
      <div className="space-y-2">
        {isExchange ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{t("exchangeTotalNew")}</span>
              <span className="text-xs font-medium tabular-nums">{fmt(totalA)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{t("exchangeTotalOld")}</span>
              <span className="text-xs font-medium tabular-nums text-amber-700 dark:text-amber-400">-{fmt(totalB)}</span>
            </div>
          </>
        ) : isBuy ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{t("buyBuyPrice")}</span>
              <span className="text-xs font-medium tabular-nums">{fmt(subtotal)}</span>
            </div>
            {(() => {
              const items = tab?.items ?? [];
              const totalDamage = items
                .filter((i) => i.itemRole === "Normal")
                .reduce((s, i) => s + i.perItemDamage, 0);
              const totalWearLak = items
                .filter((i) => i.itemRole === "Normal")
                .reduce(
                  (s, i) =>
                    s + Math.round(i.perItemWearChi * (i.wearUnitGram || 3.75) * i.unitPriceLakPerGram),
                  0,
                );
              return (
                <>
                  {totalDamage > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-orange-600 dark:text-orange-400">{t("buyDamageFee")}</span>
                      <span className="text-xs font-medium tabular-nums text-orange-600 dark:text-orange-400">-{fmt(totalDamage)}</span>
                    </div>
                  )}
                  {totalWearLak > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-orange-600 dark:text-orange-400">{t("buyWearFee")}</span>
                      <span className="text-xs font-medium tabular-nums text-orange-600 dark:text-orange-400">-{fmt(totalWearLak)}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{t("subtotalLabel")}</span>
            <span className="text-xs font-medium tabular-nums">{fmt(subtotal)}</span>
          </div>
        )}
        {totalLaborFee > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{t("laborFeeLabel")}</span>
            <span className="text-xs font-medium tabular-nums">+{fmt(totalLaborFee)}</span>
          </div>
        )}
        {totalStoneFee > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{t("stoneFeeLabel")}</span>
            <span className="text-xs font-medium tabular-nums">+{fmt(totalStoneFee)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{t("discountLabel")}</span>
            <span className="text-xs font-medium tabular-nums text-destructive">-{fmt(discount)}</span>
          </div>
        )}
      </div>

      {/* Discount input */}
      {!isExchange && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">{t("discountLabel")}</p>
          {discount > 0 ? (
            <div className="flex items-center justify-between bg-secondary rounded-md px-3 py-2 border border-border">
              <span className="text-xs font-semibold tabular-nums text-destructive">-{fmt(discount)}</span>
              <button onClick={onClearDiscount} className="text-muted-foreground hover:text-destructive transition-colors">
                <CloseOutlined className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <InputNumber
                placeholder={t("discountInput")}
                value={discountInput ? Number(discountInput) : null}
                onChange={(v) => setDiscountInput(String(v ?? ''))}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                size="small"
                style={{ width: '100%' }}
                min={0}
              />
              <Button size="small" onClick={handleApply} disabled={!discountInput.trim()} className="h-8 text-xs px-3 shrink-0">
                {t("applyDiscount")}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border" />

      {/* Total box */}
      {(() => {
        const storePays = isBuy || (isExchange && netTotal < 0);
        const balanced = isExchange && netTotal === 0;
        const totalLabel = isBuy
          ? t("buyStorePays")
          : isExchange
            ? netTotal > 0
              ? t("exchangeCustomerPays")
              : netTotal < 0
                ? t("exchangeStorePays")
                : t("exchangeBreakEven")
            : t("totalDue");
        return (
          <div className={cn(
            "rounded-lg border px-4 py-3 text-center",
            storePays
              ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"
              : balanced
                ? "border-border bg-muted/30"
                : "border-primary/20 bg-primary/5",
          )}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
              {totalLabel}
            </p>
            <p className={cn(
              "text-3xl font-black tabular-nums tracking-tight leading-none",
              storePays
                ? "text-blue-600 dark:text-blue-400"
                : balanced
                  ? "text-muted-foreground"
                  : "text-foreground",
            )}>
              {Math.abs(total).toLocaleString("lo-LA")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("currency")}</p>
          </div>
        );
      })()}
    </div>
  );
}

// ─── 7. PaymentMethodSection ─────────────────────────────────────────────────

interface PaymentMethodSectionProps {
  paymentMethod: PaymentMethodKey;
  onPaymentMethodChange: (m: PaymentMethodKey) => void;
  total: number;
  cashInput: string;
  bankInput: string;
  onCashChange: (v: string) => void;
  onBankChange: (v: string) => void;
}

function PaymentMethodSection({
  paymentMethod,
  onPaymentMethodChange,
  total,
  cashInput,
  bankInput,
  onCashChange,
  onBankChange,
}: PaymentMethodSectionProps) {
  const tMethods = useTranslations("pos.payment.methods");
  const tModal = useTranslations("pos.payment.modal");
  const tPanel = useTranslations("pos.payment.panel");
  const isCombined = paymentMethod === "combined";
  const cashAmt = parseInt(cashInput.replace(/\D/g, ""), 10) || 0;
  const bankAmt = parseInt(bankInput.replace(/\D/g, ""), 10) || 0;
  const combinedSum = cashAmt + bankAmt;

  return (
    <div className="px-4 py-3 flex flex-col gap-2.5 shrink-0">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {tModal("paymentMethod")}
      </Label>

      <div className="grid grid-cols-3 gap-1.5">
        {PAYMENT_METHOD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => { onPaymentMethodChange(key); }}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-semibold transition-colors",
              paymentMethod === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent text-foreground",
            )}
          >
            {key === "cash" && <WalletOutlined className="h-4 w-4 shrink-0" />}
            {key === "bank-transfer" && <BankOutlined className="h-4 w-4 shrink-0" />}
            {key === "combined" && <AppstoreOutlined className="h-4 w-4 shrink-0" />}
            <span className="text-center leading-tight">{tMethods(key)}</span>
          </button>
        ))}
      </div>

      {isCombined && (
        <div className="rounded-lg border p-3 space-y-2.5 bg-muted/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {tPanel("combinedTotal")} <span className="font-semibold text-foreground tabular-nums">{fmt(total)}</span>
            </span>
            {combinedSum > 0 && (
              combinedSum === total
                ? <span className="text-green-600 font-semibold">{tPanel("combinedMatch")}</span>
                : <span className={cn("font-semibold", combinedSum > total ? "text-destructive" : "text-amber-600")}>
                    {combinedSum > total
                      ? tPanel("combinedOver", { amount: fmt(combinedSum - total) })
                      : tPanel("combinedShort", { amount: fmt(total - combinedSum) })}
                  </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <WalletOutlined className="h-3 w-3" /> {tMethods("cash")}
              </Label>
              <InputNumber
                min={0} placeholder="0" value={cashInput ? Number(cashInput) : null}
                onChange={(v) => onCashChange(String(v ?? ''))}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <BankOutlined className="h-3 w-3" /> {tMethods("bank-transfer")}
              </Label>
              <InputNumber
                min={0} placeholder="0" value={bankInput ? Number(bankInput) : null}
                onChange={(v) => onBankChange(String(v ?? ''))}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PaymentPanel Root ────────────────────────────────────────────────────────

export interface PaymentPanelProps {
  isCheckingOut: boolean;
  paymentMethod: PaymentMethodKey;
  onPaymentMethodChange: (m: PaymentMethodKey) => void;
  onCheckout: (combined?: { cashAmount: number; bankAmount: number }) => void;
  onDirectCheckout: () => void;
  onApplyDiscount: (discountAmount: number) => void;
  onClearDiscount: () => void;
}

export function PaymentPanel({
  isCheckingOut,
  paymentMethod,
  onPaymentMethodChange,
  onCheckout,
  onDirectCheckout,
  onApplyDiscount,
  onClearDiscount,
}: PaymentPanelProps) {
  const t = useTranslations("pos.payment.panel");
  const { tab, total, exitCancelMode } = useActiveTab();
  const toast = useToast();
  const { mutate: cancelTxn, isPending: isCancelling } = useCancelTransaction();

  const [cashInput, setCashInput] = useState("");
  const [bankInput, setBankInput] = useState("");
  const [customerError, setCustomerError] = useState(false);
  const [linkedError, setLinkedError] = useState(false);

  const isFx = tab?.txnType === "ExchangeCurrency";
  const isExchangeGold = tab?.txnType === "ExchangeGold"
    || tab?.txnType === "ExchangeFree"
    || tab?.txnType === "ExchangeToMoney";
  const isBuyGold = tab?.txnType === "BuyGold" || tab?.txnType === "BuySilver";
  const isExchangeType = isFx || isExchangeGold;
  const isCancelMode = !!tab?.cancelTransactionId;
  const fxDisabled =
    isFx &&
    ((tab?.fxLines ?? []).length === 0 ||
      (tab?.fxLines ?? []).every((l) => l.fromAmount <= 0));

  const isCombined = paymentMethod === "combined";
  const cashAmt = parseInt(cashInput.replace(/\D/g, ""), 10) || 0;
  const bankAmt = parseInt(bankInput.replace(/\D/g, ""), 10) || 0;
  const combinedValid = isCombined ? (cashAmt + bankAmt === total && cashAmt > 0 && bankAmt > 0) : true;

  // Reset khi đổi tab hoặc khi khách hàng được chọn
  useEffect(() => { setCashInput(""); setBankInput(""); setCustomerError(false); setLinkedError(false); }, [tab?.id]);
  const hasManualExchangeIn = (tab?.items ?? []).some(
    (i) => i.itemRole === "ExchangeIn" && !i.isReadOnly,
  );

  useEffect(() => { if (tab?.customerId) setCustomerError(false); }, [tab?.customerId]);
  useEffect(() => {
    if (tab?.linkedInvoiceCode || hasManualExchangeIn) setLinkedError(false);
  }, [tab?.linkedInvoiceCode, hasManualExchangeIn]);
  // Reset payment inputs sau khi checkout (clearActiveCart → items về 0, cùng tab)
  useEffect(() => { if (!tab?.items.length) { setCashInput(""); setBankInput(""); } }, [tab?.items.length]);

  // Auto-fill bank khi nhập tiền mặt, và ngược lại
  const handleCashChange = (val: string) => {
    setCashInput(val);
    const cash = parseInt(val.replace(/\D/g, ""), 10) || 0;
    const remaining = total - cash;
    setBankInput(remaining > 0 ? remaining.toString() : "");
  };
  const handleBankChange = (val: string) => {
    setBankInput(val);
    const bank = parseInt(val.replace(/\D/g, ""), 10) || 0;
    const remaining = total - bank;
    setCashInput(remaining > 0 ? remaining.toString() : "");
  };

  // Keyboard: 1/2/3 → phương thức thanh toán
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as Element)?.tagName === "INPUT") return;
      if (e.key === "1") { setCashInput(""); setBankInput(""); onPaymentMethodChange("cash"); }
      else if (e.key === "2") { setCashInput(""); setBankInput(""); onPaymentMethodChange("bank-transfer"); }
      else if (e.key === "3") { setCashInput(""); setBankInput(""); onPaymentMethodChange("combined"); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onPaymentMethodChange]);

  const handleCancelInvoice = () => {
    if (!tab?.cancelTransactionId) return;
    cancelTxn(
      { id: tab.cancelTransactionId },
      {
        onSuccess: () => {
          exitCancelMode();
          toast.success(t("cancelSuccess"));
        },
      },
    );
  };

  const requireCustomer = () => {
    if (!tab?.customerId) {
      setCustomerError(true);
      document.getElementById("pos-customer-search")?.focus();
      return false;
    }
    return true;
  };

  const requireLinkedInvoice = () => {
    if (!isExchangeGold) return true;
    if (tab?.linkedInvoiceCode || hasManualExchangeIn) return true;
    setLinkedError(true);
    document.getElementById("pos-exchange-lookup")?.focus();
    return false;
  };

  const handleCheckout = () => {
    if (!requireLinkedInvoice()) return;
    if (!requireCustomer()) return;
    isCombined
      ? onCheckout({ cashAmount: cashAmt, bankAmount: bankAmt })
      : onCheckout();
  };

  const handleDirectCheckout = () => {
    if (!requireLinkedInvoice()) return;
    if (!requireCustomer()) return;
    onDirectCheckout();
  };

  return (
    <aside className="flex flex-col h-full w-full bg-card border-l overflow-hidden">
      <StoreHeader />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {isExchangeGold && (
          <>
            <ExchangeInvoiceLookup showError={linkedError} />
            <div className="mx-4 border-t border-border/50" />
          </>
        )}

        {!isExchangeType && !isBuyGold && (
          <>
            <OrderLookup />
            <div className="mx-4 border-t border-dashed border-border/50" />
          </>
        )}

        <CustomerSection showError={customerError} />

        <div className="mx-4 border-t border-border/50" />

        {isFx ? (
          <FxBreakdown />
        ) : (
          <PaymentBreakdown
            onApplyDiscount={onApplyDiscount}
            onClearDiscount={onClearDiscount}
          />
        )}

        {!isFx && !isCancelMode && (
          <>
            <div className="mx-4 border-t border-border/50" />
            <PaymentMethodSection
              paymentMethod={paymentMethod}
              onPaymentMethodChange={onPaymentMethodChange}
              total={total}
              cashInput={cashInput}
              bankInput={bankInput}
              onCashChange={handleCashChange}
              onBankChange={handleBankChange}
            />
          </>
        )}
      </div>

      {/* Fixed checkout bar */}
      <div className="px-4 py-3 shrink-0 border-t bg-card">
        {isCancelMode ? (
          <Button
            danger type="primary" block size="large"
            icon={<CloseCircleOutlined style={{ fontSize: 16 }} />}
            loading={isCancelling} disabled={isCancelling}
            onClick={handleCancelInvoice}
            style={{ fontWeight: 700 }}
          >
            {isCancelling ? t("cancelling") : t("cancelInvoice")}
          </Button>
        ) : isFx ? (
          <Button
            type="primary" block size="large"
            icon={<CreditCardOutlined style={{ fontSize: 16 }} />}
            loading={isCheckingOut} disabled={fxDisabled || isCheckingOut}
            onClick={handleDirectCheckout}
            style={{ fontWeight: 700 }}
          >
            {isCheckingOut ? t("processing") : t("fxCheckout")}
          </Button>
        ) : (
          <Button
            type="primary" block size="large"
            icon={<CreditCardOutlined style={{ fontSize: 16 }} />}
            loading={isCheckingOut}
            disabled={isCheckingOut || !combinedValid || (tab?.items?.length ?? 0) === 0}
            onClick={handleCheckout}
            style={{ fontWeight: 700 }}
          >
            {isCheckingOut ? t("processing") : t("checkout")}
          </Button>
        )}
      </div>
    </aside>
  );
}
