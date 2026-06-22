"use client";

import { useTranslations } from "next-intl";
import { useActiveTab } from "@/hooks/useActiveTab";
import {
  useCurrencies,
  useExchangeRatePairs,
  useUpdateExchangeRatePair,
} from "@/hooks/useConfig";
import { cn } from "@/lib/utils";
import { genId } from "@/lib/utils";
import type { FxLine } from "@/types/invoice-tab";
import { Select } from "antd";
import { InputNumber } from "@/components/ui/antd-number-input";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";

const CURRENCY_LABELS: Record<string, string> = {
  LAK: "LAK (₭ Kip)",
  USD: "USD ($)",
  THB: "THB (฿)",
  CNY: "CNY (¥)",
  EUR: "EUR (€)",
  JPY: "JPY (¥)",
  KRW: "KRW (₩)",
  SGD: "SGD ($)",
  VND: "VND (đ)",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  LAK: "₭", USD: "$", THB: "฿", CNY: "¥",
  EUR: "€", JPY: "¥", KRW: "₩", SGD: "$", VND: "đ",
};

function calcLine(line: FxLine) {
  const lakEquivalent = Math.round(line.fromAmount * line.fromRateToLak);
  const toAmount =
    line.toRateToLak > 0
      ? Math.round((lakEquivalent / line.toRateToLak) * 10000) / 10000
      : 0;
  return { lakEquivalent, toAmount };
}

function makeDefaultLine(currencies: string[]): FxLine {
  const from = currencies.find((c) => c !== "LAK") ?? "USD";
  return {
    id: genId(),
    fromCurrency: from,
    fromAmount: 0,
    fromRateToLak: 0, // điền tự động từ Rate Graph khi cặp tải xong
    toCurrency: "LAK",
    toRateToLak: 1,
  };
}

// ─── FxLineRow ────────────────────────────────────────────────────────────────

interface FxLineRowProps {
  line: FxLine;
  currencies: string[];
  isSavingRate: boolean;
  isOnly: boolean;
  onChange: (patch: Partial<Omit<FxLine, "id">>) => void;
  onRemove: () => void;
  onSaveRateToApi: (from: string, to: string, rate: number) => void;
}

