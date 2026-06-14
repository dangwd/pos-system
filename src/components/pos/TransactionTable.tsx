/**
 * TransactionTable — Bảng giao dịch chính (khu vực trái màn hình POS)
 *
 * Layout thay đổi theo txnType:
 *  SellGold / SellSilver / ExchangeCurrency → bảng đơn chuẩn
 *  BuyGold                                  → bảng đơn, label "TIỆM CHI RA"
 *  ExchangeGold                             → 2 panel dọc (vàng cũ / hàng mới)
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/number-input";
import { useActiveTab } from "@/hooks/useActiveTab";
import { useConfigPrices, useWeightUnits } from "@/hooks/useConfig";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types/cart";
import { lineTotal } from "@/types/cart";
import type { PriceConfig, WeightUnit } from "@/types/config";
import { Select } from "antd";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  Coins,
  Equal,
  Gem,
  Minus,
  Package,
  PackagePlus,
  Plus,
  ShoppingCart,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { CurrencyExchangeForm } from "./CurrencyExchangeForm";

function fmt(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

// ─── UnitSelect — thẻ chọn đơn vị tính trong dòng sản phẩm ──────────────────

function UnitSelect({
  item,
  priceConfig,
  weightUnits,
  isBuyMode,
  onUpdate,
  disabled,
}: {
  item: CartItem;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
  isBuyMode?: boolean;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  disabled?: boolean;
}) {
  // Options = tất cả đơn vị từ /api/config/weight-units
  const options = weightUnits.map((u) => ({ value: u.id, label: u.tenDonVi }));

  if (options.length === 0) {
    return item.weightUnitName ? (
      <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground">
        {item.weightUnitName}
      </span>
    ) : null;
  }

  return (
    <Select
      size="small"
      value={item.weightUnitId ?? undefined}
      options={options}
      disabled={disabled}
      popupMatchSelectWidth={false}
      variant="filled"
      style={{ minWidth: 68 }}
      onChange={(value: string) => {
        const wu = weightUnits.find((u) => u.id === value);
        if (!wu) return;

        // Ưu tiên giá configured từ priceConfig (nếu có cho purity + unit mới)
        const priceItem = priceConfig?.items.find(
          (p) => p.weightUnitId === value && p.purityCode === item.purity,
        );
        const unitPriceLakPerGram = priceItem
          ? (isBuyMode ? priceItem.buyPrice : priceItem.sellPrice) /
            wu.gramPerUnit
          : item.unitPriceLakPerGram; // Fallback: giữ giá/gram, quy đổi toán học

        onUpdate(item.productId, {
          weightUnitId: value,
          weightUnitName: wu.tenDonVi,
          weightGram: wu.gramPerUnit,
          unitPriceLakPerGram,
        });
      }}
    />
  );
}

// ─── TxnTypeBadge config ─────────────────────────────────────────────────────

const TXN_META: Record<
  string,
  { Icon: React.ElementType; cls: string; bg: string }
> = {
  SellGold: {
    Icon: Coins,
    cls: "text-green-700 dark:text-green-400",
    bg: "bg-green-100/70 dark:bg-green-950/40",
  },
  SellSilver: {
    Icon: Gem,
    cls: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-100/70 dark:bg-teal-950/40",
  },
  BuyGold: {
    Icon: PackagePlus,
    cls: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100/70 dark:bg-blue-950/40",
  },
  BuyMoreGold: {
    Icon: PackagePlus,
    cls: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100/70 dark:bg-blue-950/40",
  },
  ExchangeGold: {
    Icon: ArrowLeftRight,
    cls: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
  },
  ExchangeFree: {
    Icon: ArrowLeftRight,
    cls: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
  },
  ExchangeToMoney: {
    Icon: Banknote,
    cls: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-100/70 dark:bg-indigo-950/40",
  },
  ExchangeCurrency: {
    Icon: Banknote,
    cls: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-100/70 dark:bg-violet-950/40",
  },
};

// ─── InfoBar ──────────────────────────────────────────────────────────────────

function InfoBar({
  label,
  status,
  txnType,
  customerName,
  note,
  counterName,
}: {
  label: string;
  status: string;
  txnType: string;
  customerName: string | null;
  note: string;
  counterName?: string | null;
}) {
  const t = useTranslations("pos.transactionTable");
  const tTxn = useTranslations("pos.txnTypes");
  const meta = TXN_META[txnType];
  const dotCls =
    status === "holding"
      ? "bg-muted-foreground/60"
      : status === "paying"
        ? "bg-primary animate-pulse"
        : "bg-primary/40";
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotCls)} />
        <span className="text-sm font-bold uppercase tracking-wide truncate">
          {label}
        </span>

        {/* Loại nghiệp vụ — badge có màu riêng theo loại */}
        {meta && (
          <span
            className={cn(
              "flex items-center gap-1 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded",
              meta.cls,
              meta.bg,
            )}
          >
            <meta.Icon className="h-2.5 w-2.5" />
            {tTxn(`${txnType}.short`)}
          </span>
        )}

        <Badge
          variant={status === "paying" ? "default" : "secondary"}
          className="text-[10px] h-4 px-1.5 font-normal"
        >
          {t(`status.${status}`)}
        </Badge>
        {note && (
          <span className="text-xs text-muted-foreground truncate hidden md:block">
            · {note}
          </span>
        )}
        {customerName && (
          <Badge
            variant="outline"
            className="text-[10px] h-4 px-1.5 font-normal"
          >
            {customerName}
          </Badge>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground ml-4 hidden md:block font-mono uppercase tracking-widest">
        {counterName ?? t("counter")}
      </span>
    </div>
  );
}

