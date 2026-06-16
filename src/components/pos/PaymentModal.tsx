"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "antd";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveTab } from "@/hooks/useActiveTab";
import {
  PAYMENT_METHOD_KEYS,
  type PaymentMethodKey,
} from "@/lib/strategies/payment.strategy";
import { cn } from "@/lib/utils";
import { lineTotal, type CartItem } from "@/types/cart";
import {
  ArrowDownToLine,
  Banknote,
  Building2,
  FileText,
  Layers,
  Link2,
  ShoppingBag,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function fmt(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

// ─── Nhãn loại giao dịch ─────────────────────────────────────────────────────

const TXN_META: Record<string, { label: string; color: string }> = {
  SellGold: {
    label: "Bán vàng",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  SellSilver: {
    label: "Bán bạc",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  BuyGold: {
    label: "Mua vàng",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  ExchangeGold: {
    label: "Thu đổi vàng cũ",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  ExchangeCurrency: {
    label: "Thu đổi ngoại tệ",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  BuyMoreGold: {
    label: "Mua thêm",
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  ExchangeFree: {
    label: "Đổi miễn phí",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  ExchangeToMoney: {
    label: "Đổi thành tiền",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CombinedAmounts {
  cashAmount: number;
  bankAmount: number;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethodKey;
  onPaymentMethodChange: (m: PaymentMethodKey) => void;
  onCheckout: (combined?: CombinedAmounts) => void;
  isCheckingOut: boolean;
  onApplyDiscount: (discountAmount: number) => void;
  onClearDiscount: () => void;
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

function ItemRow({ item, index, hideFees }: { item: CartItem; index: number; hideFees?: boolean }) {
  if (!item) return null;
  const gram = item.weightGramOverride ?? item.qty * item.weightGram;
  const total = lineTotal(item as Parameters<typeof lineTotal>[0]);
  const isExchange = item.itemRole === "ExchangeIn";

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-2.5 border-b last:border-0",
        isExchange && "bg-amber-50/40 dark:bg-amber-950/10",
      )}
    >
      <span className="w-5 text-[10px] text-muted-foreground/50 text-center shrink-0 pt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug">{item.name}</p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-mono">
            {item.purity}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {gram.toFixed(2)}g
          </span>
          {isExchange && (
            <span className="text-[10px] text-amber-600 font-semibold">
              ← Vàng cũ
            </span>
          )}
          {item.isDamaged && item.perItemDamage > 0 && (
            <span className="text-[10px] text-orange-500">
              PHÍ KHÒ: {item.perItemDamage.toLocaleString("lo-LA")}₭
            </span>
          )}
          {item.perItemWearChi > 0 && (
            <span className="text-[10px] text-orange-500">
              HAO HỤT: {item.perItemWearChi} Chỉ
            </span>
          )}
        </div>
      </div>
      <div className="text-center shrink-0">
        <span className="text-xs text-muted-foreground">×{item.qty}</span>
      </div>
      <div className="text-right shrink-0">
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            isExchange && "text-amber-700 dark:text-amber-400",
          )}
        >
          {fmt(total)}
        </span>
        {!hideFees && (item.laborFee > 0 || item.stoneFee > 0) && (
          <p className="text-[10px] text-muted-foreground">
            {item.laborFee > 0 && `GC +${(item.laborFee / 1000).toFixed(0)}k`}
            {item.stoneFee > 0 && ` Đá +${(item.stoneFee / 1000).toFixed(0)}k`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────

export function PaymentModal({
  open,
  onClose,
  paymentMethod,
  onPaymentMethodChange,
  onCheckout,
  isCheckingOut,
  onApplyDiscount,
  onClearDiscount,
}: PaymentModalProps) {
  const t = useTranslations("pos.payment.modal");
  const tMethods = useTranslations("pos.payment.methods");
  const { tab, total, subtotal, totalA, totalB, netTotal } = useActiveTab();

  const items = tab?.items ?? [];
  const txnType = tab?.txnType ?? "SellGold";
  const discount = tab?.discountAmount ?? 0;
  const txnMeta = TXN_META[txnType] ?? TXN_META.SellGold;

  const isBuy = txnType === "BuyGold";
  const isExchange = txnType === "ExchangeGold";
  const exchangeItems = items.filter((i) => i.itemRole === "ExchangeIn");
  const normalItems = items.filter((i) => i.itemRole === "Normal");

  // ── Giảm giá ────────────────────────────────────────────────────────────────
  const [discountInput, setDiscountInput] = useState("");
  const handleApplyDiscount = () => {
    const amount = parseInt(discountInput.replace(/\D/g, ""), 10);
    if (!isNaN(amount) && amount > 0) {
      onApplyDiscount(amount);
      setDiscountInput("");
    }
  };

  // ── COMBINED amounts ─────────────────────────────────────────────────────────
  const [cashInput, setCashInput] = useState("");
  const [bankInput, setBankInput] = useState("");

  // ── Keyboard shortcuts: 1/2/3 → payment method; auto-focus Pay on open ─────
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      document.querySelector<HTMLButtonElement>("[data-pay-action]")?.focus();
    }, 150);
    const handler = (e: KeyboardEvent) => {
      if ((e.target as Element)?.tagName === "INPUT") return;
      if (e.key === "1") { e.preventDefault(); setCashInput(""); setBankInput(""); onPaymentMethodChange("cash"); }
      else if (e.key === "2") { e.preventDefault(); setCashInput(""); setBankInput(""); onPaymentMethodChange("bank-transfer"); }
      else if (e.key === "3") { e.preventDefault(); setCashInput(""); setBankInput(""); onPaymentMethodChange("combined"); }
    };
    document.addEventListener("keydown", handler);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", handler); };
  }, [open, onPaymentMethodChange]);

  const isCombined = paymentMethod === "combined";
  const cashAmt = parseInt(cashInput.replace(/\D/g, ""), 10) || 0;
  const bankAmt = parseInt(bankInput.replace(/\D/g, ""), 10) || 0;
  const combinedSum = cashAmt + bankAmt;
  const combinedValid = isCombined
    ? combinedSum === total && cashAmt > 0 && bankAmt > 0
    : true;

  const handleCashChange = (val: string) => {
    setCashInput(val);
    const cash = parseInt(val.replace(/\D/g, ""), 10) || 0;
    const remaining = total - cash;
    if (remaining > 0) setBankInput(remaining.toString());
    else setBankInput("");
  };
  const handleBankChange = (val: string) => {
    setBankInput(val);
    const bank = parseInt(val.replace(/\D/g, ""), 10) || 0;
    const remaining = total - bank;
    if (remaining > 0) setCashInput(remaining.toString());
    else setCashInput("");
  };
  const handlePaymentMethodChange = (key: PaymentMethodKey) => {
    setCashInput("");
    setBankInput("");
    onPaymentMethodChange(key);
  };

  const handleCheckout = () => {
    isCombined
      ? onCheckout({ cashAmount: cashAmt, bankAmount: bankAmt })
      : onCheckout();
  };

  const dialogTitle = (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-base font-bold">{t("title")}</span>
        <Badge
          className={cn(
            "text-[10px] h-5 px-2 font-semibold rounded-full",
            txnMeta.color,
          )}
        >
          {txnMeta.label}
        </Badge>
      </div>
      {tab?.linkedInvoiceCode && (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-600">
          <Link2 className="h-2.5 w-2.5" />
          <span>
            Liên kết HĐ:{" "}
            <span className="font-semibold font-mono">
              {tab.linkedInvoiceCode}
            </span>
          </span>
        </div>
      )}
      {tab?.note && (
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
          <FileText className="h-2.5 w-2.5" />
          <span>{tab.note}</span>
        </div>
      )}
    </div>
  );

  const dialogFooter = (
    <>
      <Button onClick={onClose} disabled={isCheckingOut}>
        {t("cancel")}
      </Button>
      <Button
        type="primary"
        data-pay-action
        autoFocus
        onClick={handleCheckout}
        disabled={isCheckingOut || !combinedValid}
        loading={isCheckingOut}
        style={{ minWidth: 160 }}
      >
        {isCheckingOut ? t("processing") : t("pay", { amount: fmt(total) })}
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] p-0"
        title={dialogTitle}
        footer={dialogFooter}
      >
        {/* ── Body 2 cột ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* CỘT TRÁI: Danh sách hàng hoá */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r">
            {isExchange ? (
              <div className="flex-1 overflow-y-auto">
                {exchangeItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-b">
                      <ArrowDownToLine className="h-3 w-3 text-amber-600" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                        Vàng cũ đổi vào ({exchangeItems.length} mục)
                      </span>
                    </div>
                    <div className="px-4">
                      {exchangeItems.map((item, i) => (
                        <ItemRow key={item.productId} item={item} index={i} />
                      ))}
                    </div>
                  </>
                )}
                {normalItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/30 border-b border-t">
                      <ShoppingBag className="h-3 w-3 text-foreground/60" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Hàng mới bán ra ({normalItems.length} mục)
                      </span>
                    </div>
                    <div className="px-4">
                      {normalItems.map((item, i) => (
                        <ItemRow key={item.productId} item={item} index={i} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/20 border-b shrink-0">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {isBuy ? "Vàng mua vào" : "Danh sách hàng hoá"} ·{" "}
                    {items.length} mục
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4">
                  {items.map((item, i) => (
                    <ItemRow key={item.productId} item={item} index={i} hideFees={isBuy} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* CỘT PHẢI: Tóm tắt + phương thức */}
          <div className="w-96 shrink-0 flex flex-col overflow-y-auto overflow-x-hidden">
            {/* Tóm tắt tài chính */}
            <div className="px-5 pt-4 pb-3 space-y-2">
              {isExchange ? (
                <>
                  <Row label="Tổng hàng mới (A)" value={fmt(totalA)} />
                  <Row
                    label="Vàng cũ cấn trừ (B)"
                    value={`-${fmt(totalB)}`}
                    className="text-amber-700 dark:text-amber-400"
                  />
                  {discount > 0 && (
                    <Row
                      label="Giảm giá"
                      value={`-${fmt(discount)}`}
                      className="text-destructive"
                    />
                  )}
                </>
              ) : (
                <>
                  <Row label={t("subtotal")} value={fmt(subtotal)} />
                  {discount > 0 && (
                    <Row
                      label={t("discount")}
                      value={`-${fmt(discount)}`}
                      className="text-destructive"
                    />
                  )}
                </>
              )}
            </div>

            {/* Tổng cộng nổi bật */}
            <div
              className={cn(
                "mx-5 mb-4 rounded-xl px-4 py-4 text-center",
                isBuy ? "bg-blue-50 dark:bg-blue-950/30" : "bg-primary/5",
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                {isBuy
                  ? "Tiệm phải chi"
                  : isExchange && netTotal < 0
                    ? "Tiệm trả lại"
                    : "Tiền thực thu"}
              </p>
              <p
                className={cn(
                  "text-3xl font-black tabular-nums tracking-tight mt-1",
                  isBuy || (isExchange && netTotal < 0)
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-foreground",
                )}
              >
                {total.toLocaleString("lo-LA")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ₭ (Kip Lào)
              </p>
            </div>

            {/* Giảm giá */}
            {!isExchange && (
              <div className="px-5 pb-4 border-b">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("discountLabel")}
                </Label>
                <div className="mt-2">
                  {discount > 0 ? (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-secondary text-sm">
                      <span className="font-semibold tabular-nums text-destructive">
                        -{fmt(discount)}
                      </span>
                      <button
                        onClick={onClearDiscount}
                        className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                      >
                        {t("clearDiscount")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("discountPlaceholder")}
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleApplyDiscount()
                        }
                        type="number"
                        min={0}
                        className="h-10 text-sm"
                      />
                      <Button
                        onClick={handleApplyDiscount}
                        disabled={!discountInput.trim()}
                        size="small"
                        className="h-10 px-3 text-sm shrink-0"
                      >
                        {t("applyDiscount")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phương thức thanh toán */}
            <div className="px-5 py-4 space-y-3">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("paymentMethod")}
              </Label>
              <div className="flex flex-col gap-2">
                {PAYMENT_METHOD_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handlePaymentMethodChange(key)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors text-left",
                      paymentMethod === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent text-foreground",
                    )}
                  >
                    {key === "cash" && <Banknote className="h-4 w-4 shrink-0" />}
                    {key === "bank-transfer" && <Building2 className="h-4 w-4 shrink-0" />}
                    {key === "combined" && <Layers className="h-4 w-4 shrink-0" />}
                    {tMethods(key)}
                  </button>
                ))}
              </div>

              {/* COMBINED inputs */}
              {isCombined && (
                <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                  {/* Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tổng:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {fmt(total)}
                      </span>
                    </span>
                    {combinedSum > 0 &&
                      (combinedSum === total ? (
                        <span className="text-green-600 font-semibold">
                          ✓ Khớp
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "font-semibold",
                            combinedSum > total
                              ? "text-destructive"
                              : "text-amber-600",
                          )}
                        >
                          {combinedSum > total
                            ? `Dư +${fmt(combinedSum - total)}`
                            : `Còn -${fmt(total - combinedSum)}`}
                        </span>
                      ))}
                  </div>

                  {/* Tiền mặt */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5" />
                      Tiền mặt
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={cashInput}
                      onChange={(e) => handleCashChange(e.target.value)}
                      className={cn(
                        "h-12 text-lg tabular-nums font-semibold",
                        cashAmt > 0 && combinedSum === total && "border-green-500 ring-1 ring-green-500/20",
                        cashAmt > 0 && combinedSum !== total && "border-amber-400",
                      )}
                    />
                  </div>

                  {/* Chuyển khoản */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Chuyển khoản
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={bankInput}
                      onChange={(e) => handleBankChange(e.target.value)}
                      className={cn(
                        "h-12 text-lg tabular-nums font-semibold",
                        bankAmt > 0 && combinedSum === total && "border-green-500 ring-1 ring-green-500/20",
                        bankAmt > 0 && combinedSum !== total && "border-amber-400",
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold tabular-nums", className)}>
        {value}
      </span>
    </div>
  );
}
