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
import { useActiveTab } from "@/hooks/useActiveTab";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useActivePriceConfig, useWeightUnits } from "@/hooks/useConfig";
import { useProductsWithStock } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import type { CartItem } from "@/types/cart";
import { lineTotal } from "@/types/cart";
import type { PriceConfig, WeightUnit } from "@/types/config";
import type { ProductWithStock } from "@/types/product";
import {
  BankOutlined,
  DeleteOutlined,
  GoldOutlined,
  InboxOutlined,
  MinusOutlined,
  MoneyCollectOutlined,
  PlusSquareOutlined,
  RiseOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";
import { InputNumber, Select } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
    Icon: MoneyCollectOutlined,
    cls: "text-green-700 dark:text-green-400",
    bg: "bg-green-100/70 dark:bg-green-950/40",
  },
  SellSilver: {
    Icon: GoldOutlined,
    cls: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-100/70 dark:bg-teal-950/40",
  },
  BuyGold: {
    Icon: PlusSquareOutlined,
    cls: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100/70 dark:bg-blue-950/40",
  },
  BuyMoreGold: {
    Icon: PlusSquareOutlined,
    cls: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100/70 dark:bg-blue-950/40",
  },
  ExchangeGold: {
    Icon: SwapOutlined,
    cls: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
  },
  ExchangeFree: {
    Icon: SwapOutlined,
    cls: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
  },
  ExchangeToMoney: {
    Icon: BankOutlined,
    cls: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-100/70 dark:bg-indigo-950/40",
  },
  ExchangeCurrency: {
    Icon: BankOutlined,
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
    <InputNumber
      value={qty}
      min={0.001}
      step={1}
      size="small"
      disabled={disabled}
      style={{ width: 80 }}
      onChange={(v) => {
        if (v != null && v > 0) onSetQty?.(v);
      }}
    />
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
                  <InputNumber
                    key={item.weightUnitId ?? "default"}
                    value={unitPrice || null}
                    onChange={(v) => {
                      const newPrice = v ?? 0;
                      if (newPrice !== unitPrice) {
                        onUpdate(item.productId, {
                          unitPriceLakPerGram:
                            item.weightGram > 0
                              ? newPrice / item.weightGram
                              : 0,
                        });
                      }
                    }}
                    size="small"
                    style={{ width: 128 }}
                  />
                )}
              </td>
              {/* Tiền công */}
              <td className="px-2 py-2.5 w-28">
                {item.isReadOnly ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {item.laborFee > 0
                      ? item.laborFee.toLocaleString("lo-LA")
                      : "—"}
                  </span>
                ) : (
                  <InputNumber
                    min={0}
                    placeholder="0"
                    value={item.laborFee || null}
                    onChange={(v) =>
                      onUpdate(item.productId, { laborFee: v ?? 0 })
                    }
                    size="small"
                    style={{ width: 96 }}
                  />
                )}
              </td>
              {/* Phí đá */}
              <td className="px-2 py-2.5 w-28">
                {item.isReadOnly ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {item.stoneFee > 0
                      ? item.stoneFee.toLocaleString("lo-LA")
                      : "—"}
                  </span>
                ) : (
                  <InputNumber
                    min={0}
                    placeholder="0"
                    value={item.stoneFee || null}
                    onChange={(v) =>
                      onUpdate(item.productId, { stoneFee: v ?? 0 })
                    }
                    size="small"
                    style={{ width: 96 }}
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
                    <DeleteOutlined className="h-3.5 w-3.5" />
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

      {/* Giá mua (₭/đơn vị) */}
      <td className="px-2 py-2 w-28">
        {item.isReadOnly ? (
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {unitPrice.toLocaleString("lo-LA")} ₭
          </span>
        ) : (
          <InputNumber
            key={`price-${item.weightUnitId ?? "default"}`}
            value={unitPrice || null}
            onChange={(v) => {
              const newPrice = v ?? 0;
              if (newPrice !== unitPrice) {
                onUpdate(item.productId, {
                  unitPriceLakPerGram:
                    item.weightGram > 0 ? newPrice / item.weightGram : 0,
                });
              }
            }}
            size="small"
            style={{ width: 112 }}
          />
        )}
      </td>

      {/* PHÍ KHÒ — nhập trực tiếp */}
      <td className="px-2 py-2 w-32">
        {item.isReadOnly ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {item.perItemDamage > 0
              ? item.perItemDamage.toLocaleString("lo-LA")
              : "—"}
          </span>
        ) : (
          <InputNumber
            min={0}
            placeholder="0"
            size="small"
            value={item.perItemDamage || null}
            onChange={(v) =>
              onUpdate(item.productId, {
                perItemDamage: Number(v) || 0,
              })
            }
            style={{ width: 96 }}
          />
        )}
      </td>

      {/* HAO HỤT (số chỉ hao mòn) */}
      <td className="px-2 py-2 w-24">
        <InputNumber
          min={0}
          max={parseFloat(
            (
              (item.weightGramOverride ?? item.qty * item.weightGram) / 3.75
            ).toFixed(3),
          )}
          precision={3}
          placeholder="0"
          size="small"
          disabled={item.isReadOnly}
          value={item.perItemWearChi || null}
          onChange={(v) =>
            onUpdate(item.productId, {
              perItemWearChi: Number(v) || 0,
            })
          }
          style={{ width: 80 }}
        />
      </td>

      {/* GIÁ TRỊ HAO MÒN (₭) — chỉ hiển thị, không nhập */}
      <td className="px-2 py-2 w-28 text-right">
        <span className="text-[10px] tabular-nums text-orange-600 dark:text-orange-400">
          {item.perItemWearChi > 0
            ? Math.round(
                item.perItemWearChi * 3.75 * item.unitPriceLakPerGram,
              ).toLocaleString("lo-LA") + " ₭"
            : "—"}
        </span>
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
            <DeleteOutlined className="h-3.5 w-3.5" />
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
            Giá mua
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">
            Lỗi/Hỏng (₭)
          </th>
          <th className="px-2 py-2 text-left text-[10px] font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">
            Hao mòn (Chỉ)
          </th>
          <th className="px-2 py-2 text-right text-[10px] font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">
            Giá trị HM (₭)
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