function FxLineRow({
  line, currencies, isSavingRate, isOnly,
  onChange, onRemove, onSaveRateToApi,
}: FxLineRowProps) {
  const t = useTranslations("pos.currencyExchange");
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");

  // Tỷ giá lấy từ Rate Graph (cặp tỷ giá) — không còn dùng exchange_rates cũ.
  // `from → LAK` và `to → LAK` đủ để quy đổi qua LAK (đúng contract backend).
  const { data: fromPairs } = useExchangeRatePairs(
    line.fromCurrency,
    line.fromCurrency !== "LAK",
  );
  const { data: toPairs } = useExchangeRatePairs(
    line.toCurrency,
    line.toCurrency !== "LAK",
  );
  const cfgFromRate =
    line.fromCurrency === "LAK"
      ? 1
      : (fromPairs?.find((p) => p.to === "LAK")?.rate ?? 0);
  const cfgToRate =
    line.toCurrency === "LAK"
      ? 1
      : (toPairs?.find((p) => p.to === "LAK")?.rate ?? 0);

  // Tự điền tỷ giá cấu hình khi dòng chưa có tỷ giá (=0). Khi user đã sửa
  // (giá ≠ 0) thì không ghi đè.
  useEffect(() => {
    if (cfgFromRate > 0 && line.fromRateToLak === 0)
      onChange({ fromRateToLak: cfgFromRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgFromRate, line.fromRateToLak]);
  useEffect(() => {
    if (cfgToRate > 0 && line.toRateToLak === 0)
      onChange({ toRateToLak: cfgToRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgToRate, line.toRateToLak]);

  const { toAmount } = calcLine(line);
  const toSym = CURRENCY_SYMBOL[line.toCurrency] ?? line.toCurrency;
  const toFormatted =
    toAmount > 0
      ? line.toCurrency === "LAK"
        ? Math.round(toAmount).toLocaleString("lo-LA")
        : toAmount.toLocaleString("en", { maximumFractionDigits: 4 })
      : null;

  // Tỷ giá luôn hiển thị theo chiều "1 ngoại tệ = X ₭"
  // Nếu from=LAK thì hiển thị toCurrency's rate
  const isFromLak = line.fromCurrency === "LAK";
  const rateDisplayCurrency = isFromLak ? line.toCurrency : line.fromCurrency;
  const rateDisplayValue = isFromLak ? line.toRateToLak : line.fromRateToLak;

  const rateLabel =
    rateDisplayValue > 0
      ? `1 ${rateDisplayCurrency} = ${rateDisplayValue.toLocaleString("en")} ₭`
      : "—";

  const currencyOpts = (exclude: string) =>
    currencies.filter((c) => c !== exclude).map((c) => ({ value: c, label: CURRENCY_LABELS[c] ?? c }));

  const handleFromCurrencyChange = (curr: string) => {
    const toC =
      curr === line.toCurrency
        ? curr === "LAK" ? (currencies.find((c) => c !== "LAK") ?? "USD") : "LAK"
        : line.toCurrency;
    // reset tỷ giá về 0 → effect tự điền theo cặp tỷ giá của tiền mới
    onChange({
      fromCurrency: curr,
      fromRateToLak: 0,
      toCurrency: toC,
      toRateToLak: toC === "LAK" ? 1 : 0,
    });
    setEditingRate(false);
  };

  const handleToCurrencyChange = (curr: string) => {
    const fromC =
      curr === line.fromCurrency
        ? curr === "LAK" ? (currencies.find((c) => c !== "LAK") ?? "USD") : "LAK"
        : line.fromCurrency;
    onChange({
      toCurrency: curr,
      toRateToLak: curr === "LAK" ? 1 : 0,
      fromCurrency: fromC,
      fromRateToLak: fromC === "LAK" ? 1 : 0,
    });
    setEditingRate(false);
  };

  const openEditRate = () => {
    setRateInput(rateDisplayValue > 0 ? String(rateDisplayValue) : "");
    setEditingRate(true);
  };

  const saveRate = () => {
    const val = parseFloat(rateInput);
    if (!val || val <= 0) { setEditingRate(false); return; }
    // Lưu cặp tỷ giá "ngoại tệ → LAK" vào Rate Graph (API mới).
    if (isFromLak) {
      onChange({ toRateToLak: val });
      onSaveRateToApi(line.toCurrency, "LAK", val);
    } else {
      onChange({ fromRateToLak: val });
      onSaveRateToApi(line.fromCurrency, "LAK", val);
    }
    setEditingRate(false);
  };

  return (
    <div className="grid grid-cols-[1fr_minmax(0,200px)_1fr_2.25rem] border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">

      {/* FROM: currency select + amount */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Select
          value={line.fromCurrency}
          onChange={handleFromCurrencyChange}
          options={currencyOpts(line.toCurrency)}
          size="small"
          className="shrink-0"
          style={{ width: 110 }}
          popupMatchSelectWidth={false}
        />
        <InputNumber
          precision={2}
          min={0}
          placeholder={t("enterAmount")}
          value={line.fromAmount > 0 ? line.fromAmount : null}
          onChange={(v) => onChange({ fromAmount: v ?? 0 })}
          size="small"
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>

      {/* RATE column — shaded */}
      <div className="flex items-center px-3 py-2 border-x border-border/40 bg-muted/30">
        {editingRate ? (
          <div className="flex items-center gap-1 w-full min-w-0">
            <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
              1 {rateDisplayCurrency} =
            </span>
            <InputNumber
              precision={0}
              min={0}
              value={rateInput ? Number(rateInput) : null}
              onChange={(v) => setRateInput(String(v ?? ""))}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") saveRate();
                if (e.key === "Escape") setEditingRate(false);
              }}
              size="small"
              style={{ flex: 1, minWidth: 60 }}
              autoFocus
            />
            <button onClick={saveRate} disabled={isSavingRate || !rateInput}
              className="h-5 w-5 shrink-0 flex items-center justify-center rounded bg-primary text-primary-foreground disabled:opacity-40 transition-colors">
              <CheckOutlined style={{ fontSize: 10 }} />
            </button>
            <button onClick={() => setEditingRate(false)}
              className="h-5 w-5 shrink-0 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent transition-colors">
              <CloseOutlined style={{ fontSize: 10 }} />
            </button>
          </div>
        ) : (
          <button
            onClick={openEditRate}
            title={t("editRateTooltip")}
            className="w-full flex items-center justify-between gap-1.5 group min-w-0"
          >
            <span className="text-[11px] font-bold font-mono tabular-nums text-foreground group-hover:text-primary transition-colors truncate">
              {rateLabel}
            </span>
            <EditOutlined
              style={{ fontSize: 10 }}
              className="shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors"
            />
          </button>
        )}
      </div>

      {/* TO: currency + result amount */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-1 shrink-0">
          <ArrowRightOutlined style={{ fontSize: 10 }} className="text-muted-foreground/50" />
          <Select
            value={line.toCurrency}
            onChange={handleToCurrencyChange}
            options={currencyOpts(line.fromCurrency)}
            size="small"
            style={{ width: 105 }}
            popupMatchSelectWidth={false}
          />
        </div>
        <span
          className={cn(
            "flex-1 text-right text-base font-black tabular-nums tracking-tight",
            toFormatted ? "text-foreground" : "text-muted-foreground/25",
          )}
        >
          {toFormatted ? `${toFormatted} ${toSym}` : "—"}
        </span>
      </div>

      {/* DELETE */}
      <div className="flex items-center justify-center border-l border-border/40">
        <button
          onClick={onRemove}
          disabled={isOnly}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded transition-colors",
            isOnly
              ? "text-muted-foreground/20 cursor-not-allowed"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
          )}
        >
          <DeleteOutlined style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  );
}

// ─── CurrencyExchangeForm ─────────────────────────────────────────────────────

export function CurrencyExchangeForm() {
  const t = useTranslations("pos.currencyExchange");
  const { tab, setFxLines } = useActiveTab();
  const { data: currencyList = [], isLoading } = useCurrencies();
  const { mutate: updatePair, isPending: isSavingRate } =
    useUpdateExchangeRatePair();

  const currencies = useMemo(() => {
    const active = currencyList
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.code);
    return [...new Set(["LAK", ...active])];
  }, [currencyList]);

  const lines = tab?.fxLines ?? [];
  useEffect(() => {
    if (!isLoading && currencies.length > 1 && lines.length === 0) {
      setFxLines([makeDefaultLine(currencies)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.id, isLoading, currencies.length, lines.length]);

  const updateLine = (id: string, patch: Partial<Omit<FxLine, "id">>) =>
    setFxLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () => {
    setFxLines([...lines, makeDefaultLine(currencies)]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setFxLines(lines.filter((l) => l.id !== id));
  };

  const totalsPerCurrency = lines.reduce<Record<string, number>>((acc, l) => {
    const { toAmount } = calcLine(l);
    if (toAmount > 0) acc[l.toCurrency] = (acc[l.toCurrency] ?? 0) + toAmount;
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsPerCurrency);
  const hasAnyTotal = totalEntries.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs py-10">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Column headers ── */}
      <div className="grid grid-cols-[1fr_minmax(0,200px)_1fr_2.25rem] border-b border-border bg-muted/50 px-0 shrink-0">
        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("customerGives")}
          </p>
        </div>
        <div className="px-3 py-2 border-x border-border/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("rateLabel")}
          </p>
        </div>
        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("customerReceives")}
          </p>
        </div>
        <div />
      </div>

      {/* ── Exchange rows ── */}
      <div className="flex-1">
        {lines.map((line) => (
          <FxLineRow
            key={line.id}
            line={line}
            currencies={currencies}
            isSavingRate={isSavingRate}
            isOnly={lines.length === 1}
            onChange={(patch) => updateLine(line.id, patch)}
            onRemove={() => removeLine(line.id)}
            onSaveRateToApi={(from, to, rate) =>
              updatePair({ from, to, dto: { rate } })
            }
          />
        ))}

        {/* Add line */}
        <button
          onClick={addLine}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors border-t border-dashed border-primary/20"
        >
          <PlusOutlined style={{ fontSize: 11 }} />
          {t("addLine")}
        </button>
      </div>

      {/* ── "Khách hàng thực nhận" summary ── */}
      <div className="shrink-0 border-t-2 border-border">
        {/* Header strip */}
        <div className="px-5 py-2 bg-muted/40 border-b border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">
            {t("totalReceived")}
          </p>
        </div>

        {hasAnyTotal ? (
          <div>
            {totalEntries.map(([currency, amount], idx) => {
              const formatted =
                currency === "LAK"
                  ? Math.round(amount).toLocaleString("lo-LA")
                  : amount.toLocaleString("en", { maximumFractionDigits: 4 });
              const sym = CURRENCY_SYMBOL[currency] ?? currency;
              const isLast = idx === totalEntries.length - 1;
              return (
                <div
                  key={currency}
                  className={cn(
                    "flex items-center justify-between px-5 py-3",
                    !isLast && "border-b border-border/40",
                  )}
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {CURRENCY_LABELS[currency] ?? currency}
                  </span>
                  <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                    {formatted}{" "}
                    <span className="text-sm font-semibold text-muted-foreground">{sym}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-5">
            <span className="text-3xl font-black tabular-nums text-muted-foreground/20">—</span>
          </div>
        )}
      </div>
    </div>
  );
}