// ─── QtyControl ───────────────────────────────────────────────────────────────

function QtyControl({
  qty,
  onDecrease,
  onIncrease,
  onSetQty,
  disabled,
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onSetQty?: (qty: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center">
      <button
        onClick={onDecrease}
        disabled={disabled || qty <= 1}
        className="h-6 w-6 flex items-center justify-center rounded-l-sm border border-r-0 bg-muted hover:bg-accent disabled:opacity-40 transition-colors"
      >
        <Minus className="h-2.5 w-2.5" />
      </button>
      <input
        key={qty}
        type="number"
        min={0.001}
        step="any"
        defaultValue={qty}
        disabled={disabled}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const n = parseFloat(e.currentTarget.value);
            if (!isNaN(n) && n > 0) {
              onSetQty?.(n);
              e.currentTarget.blur();
            } else e.currentTarget.value = String(qty);
          }
          if (e.key === "Escape") {
            e.currentTarget.value = String(qty);
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => {
          const n = parseFloat(e.currentTarget.value);
          if (isNaN(n) || n <= 0) e.currentTarget.value = String(qty);
          else onSetQty?.(n);
        }}
        className="h-6 w-10 text-center border-y text-xs font-semibold tabular-nums bg-background outline-none focus:ring-1 focus:ring-inset focus:ring-primary disabled:opacity-40"
      />
      <button
        onClick={onIncrease}
        disabled={disabled}
        className="h-6 w-6 flex items-center justify-center rounded-r-sm border border-l-0 bg-muted hover:bg-accent disabled:opacity-40 transition-colors"
      >
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 border-b text-[10px] font-semibold uppercase tracking-widest shrink-0",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

// ─── SectionFooter ────────────────────────────────────────────────────────────

function SectionFooter({
  label,
  amount,
  className,
}: {
  label: string;
  amount: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-1.5 border-t text-xs font-semibold shrink-0",
        className,
      )}
    >
      <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
        {label}
      </span>
      <span className="tabular-nums">{fmt(amount)}</span>
    </div>
  );
}

// ─── SellTable — SellGold / SellSilver / ExchangeCurrency ─────────────────────