// ─── ExchangeInSearch — ô tìm nhanh để thêm vàng cũ vào panel A ─────────────

function ExchangeInSearch({ onAdd }: { onAdd: (p: ProductWithStock) => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [] } = useProductsWithStock(
    debounced
      ? {
          search: debounced,
          categoryCode: "Gold",
          counterId: user?.counterId ?? undefined,
        }
      : undefined,
  );
  const hits = debounced ? results.slice(0, 6) : [];

  return (
    <div className="relative px-3 py-1.5 border-b bg-amber-50/20 dark:bg-amber-950/10 shrink-0">
      <div className="relative">
        <SearchOutlined className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Tìm sản phẩm cũ để thêm thủ công..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-6 w-full pl-6 pr-2 text-[10px] border rounded-sm bg-background outline-none focus:ring-1 focus:ring-inset focus:ring-amber-400 placeholder:text-muted-foreground/50"
        />
      </div>
      {open && hits.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-0.5 bg-background border rounded-md shadow-lg z-20 overflow-hidden">
          {hits.map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center justify-between gap-3"
              onMouseDown={() => {
                onAdd(p);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="truncate font-medium">{p.productName}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                {p.purity}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ExchangeInRow — vàng cũ với Tiền công/ HAO HỤT ──────────────────────────

function ExchangeInRow({
  item,
  index,
  onUpdate,
  onDelete,
  onQtyChange,
  priceConfig,
  weightUnits,
}: {
  item: CartItem;
  index: number;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  onDelete: (id: string) => void;
  onQtyChange: (
    id: string,
    qty: number,
    itemRole?: "Normal" | "ExchangeIn",
  ) => void;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
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
        {item.isReadOnly ? (
          <span className="text-xs tabular-nums font-semibold">{item.qty}</span>
        ) : (
          <QtyControl
            qty={item.qty}
            onDecrease={() =>
              onQtyChange(item.productId, item.qty - 1, "ExchangeIn")
            }
            onIncrease={() =>
              onQtyChange(item.productId, item.qty + 1, "ExchangeIn")
            }
            onSetQty={(q) => onQtyChange(item.productId, q, "ExchangeIn")}
          />
        )}
      </td>
      <td className="px-3 py-2 w-36">
        {item.isReadOnly ? (
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {Math.round(
              item.unitPriceLakPerGram * item.weightGram,
            ).toLocaleString("lo-LA")}{" "}
            ₭
          </span>
        ) : (
          <InputNumber
            key={item.weightUnitId ?? "default"}
            value={
              Math.round(item.unitPriceLakPerGram * item.weightGram) || null
            }
            onChange={(v) => {
              const newPrice = v ?? 0;
              onUpdate(item.productId, {
                unitPriceLakPerGram:
                  item.weightGram > 0 ? newPrice / item.weightGram : 0,
              });
            }}
            size="small"
            style={{ width: 128 }}
          />
        )}
      </td>

      {/* Lỗi/Hỏng — luôn nhập được (đánh giá tại thời điểm nhận hàng, không phụ thuộc isReadOnly) */}
      <td className="px-2 py-2 w-32">
        <InputNumber
          min={0}
          placeholder="0"
          size="small"
          value={item.perItemDamage || null}
          onChange={(v) =>
            onUpdate(item.productId, {
              perItemDamage: Number(v) || 0,
            })
          }
          style={{ width: 96 }}
        />
      </td>

      {/* Hao mòn — luôn nhập được */}
      <td className="px-2 py-2 w-24">
        <InputNumber
          min={0}
          max={parseFloat(
            (
              (item.weightGramOverride ?? item.qty * item.weightGram) / 3.75
            ).toFixed(3),
          )}
          precision={3}
          placeholder="0"
          size="small"
          value={item.perItemWearChi || null}
          onChange={(v) =>
            onUpdate(item.productId, {
              perItemWearChi: Number(v) || 0,
            })
          }
          style={{ width: 80 }}
        />
      </td>

      {/* GIÁ TRỊ HAO MÒN (₭) — chỉ hiển thị, không nhập */}
      <td className="px-2 py-2 w-28 text-right">
        <span className="text-[10px] tabular-nums text-orange-600 dark:text-orange-400">
          {item.perItemWearChi > 0
            ? Math.round(
                item.perItemWearChi * 3.75 * item.unitPriceLakPerGram,
              ).toLocaleString("lo-LA") + " ₭"
            : "—"}
        </span>
      </td>

      <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
        {fmt(rowTotal)}
      </td>
      <td className="px-2 py-2 w-7">
        <button
          onClick={() => onDelete(item.productId)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <DeleteOutlined className="h-3.5 w-3.5" />
        </button>
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
  onDeleteExchangeIn,
  onDeleteNormal,
  onUpdate,
  onAddExchangeIn,
  priceConfig,
  weightUnits,
}: {
  items: CartItem[];
  totalA: number;
  totalB: number;
  netTotal: number;
  onQtyChange: (
    id: string,
    qty: number,
    itemRole?: "Normal" | "ExchangeIn",
  ) => void;
  onDeleteExchangeIn: (id: string) => void;
  onDeleteNormal: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CartItem>) => void;
  onAddExchangeIn: (p: ProductWithStock) => void;
  priceConfig: PriceConfig | undefined;
  weightUnits: WeightUnit[];
}) {
  const exchangeItems = items.filter((i) => i.itemRole === "ExchangeIn");
  const normalItems = items.filter((i) => i.itemRole === "Normal");

  return (
    <div className="flex flex-col min-h-0">
      {/* PANEL A: Vàng cũ đổi vào */}
      <SectionHeader
        icon={VerticalAlignBottomOutlined}
        label="Vàng cũ đổi vào"
        className="text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
      />

      <ExchangeInSearch onAdd={onAddExchangeIn} />

      {exchangeItems.length === 0 ? (
        <div className="flex items-center justify-center py-5 text-muted-foreground">
          <p className="text-xs opacity-60">
            Tìm sản phẩm cũ ở ô trên hoặc liên kết HĐ gốc
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
              <th className="px-2 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left whitespace-nowrap">
                Đơn vị
              </th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left whitespace-nowrap">
                SL
              </th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-left whitespace-nowrap">
                Giá/chỉ
              </th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-left whitespace-nowrap">
                Lỗi/Hỏng (₭)
              </th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-left whitespace-nowrap">
                Hao mòn (Chỉ)
              </th>
              <th className="px-2 py-1.5 text-[9px] font-semibold text-orange-600 uppercase text-right whitespace-nowrap">
                Giá trị HM (₭)
              </th>
              <th className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase text-right whitespace-nowrap">
                Thành tiền
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
                onDelete={onDeleteExchangeIn}
                onQtyChange={onQtyChange}
                priceConfig={priceConfig}
                weightUnits={weightUnits}
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
        icon={VerticalAlignTopOutlined}
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
          onDelete={onDeleteNormal}
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
            <RiseOutlined className="h-4 w-4 shrink-0" />
          ) : netTotal < 0 ? (
            <BankOutlined className="h-4 w-4 shrink-0" />
          ) : (
            <MinusOutlined className="h-4 w-4 shrink-0 opacity-60" />
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
  const { priceConfig } = useActivePriceConfig();
  const { data: weightUnits = [] } = useWeightUnits();
  const { user } = useAuthStore();
  const { addToCartAs } = useAddToCart(priceConfig);
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
          <CurrencyExchangeForm key={tab?.id} />
        ) : isExchange ? (
          <ExchangeGoldTable
            items={items}
            totalA={totalA}
            totalB={totalB}
            netTotal={netTotal}
            onQtyChange={setQty}
            onDeleteExchangeIn={(id) => deleteItem(id, "ExchangeIn")}
            onDeleteNormal={(id) => deleteItem(id, "Normal")}
            onUpdate={updateCartItem}
            onAddExchangeIn={(p) => addToCartAs(p, "ExchangeIn")}
            priceConfig={priceConfig}
            weightUnits={weightUnits}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground select-none">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center">
                <ShoppingCartOutlined className="h-9 w-9 opacity-30" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <InboxOutlined className="h-3.5 w-3.5 opacity-40" />
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
