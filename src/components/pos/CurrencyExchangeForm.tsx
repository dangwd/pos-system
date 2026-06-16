"use client";

import { useActiveTab } from "@/hooks/useActiveTab";
import { useExchangeRates, useUpdateExchangeRate } from "@/hooks/useConfig";
import { cn } from "@/lib/utils";
import type { ExchangeRate } from "@/types/config";
import { InputNumber, Select } from "antd";
import { ArrowRight, Check, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

const CURRENCY_LABELS: Record<string, string> = {
  LAK: "LAK (Kip) Lốc kíp Lào",
  USD: "USD ($) Đô la Mỹ",
  THB: "THB (฿) Bạt Thái Lan",
  CNY: "CNY (¥) Nhân dân tệ",
  EUR: "EUR (€) Euro",
  JPY: "JPY (¥) Yên Nhật",
  KRW: "KRW (₩) Won Hàn Quốc",
  SGD: "SGD ($) Đô la Singapore",
  VND: "VND (đ) Đồng Việt Nam",
};

function getRateLak(currency: string, rates: ExchangeRate[]): number {
  if (currency === "LAK") return 1;
  return rates.find((r) => r.currencyCode === currency)?.effectiveRate ?? 1;
}

export function CurrencyExchangeForm() {
  const { tab, setFxData } = useActiveTab();
  const { data: rates = [], isLoading } = useExchangeRates();
  const { mutate: updateRate, isPending: isSavingRate } = useUpdateExchangeRate();

  const [fromCurrency, setFromCurrency] = useState(tab?.fxFromCurrency ?? "USD");
  const [toCurrency, setToCurrency] = useState(tab?.fxToCurrency ?? "LAK");
  const [fromInput, setFromInput] = useState(
    tab?.fxFromAmount ? String(tab.fxFromAmount) : "",
  );
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");

  const currencies = ["LAK", ...rates.map((r) => r.currencyCode)];
  const fromRateLak = getRateLak(fromCurrency, rates);
  const toRateLak = getRateLak(toCurrency, rates);
  const crossRate = toRateLak > 0 ? fromRateLak / toRateLak : 0;

  const fromAmount = parseFloat(fromInput) || 0;
  const toAmount = fromAmount * crossRate;
  const lakAmount = Math.round(fromAmount * fromRateLak);

  useEffect(() => {
    setFxData(
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      lakAmount,
      fromRateLak,
      toRateLak,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, fromAmount]);

  // Khi đổi cặp tiền, reset edit mode
  useEffect(() => {
    setEditingRate(false);
  }, [fromCurrency, toCurrency]);

  const handleFromCurrencyChange = (curr: string) => {
    setFromCurrency(curr);
    if (curr === toCurrency) {
      setToCurrency(curr === "LAK" ? (rates[0]?.currencyCode ?? "USD") : "LAK");
    }
  };

  const handleToCurrencyChange = (curr: string) => {
    setToCurrency(curr);
    if (curr === fromCurrency) {
      setFromCurrency(
        curr === "LAK" ? (rates[0]?.currencyCode ?? "USD") : "LAK",
      );
    }
  };

  // Xác định tỷ giá nào đang hiển thị và cần lưu
  // - to = LAK: hiển thị & sửa fromCurrency LAK rate
  // - from = LAK: hiển thị & sửa toCurrency LAK rate
  // - cả hai ngoại tệ: hiển thị cross-rate, lưu bằng cách tính ngược fromCurrency LAK rate
  const rateIsFromToLak = toCurrency === "LAK";
  const rateIsLakToTo = fromCurrency === "LAK";
  const displayRate = rateIsFromToLak
    ? fromRateLak
    : rateIsLakToTo
      ? toRateLak
      : crossRate;
  const rateDecimals = rateIsFromToLak || rateIsLakToTo ? 0 : 4;
  const rateUnit = rateIsLakToTo ? toCurrency : toCurrency === "LAK" ? "₭" : toCurrency;
  const rateBase = rateIsLakToTo ? fromCurrency : fromCurrency;

  const openEditRate = () => {
    setRateInput(
      displayRate > 0
        ? displayRate.toLocaleString("en", { maximumFractionDigits: rateDecimals, useGrouping: false })
        : "",
    );
    setEditingRate(true);
  };

  const saveRate = () => {
    const val = parseFloat(rateInput);
    if (!val || val <= 0) { setEditingRate(false); return; }

    let currencyCode: string;
    let rateToLak: number;

    if (rateIsFromToLak) {
      // to = LAK → sửa fromCurrency LAK rate
      currencyCode = fromCurrency;
      rateToLak = val;
    } else if (rateIsLakToTo) {
      // from = LAK → sửa toCurrency LAK rate
      currencyCode = toCurrency;
      rateToLak = val;
    } else {
      // cross-rate → tính ngược fromCurrency LAK rate
      currencyCode = fromCurrency;
      rateToLak = val * toRateLak;
    }

    updateRate(
      { currencyCode, rateToLak, adjustment: 0 },
      { onSuccess: () => setEditingRate(false) },
    );
  };

  const toDisplay =
    toAmount > 0
      ? toCurrency === "LAK"
        ? Math.round(toAmount).toLocaleString("lo-LA")
        : toAmount.toLocaleString("en", { maximumFractionDigits: 4 })
      : null;

  const currencyOptions = (exclude: string) =>
    currencies
      .filter((c) => c !== exclude)
      .map((c) => ({ value: c, label: CURRENCY_LABELS[c] ?? c }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Đang tải tỷ giá...
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
        {/* Column labels */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
            Tiền khách đưa
          </p>
          <div className="w-10" />
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
            Tiền trả khách
          </p>
        </div>

        {/* Currency selects */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <Select
            value={fromCurrency}
            onChange={handleFromCurrencyChange}
            options={currencyOptions(toCurrency)}
            className="w-full"
            size="middle"
            popupMatchSelectWidth={false}
          />
          <div className="w-10 flex items-center justify-center">
            <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <Select
            value={toCurrency}
            onChange={handleToCurrencyChange}
            options={currencyOptions(fromCurrency)}
            className="w-full"
            size="middle"
            popupMatchSelectWidth={false}
          />
        </div>

        {/* Rate — editable inline */}
        {crossRate > 0 && (
          <div className="rounded-md border bg-muted/30 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Tỷ giá
            </p>
            {editingRate ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground shrink-0">
                  1 {rateBase} =
                </span>
                <InputNumber
                  precision={rateDecimals}
                  min={0}
                  value={rateInput ? Number(rateInput) : null}
                  onChange={(v) => setRateInput(String(v ?? ''))}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter") saveRate();
                    if (e.key === "Escape") setEditingRate(false);
                  }}
                  size="small"
                  style={{ width: '100%' }}
                  autoFocus
                />
                <span className="text-sm font-semibold text-muted-foreground shrink-0">
                  {rateUnit}
                </span>
                <button
                  onClick={saveRate}
                  disabled={isSavingRate || !rateInput}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingRate(false)}
                  disabled={isSavingRate}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openEditRate}
                className="w-full flex items-center justify-between gap-2 group"
                title="Nhấn để sửa tỷ giá"
              >
                <span className="text-base font-bold font-mono tabular-nums text-foreground group-hover:text-primary transition-colors">
                  1 {rateBase} ={" "}
                  {displayRate.toLocaleString("en", { maximumFractionDigits: rateDecimals })}{" "}
                  {rateUnit}
                </span>
                <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                  Sửa
                </span>
              </button>
            )}
          </div>
        )}

        {/* Amount input */}
        <div className="flex items-center border rounded-md overflow-hidden bg-background">
          <span className="px-3 py-2 text-xs font-bold font-mono text-muted-foreground bg-muted/50 border-r shrink-0">
            {fromCurrency}
          </span>
          <InputNumber
            precision={2}
            min={0}
            placeholder="Nhập số tiền"
            value={fromInput ? Number(fromInput) : null}
            onChange={(v) => setFromInput(String(v ?? ''))}
            size="small"
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        {/* Result box */}
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-center",
            toDisplay
              ? "border-primary/20 bg-primary/5"
              : "border-border bg-muted/30",
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
            Khách hàng thực nhận
          </p>
          <p
            className={cn(
              "text-3xl font-black tabular-nums tracking-tight leading-none",
              toDisplay ? "text-foreground" : "text-muted-foreground/40",
            )}
          >
            {toDisplay ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {toCurrency === "LAK" ? "₭ (Kip)" : toCurrency}
          </p>
        </div>
      </div>
    </div>
  );
}