function SellTable({
  items,
  onQtyChange,
  onDelete,
  onUpdate,
  priceConfig,
  weightUnits,
}: {
  items: CartItem[];
  onQtyChange: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
}) {
  const t = useTranslations("pos.transactionTable");
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="border-b bg-muted/60 backdrop-blur-sm">
          <th className="px-3 py-2 w-7 text-center text-[10px] font-semibold text-muted-foreground">
            #
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t("columns.item")}
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Đơn vị
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            {t("columns.qty")}
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            {t("columns.unitPrice")}
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            {t("columns.laborFee")}
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            {t("columns.stoneFee")}
          </th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            {t("columns.total")}
          </th>
          <th className="w-7" />
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const unitPrice = Math.round(
            item.unitPriceLakPerGram * item.weightGram,
          );
          return (
            <tr
              key={item.productId}
              className={cn(
                "border-b group transition-colors hover:bg-accent/30",
                i % 2 === 1 && "bg-muted/10",
              )}
            >
              <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground/60">
                {i + 1}
              </td>
              <td className="px-3 py-2.5 min-w-36 max-w-52">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {item.purity}
                </p>
              </td>
              <td className="px-2 py-2.5">
                <UnitSelect
                  item={item}
                  priceConfig={priceConfig}
                  weightUnits={weightUnits}
                  isBuyMode={false}
                  onUpdate={onUpdate}
                  disabled={item.isReadOnly}
                />
              </td>
              <td className="px-3 py-2.5">
                <QtyControl
                  qty={item.qty}
                  disabled={item.isReadOnly}
                  onDecrease={() => onQtyChange(item.productId, item.qty - 1)}
                  onIncrease={() => onQtyChange(item.productId, item.qty + 1)}
                  onSetQty={(q) => onQtyChange(item.productId, q)}
                />
              </td>
              <td className="px-3 py-2.5">
                {item.isReadOnly ? (
                  <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {unitPrice.toLocaleString("lo-LA")} ₭
                  </span>
                ) : (
                  <input
                    key={item.weightUnitId ?? "default"}
                    type="text"
                    inputMode="numeric"
                    min={0}
                    defaultValue={unitPrice.toLocaleString('en')}
                    onFocus={(e) => {
                      e.target.value = e.target.value.replace(/,/g, '')
                      e.target.select()
                    }}
                    onBlur={(e) => {
                      const newPrice = Math.round(Number(e.currentTarget.value.replace(/,/g, '')) || 0)
                      e.currentTarget.value = newPrice ? newPrice.toLocaleString('en') : ''
                      if (newPrice !== unitPrice) {
                        onUpdate(item.productId, {
                          unitPriceLakPerGram:
                            item.weightGram > 0
                              ? newPrice / item.weightGram
                              : 0,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") {
                        e.currentTarget.value = unitPrice.toLocaleString('en')
                        e.currentTarget.blur();
                      }
                    }}
                    className="h-7 w-32 text-right text-xs px-2 tabular-nums border rounded-sm outline-none focus:ring-1 focus:ring-inset focus:ring-primary bg-background"
                  />
                )}
              </td>
              {/* Tiền công */}
              <td className="px-2 py-2.5 w-28">
                {item.isReadOnly ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {item.laborFee > 0 ? item.laborFee.toLocaleString("lo-LA") : "—"}
                  </span>
                ) : (
                  <NumberInput
                    min={0}
                    placeholder="0"
                    value={item.laborFee || ""}
                    onChange={(v) => onUpdate(item.productId, { laborFee: Number(v) || 0 })}
                    className="h-7 w-24 text-xs tabular-nums"
                  />
                )}
              </td>
              {/* Phí đá */}
              <td className="px-2 py-2.5 w-28">
                {item.isReadOnly ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {item.stoneFee > 0 ? item.stoneFee.toLocaleString("lo-LA") : "—"}
                  </span>
                ) : (
                  <NumberInput
                    min={0}
                    placeholder="0"
                    value={item.stoneFee || ""}
                    onChange={(v) => onUpdate(item.productId, { stoneFee: Number(v) || 0 })}
                    className="h-7 w-24 text-xs tabular-nums"
                  />
                )}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums whitespace-nowrap">
                {fmt(lineTotal(item))}
              </td>
              <td className="px-2 py-2.5 w-7">
                {!item.isReadOnly && (
                  <button
                    onClick={() => onDelete(item.productId)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── BuyGoldRow ───────────────────────────────────────────────────────────────

function BuyGoldRow({
  item,
  index,
  onQtyChange,
  onDelete,
  onUpdate,
  priceConfig,
  weightUnits,
}: {
  item: CartItem;
  index: number;
  onQtyChange: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
}) {
  const unitPrice = Math.round(item.unitPriceLakPerGram * item.weightGram);
  // Cân nặng thực tế (đổi sang đơn vị hiện tại)
  const effectiveGram =
    item.weightGramOverride !== null
      ? item.weightGramOverride
      : item.qty * item.weightGram;
  const effectiveUnits =
    item.weightGram > 0
      ? parseFloat((effectiveGram / item.weightGram).toFixed(4))
      : item.qty;

  return (
    <tr
      className={cn(
        "border-b group transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20",
        index % 2 === 1 && "bg-muted/10",
      )}
    >
      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground/60">
        {index + 1}
      </td>
      <td className="px-3 py-2 min-w-32 max-w-44">
        <p className="text-xs font-medium truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {item.purity}
        </p>
      </td>
      <td className="px-2 py-2">
        <UnitSelect
          item={item}
          priceConfig={priceConfig}
          weightUnits={weightUnits}
          isBuyMode={true}
          onUpdate={onUpdate}
          disabled={item.isReadOnly}
        />
      </td>
      <td className="px-3 py-2">
        <QtyControl
          qty={item.qty}
          disabled={item.isReadOnly}
          onDecrease={() => onQtyChange(item.productId, item.qty - 1)}
          onIncrease={() => onQtyChange(item.productId, item.qty + 1)}
          onSetQty={(q) => onQtyChange(item.productId, q)}
        />
      </td>

      {/* Cân nặng (trong đơn vị đã chọn) */}
      <td className="px-2 py-2 w-24">
        <input
          key={item.weightUnitId ?? "default"}
          type="text"
          inputMode="decimal"
          disabled={item.isReadOnly}
          defaultValue={effectiveUnits.toLocaleString('en', { maximumFractionDigits: 3 })}
          onFocus={(e) => {
            e.target.value = e.target.value.replace(/,/g, '')
            e.target.select()
          }}
          onBlur={(e) => {
            const newUnits = Number(e.currentTarget.value.replace(/,/g, ''))
            if (newUnits > 0) e.currentTarget.value = newUnits.toLocaleString('en', { maximumFractionDigits: 3 })
            if (newUnits > 0 && newUnits !== effectiveUnits) {
              onUpdate(item.productId, {
                weightGramOverride: newUnits * item.weightGram,
              });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.currentTarget.value = effectiveUnits.toLocaleString('en', { maximumFractionDigits: 3 })
              e.currentTarget.blur();
            }
          }}
          className="h-6 w-20 text-right text-xs px-2 tabular-nums border rounded-sm outline-none focus:ring-1 focus:ring-inset focus:ring-primary bg-background disabled:opacity-40"
        />
      </td>

      {/* Giá mua (₭/đơn vị) */}
      <td className="px-2 py-2 w-28">
        {item.isReadOnly ? (
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {unitPrice.toLocaleString("lo-LA")} ₭
          </span>
        ) : (
          <input
            key={`price-${item.weightUnitId ?? "default"}`}
            type="text"
            inputMode="numeric"
            defaultValue={unitPrice.toLocaleString('en')}
            onFocus={(e) => {
              e.target.value = e.target.value.replace(/,/g, '')
              e.target.select()
            }}
            onBlur={(e) => {
              const newPrice = Math.round(Number(e.currentTarget.value.replace(/,/g, '')) || 0)
              e.currentTarget.value = newPrice ? newPrice.toLocaleString('en') : ''
              if (newPrice !== unitPrice) {
                onUpdate(item.productId, {
                  unitPriceLakPerGram:
                    item.weightGram > 0 ? newPrice / item.weightGram : 0,
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = unitPrice.toLocaleString('en')
                e.currentTarget.blur();
              }
            }}
            className="h-6 w-28 text-right text-xs px-2 tabular-nums border rounded-sm outline-none focus:ring-1 focus:ring-inset focus:ring-primary bg-background"
          />
        )}
      </td>

      {/* PHÍ KHÒ — checkbox bật / tắt + input số tiền */}
      <td className="px-2 py-2 w-32">
        <div className="flex items-center gap-1.5">
          <button
            disabled={item.isReadOnly}
            onClick={() =>
              onUpdate(item.productId, {
                isDamaged: !item.isDamaged,
                perItemDamage: item.isDamaged ? 0 : item.perItemDamage,
              })
            }
            title={item.isDamaged ? "Bỏ PHÍ KHÒ" : "Bật PHÍ KHÒ"}
            className={cn(
              "shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-40",
              item.isDamaged
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-muted-foreground/30 hover:border-orange-400",
            )}
          >
            {item.isDamaged && <AlertTriangle className="h-2.5 w-2.5" />}
          </button>
          {item.isDamaged && (
            <NumberInput
              min={0}
              placeholder="0"
              disabled={item.isReadOnly}
              value={item.perItemDamage || ""}
              onChange={(v) =>
                onUpdate(item.productId, {
                  perItemDamage: Number(v) || 0,
                })
              }
              className="h-5 w-20 text-[10px] px-1.5 tabular-nums"
            />
          )}
          {!item.isDamaged && (
            <span className="text-[10px] text-muted-foreground/40">—</span>
          )}
        </div>
      </td>

      {/* LAO SUT (số chỉ hao mòn) */}
      <td className="px-2 py-2 w-24">
        <NumberInput
          decimals={2}
          min={0}
          placeholder="0"
          disabled={item.isReadOnly}
          value={item.perItemWearChi || ""}
          onChange={(v) =>
            onUpdate(item.productId, {
              perItemWearChi: Number(v) || 0,
            })
          }
          className="h-5 w-20 text-[10px] px-1.5 tabular-nums"
        />
      </td>

      <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400 whitespace-nowrap">
        {fmt(lineTotal(item))}
      </td>
      <td className="px-2 py-2 w-7">
        {!item.isReadOnly && (
          <button
            onClick={() => onDelete(item.productId)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── BuyGoldTable ─────────────────────────────────────────────────────────────

function BuyGoldTable({
  items,
  onQtyChange,
  onDelete,
  onUpdate,
  priceConfig,
  weightUnits,
}: {
  items: CartItem[];
  onQtyChange: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="border-b bg-blue-50/60 dark:bg-blue-950/30 backdrop-blur-sm">
          <th className="px-3 py-2 w-7 text-center text-[10px] font-semibold text-muted-foreground">
            #
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Sản phẩm mua vào
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Đơn vị
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Số lượng
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Cân nặng
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Giá mua
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">
            Lỗi/Hỏng (₭)
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">
            Hao mòn (Chỉ)
          </th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide whitespace-nowrap">
            Tiệm chi
          </th>
          <th className="w-7" />
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <BuyGoldRow
            key={item.productId}
            item={item}
            index={i}
            onQtyChange={onQtyChange}
            onDelete={onDelete}
            onUpdate={onUpdate}
            priceConfig={priceConfig}
            weightUnits={weightUnits}
          />
        ))}
      </tbody>
    </table>
  );
}

// ─── ExchangeInRow — vàng cũ với Tiền công/ LAO SUT ──────────────────────────

function ExchangeInRow({
  item,
  index,
  onUpdate,
  onDelete,
}: {
  item: CartItem;
  index: number;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  onDelete: (id: string) => void;
}) {
  const rowTotal = lineTotal(item);
  return (
    <tr
      className={cn(
        "border-b group transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20",
        index % 2 === 1 && "bg-muted/10",
      )}
    >
      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground/60">
        {index + 1}
      </td>
      <td className="px-3 py-2 min-w-32 max-w-40">
        <p className="text-xs font-medium truncate">{item.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[10px] text-muted-foreground font-mono">
            {(item.weightGramOverride ?? item.qty * item.weightGram).toFixed(2)}
            g
          </p>
          {item.weightUnitName && (
            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              /{item.weightUnitName}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {(item.unitPriceLakPerGram * item.weightGram).toLocaleString("lo-LA")}{" "}
        ₭/{item.weightUnitName ?? "g"}
      </td>

      {/* PHÍ KHÒ: checkbox + input */}
      <td className="px-2 py-2 w-32">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              onUpdate(item.productId, {
                isDamaged: !item.isDamaged,
                perItemDamage: item.isDamaged ? 0 : item.perItemDamage,
              })
            }
            title={item.isDamaged ? "Bỏ PHÍ KHÒ" : "Bật PHÍ KHÒ"}
            className={cn(
              "shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
              item.isDamaged
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-muted-foreground/30 hover:border-orange-400",
            )}
          >
            {item.isDamaged && <AlertTriangle className="h-2.5 w-2.5" />}
          </button>
          {item.isDamaged && (
            <NumberInput
              min={0}
              placeholder="0"
              value={item.perItemDamage || ""}
              onChange={(v) =>
                onUpdate(item.productId, {
                  perItemDamage: Number(v) || 0,
                })
              }
              className="h-5 w-20 text-[10px] px-1.5 tabular-nums"
            />
          )}
          {!item.isDamaged && (
            <span className="text-[10px] text-muted-foreground/40">—</span>
          )}
        </div>
      </td>

      {/* LAO SUT: số chỉ */}
      <td className="px-2 py-2 w-24">
        <NumberInput
          decimals={2}
          min={0}
          placeholder="0"
          value={item.perItemWearChi || ""}
          onChange={(v) =>
            onUpdate(item.productId, {
              perItemWearChi: Number(v) || 0,
            })
          }
          className="h-5 w-20 text-[10px] px-1.5 tabular-nums"
        />
      </td>

      <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
        {fmt(rowTotal)}
      </td>
      <td className="px-2 py-2 w-7">
        {!item.isReadOnly && (
          <button
            onClick={() => onDelete(item.productId)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── ExchangeGoldTable ────────────────────────────────────────────────────────

function ExchangeGoldTable({
  items,
  totalA,
  totalB,
  netTotal,
  onQtyChange,
  onDelete,
  onUpdate,
  priceConfig,
  weightUnits,
}: {
  items: CartItem[];
  totalA: number;
  totalB: number;
  netTotal: number;
  onQtyChange: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
}) {
  const exchangeItems = items.filter((i) => i.itemRole === "ExchangeIn");
  const normalItems = items.filter((i) => i.itemRole === "Normal");

  return (
    <div className="flex flex-col min-h-0">
      {/* PANEL A: Vàng cũ đổi vào */}
      <SectionHeader
        icon={ArrowDownToLine}
        label="Vàng cũ đổi vào"
        className="text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
      />

      {exchangeItems.length === 0 ? (
        <div className="flex items-center justify-center py-5 text-muted-foreground">
          <p className="text-xs opacity-60">
            Liên kết HĐ bán vàng cũ hoặc thêm thủ công
          </p>
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-amber-50/40 dark:bg-amber-950/20">
              <th className="px-3 py-1.5 w-7 text-[9px] font-semibold text-muted-foreground text-center">
                #
              </th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left">
                Sản phẩm
              </th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left whitespace-nowrap">
                Giá/g
              </th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-left whitespace-nowrap">
                Tiền công (₭)
              </th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-left whitespace-nowrap">
                Lao sút (Chỉ)
              </th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 uppercase text-right whitespace-nowrap">
                Trị giá
              </th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {exchangeItems.map((item, i) => (
              <ExchangeInRow
                key={item.productId}
                item={item}
                index={i}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      )}

      <SectionFooter
        label="(B) Tổng cấn trừ vàng cũ"
        amount={totalB}
        className="text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 font-bold"
      />

      {/* PANEL B: Hàng mới bán ra */}
      <SectionHeader
        icon={ArrowUpFromLine}
        label="Hàng bán ra mới"
        className="text-primary bg-primary/5 border-t-2 border-t-border"
      />

      {normalItems.length === 0 ? (
        <div className="flex items-center justify-center py-5 text-muted-foreground">
          <p className="text-xs opacity-60">
            Tìm sản phẩm mới từ thanh tìm kiếm (F3)
          </p>
        </div>
      ) : (
        <SellTable
          items={normalItems}
          onQtyChange={onQtyChange}
          onDelete={onDelete}
          onUpdate={onUpdate}
          priceConfig={priceConfig}
          weightUnits={weightUnits}
        />
      )}

      <SectionFooter
        label="(A) Tổng hàng bán ra mới"
        amount={totalA}
        className="font-bold"
      />

      {/* Chênh lệch cuối */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-t-2 shrink-0",
          netTotal > 0
            ? "text-green-700 dark:text-green-400 bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900"
            : netTotal < 0
              ? "text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
              : "text-muted-foreground bg-muted/30",
        )}
      >
        <div className="flex items-center gap-2">
          {netTotal > 0 ? (
            <TrendingUp className="h-4 w-4 shrink-0" />
          ) : netTotal < 0 ? (
            <Banknote className="h-4 w-4 shrink-0" />
          ) : (
            <Equal className="h-4 w-4 shrink-0 opacity-60" />
          )}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest opacity-70">
              {netTotal > 0
                ? "Khách trả thêm"
                : netTotal < 0
                  ? "Tiệm trả lại khách"
                  : "Hoà vốn"}
            </p>
            <p className="text-[8px] opacity-50 mt-0.5">
              {netTotal > 0 ? "A − B" : netTotal < 0 ? "B − A" : "A = B"}
            </p>
          </div>
        </div>
        <span className="font-extrabold text-xl tabular-nums tracking-tight">
          {fmt(Math.abs(netTotal))}
        </span>
      </div>
    </div>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

function SummaryBar({
  txnType,
  subtotal,
  total,
  discount,
  itemCount,
}: {
  txnType: string;
  subtotal: number;
  total: number;
  discount: number;
  itemCount: number;
}) {
  const isBuy = txnType === "BuyGold";
  return (
    <div className="flex items-stretch border-t bg-card shrink-0">
      <div className="flex-1 px-3 py-2.5 border-r">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
          {itemCount} mục hàng
        </p>
        <p className="font-semibold text-xs mt-0.5 tabular-nums">
          {fmt(subtotal)}
        </p>
      </div>

      {discount > 0 && (
        <div className="flex-1 px-3 py-2.5 border-r">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
            Giảm giá
          </p>
          <p className="font-semibold text-xs mt-0.5 tabular-nums text-destructive">
            -{fmt(discount)}
          </p>
        </div>
      )}

      <div
        className={cn(
          "flex-[1.5] px-4 py-2.5",
          isBuy ? "bg-blue-50/60 dark:bg-blue-950/30" : "bg-primary/5",
        )}
      >
        <p
          className={cn(
            "text-[9px] uppercase tracking-wide font-semibold",
            isBuy
              ? "text-blue-600 dark:text-blue-400"
              : "text-muted-foreground",
          )}
        >
          {isBuy ? "💵 Tiệm phải chi" : "★ Khách phải trả"}
        </p>
        <p
          className={cn(
            "font-extrabold text-lg mt-0.5 tabular-nums tracking-tight",
            isBuy ? "text-blue-600 dark:text-blue-400" : "text-foreground",
          )}
        >
          {fmt(total)}
        </p>
      </div>
    </div>
  );
}

// ─── TransactionTable Root ────────────────────────────────────────────────────

export function TransactionTable() {
  const {
    tab,
    subtotal,
    totalA,
    totalB,
    netTotal,
    total,
    setQty,
    deleteItem,
    updateCartItem,
  } = useActiveTab();
  const { data: priceConfig } = useConfigPrices();
  const { data: weightUnits = [] } = useWeightUnits();
  const { user } = useAuthStore();
  const items = tab?.items ?? [];
  const txnType = tab?.txnType ?? "SellGold";
  const discount = tab?.discountAmount ?? 0;
  const isExchange = txnType === "ExchangeGold";
  const isFx = txnType === "ExchangeCurrency";
  const isBuy = txnType === "BuyGold";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <InfoBar
        label={tab?.label ?? "INV"}
        status={tab?.status ?? "draft"}
        txnType={txnType}
        customerName={tab?.customerName ?? null}
        note={tab?.note ?? ""}
        counterName={user?.counterName}
      />

      <div className="flex-1 overflow-auto min-h-0">
        {isFx ? (
          <CurrencyExchangeForm />
        ) : isExchange ? (
          <ExchangeGoldTable
            items={items}
            totalA={totalA}
            totalB={totalB}
            netTotal={netTotal}
            onQtyChange={setQty}
            onDelete={deleteItem}
            onUpdate={updateCartItem}
            priceConfig={priceConfig}
            weightUnits={weightUnits}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground select-none">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center">
                <ShoppingCart className="h-9 w-9 opacity-30" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-3.5 w-3.5 opacity-40" />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground/60">
              Giỏ hàng trống
            </p>
            <p className="text-xs opacity-60">Tìm sản phẩm ở thanh trên (F3)</p>
          </div>
        ) : isBuy ? (
          <BuyGoldTable
            items={items}
            onQtyChange={setQty}
            onDelete={deleteItem}
            onUpdate={updateCartItem}
            priceConfig={priceConfig}
            weightUnits={weightUnits}
          />
        ) : (
          <SellTable
            items={items}
            onQtyChange={setQty}
            onDelete={deleteItem}
            onUpdate={updateCartItem}
            priceConfig={priceConfig}
            weightUnits={weightUnits}
          />
        )}
      </div>

      {!isExchange && !isFx && (
        <SummaryBar
          txnType={txnType}
          subtotal={subtotal}
          total={total}
          discount={discount}
          itemCount={items.length}
        />
      )}
    </div>
  );
}
