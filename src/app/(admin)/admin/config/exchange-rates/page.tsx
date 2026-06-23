"use client";

import { FlagIcon } from "@/components/shared/FlagIcon";
import { ForbiddenPage } from "@/components/shared/ForbiddenPage";
import { InputNumber } from "@/components/ui/antd-number-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  useBulkUpdateExchangeRatePairs,
  useCurrencies,
  useExchangeRateHistory,
  useExchangeRatePairHistory,
  useExchangeRatePairs,
  useExchangeRates,
  useUpdateExchangeRate,
} from "@/hooks/useConfig";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import type {
  Currency,
  ExchangeHistoryQuery,
  ExchangeRate,
  ExchangeRatePairSession,
  ExchangeRateSession,
} from "@/types/config";
import {
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  SwapOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Select as AntSelect, DatePicker, Switch, Table, Tooltip } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { flag: string; name: string }> = {
  LAK: { flag: "₭", name: "Kip Lào" },
  THB: { flag: "🇹🇭", name: "Thai Baht" },
  USD: { flag: "🇺🇸", name: "US Dollar" },
  CNY: { flag: "🇨🇳", name: "Nhân dân Tệ" },
  KRW: { flag: "🇰🇷", name: "Won Hàn Quốc" },
  EUR: { flag: "🇪🇺", name: "Euro" },
  JPY: { flag: "🇯🇵", name: "Yên Nhật" },
  YEN: { flag: "🇯🇵", name: "Yên Nhật" },
  VND: { flag: "🇻🇳", name: "Việt Nam Đồng" },
  GBP: { flag: "🇬🇧", name: "Bảng Anh" },
};

const ARBITRAGE_THRESHOLD = 0.02; // cảnh báo khi lệch > 2% so với cross-rate LAK

function metaOf(code: string, currencies: Currency[] = []) {
  const c = currencies.find((x) => x.code === code);
  return {
    flag: c?.flag ?? CURRENCY_META[code]?.flag ?? "💱",
    name: c?.name ?? CURRENCY_META[code]?.name ?? code,
  };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatPairRate(rate: number): string {
  if (rate >= 1000)
    return rate.toLocaleString("lo-LA", { maximumFractionDigits: 0 });
  if (rate >= 1) return rate.toLocaleString("en", { maximumFractionDigits: 4 });
  return rate.toLocaleString("en", { maximumFractionDigits: 8 });
}

function formatLak(n: number) {
  return n.toLocaleString("lo-LA", { maximumFractionDigits: 2 });
}

// ─── Kiểm tra tỷ giá (calculator) ────────────────────────────────────────────

function RateCalculator({
  rates,
  currencies,
}: {
  rates: ExchangeRate[];
  currencies: Currency[];
}) {
  const t = useTranslations("admin.config.exchangeRates");
  const { mutate: updateRate, isPending: isSavingRate } =
    useUpdateExchangeRate();

  const codes = useMemo(() => {
    const list = currencies
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.code);
    return [...new Set(["LAK", ...list, ...rates.map((r) => r.currencyCode)])];
  }, [currencies, rates]);

  const [from, setFrom] = useState(rates[0]?.currencyCode ?? "USD");
  const [to, setTo] = useState("LAK");
  const [amount, setAmount] = useState("100");
  const [editing, setEditing] = useState(false);
  const [rateInput, setRateInput] = useState("");

  const rateLak = (code: string) =>
    code === "LAK"
      ? 1
      : (rates.find((r) => r.currencyCode === code)?.effectiveRate ?? 1);
  const fromLak = rateLak(from);
  const toLak = rateLak(to);
  const crossRate = toLak > 0 ? fromLak / toLak : 0;

  const isFromLak = from === "LAK";
  const isToLak = to === "LAK";
  const bothForeign = !isFromLak && !isToLak;
  const displayBase = isFromLak ? to : from;
  const displayRate = isFromLak ? toLak : crossRate;
  const displayDecimals = bothForeign ? 4 : 0;
  const displayTarget = isToLak || isFromLak ? "₭" : to;

  const numAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const result = numAmount * crossRate;
  const resultStr =
    to === "LAK"
      ? Math.round(result).toLocaleString("lo-LA")
      : result.toLocaleString("en", { maximumFractionDigits: 4 });

  const detailRate = rates.find(
    (r) => r.currencyCode === (isFromLak ? to : from),
  );
  const options = codes.map((code) => {
    const m = metaOf(code, currencies);
    return { value: code, label: `${m.flag} ${code} — ${m.name}` };
  });

  function changeFrom(v: string) {
    setFrom(v);
    setEditing(false);
    if (v === to)
      setTo(v === "LAK" ? (rates[0]?.currencyCode ?? "USD") : "LAK");
  }
  function changeTo(v: string) {
    setTo(v);
    setEditing(false);
    if (v === from)
      setFrom(v === "LAK" ? (rates[0]?.currencyCode ?? "USD") : "LAK");
  }
  function swap() {
    const p = from;
    setFrom(to);
    setTo(p);
    setEditing(false);
  }

  function saveRate() {
    const val = parseFloat(rateInput);
    if (!val || val <= 0) {
      setEditing(false);
      return;
    }
    let currencyCode: string, rateToLak: number;
    if (isFromLak) {
      currencyCode = to;
      rateToLak = val;
    } else if (isToLak) {
      currencyCode = from;
      rateToLak = val;
    } else {
      currencyCode = from;
      rateToLak = Math.round(val * toLak);
    }
    updateRate(
      { currencyCode, rateToLak, adjustment: 0 },
      { onSuccess: () => setEditing(false) },
    );
  }

  const fromMeta = metaOf(from, currencies);
  const toMeta = metaOf(to, currencies);
  const labelRender = (opt: { value?: unknown }) => {
    const m = metaOf(String(opt.value ?? ""), currencies);
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <FlagIcon flag={m.flag} />
        <strong>{String(opt.value ?? "")}</strong>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[1fr_36px_1fr] gap-2 items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Từ</p>
          <AntSelect
            value={from}
            onChange={changeFrom}
            style={{ width: "100%" }}
            popupMatchSelectWidth={false}
            labelRender={labelRender}
            options={options}
          />
        </div>
        <div className="flex items-end justify-center pb-0.5">
          <button
            type="button"
            onClick={swap}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <SwapOutlined style={{ fontSize: 13 }} />
          </button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Sang</p>
          <AntSelect
            value={to}
            onChange={changeTo}
            style={{ width: "100%" }}
            popupMatchSelectWidth={false}
            labelRender={labelRender}
            options={options}
          />
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Tỷ giá áp dụng
        </p>
        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">
              1 {displayBase} =
            </span>
            <InputNumber
              precision={displayDecimals}
              min={0}
              value={rateInput ? Number(rateInput) : null}
              onChange={(v) => setRateInput(String(v ?? ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRate();
                if (e.key === "Escape") setEditing(false);
              }}
              size="small"
              style={{ flex: 1 }}
              autoFocus
            />
            <span className="text-sm text-muted-foreground shrink-0">
              {displayTarget}
            </span>
            <button
              onClick={saveRate}
              disabled={isSavingRate || !rateInput}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSavingRate ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <CheckOutlined />
              )}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={isSavingRate}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <CloseOutlined />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                1 {displayBase} =
              </span>
              <span className="text-xl font-bold text-primary tabular-nums">
                {displayRate.toLocaleString("en", {
                  maximumFractionDigits: displayDecimals,
                })}
              </span>
              <span className="text-sm text-muted-foreground">
                {displayTarget}
              </span>
            </div>
            <button
              onClick={() => {
                setRateInput(displayRate > 0 ? String(displayRate) : "");
                setEditing(true);
              }}
              className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <EditOutlined style={{ fontSize: 11 }} /> {t("edit")}
            </button>
          </div>
        )}
        {!bothForeign && detailRate && !editing && (
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span>
              {t("calculator.origin")}:{" "}
              {detailRate.rateToLak.toLocaleString("lo-LA")}
            </span>
            <span>
              {t("calculator.adjustment")}:{" "}
              {detailRate.adjustment >= 0 ? "+" : ""}
              {detailRate.adjustment.toLocaleString("lo-LA")}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">
          {t("calculator.inputAmount")} (<FlagIcon flag={fromMeta.flag} /> {from}
          )
        </p>
        <InputNumber
          precision={2}
          min={0}
          value={amount ? Number(amount) : null}
          onChange={(v) => setAmount(String(v ?? ""))}
          style={{ width: "100%" }}
        />
      </div>

      <div
        className={cn(
          "rounded-lg border px-4 py-5 text-center",
          result > 0
            ? "border-primary/20 bg-primary/5"
            : "border-border bg-muted/30",
        )}
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
          {t("calculator.result")}
        </p>
        <p
          className={cn(
            "text-4xl font-black tabular-nums tracking-tight leading-none",
            result > 0 ? "text-foreground" : "text-muted-foreground/40",
          )}
        >
          {result > 0 ? resultStr : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {to === "LAK" ? (
            t("calculator.kipLak")
          ) : (
            <>
              <FlagIcon flag={toMeta.flag} /> {to}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Tỷ giá chéo — 2 chiều (Rate Graph) ──────────────────────────────────────

function PairConfigDialog({
  open,
  onClose,
  rates,
  currencies,
  initialBase,
}: {
  open: boolean;
  onClose: () => void;
  rates: ExchangeRate[];
  currencies: Currency[];
  /** Tiền tệ gốc mở sẵn (vd khi bấm "Cập nhật tỷ giá" từ card đang xem USD) */
  initialBase?: string;
}) {
  const t = useTranslations("admin.config.exchangeRates");
  const { mutate: bulkUpdate, isPending } = useBulkUpdateExchangeRatePairs();

  const baseOptions = useMemo(() => {
    const codes = [
      ...new Set([
        "LAK",
        ...currencies
          .filter((c) => c.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => c.code),
        ...rates.map((r) => r.currencyCode),
      ]),
    ];
    return codes.map((code) => {
      const m = metaOf(code, currencies);
      return { value: code, label: `${m.flag} ${code} — ${m.name}` };
    });
  }, [currencies, rates]);

  const [base, setBase] = useState(
    initialBase ?? rates[0]?.currencyCode ?? "USD",
  );
  const [twoWay, setTwoWay] = useState(true);
  const pairsQuery = useExchangeRatePairs(base, open);
  const pairs = pairsQuery.data;

  // draft chỉ giữ giá trị người dùng đã sửa (override); chưa sửa thì hiển thị theo pair.rate.
  // Đổi tiền gốc → reset override (xử lý ngay trong onChange, không cần effect).
  const [draft, setDraft] = useState<Record<string, string>>({});

  // cross-rate qua LAK: 1 from = (LAK của from)/(LAK của to) to
  const rateMap = useMemo(
    () =>
      Object.fromEntries(rates.map((r) => [r.currencyCode, r.effectiveRate])),
    [rates],
  );
  const lakCross = (from: string, to: string): number | null => {
    const f = from === "LAK" ? 1 : (rateMap[from] ?? 0);
    const t = to === "LAK" ? 1 : (rateMap[to] ?? 0);
    if (f <= 0 || t <= 0) return null;
    return f / t;
  };

  const changedItems = useMemo(() => {
    if (!pairs) return [];
    const items: { from: string; to: string; rate: number }[] = [];
    for (const p of pairs) {
      if (draft[p.to] === undefined) continue;
      const val = Number(draft[p.to]);
      if (!val || val <= 0) continue;
      const orig = p.rate || 0;
      const isChanged =
        orig <= 0 ? val > 0 : Math.abs(val - orig) / orig > 1e-6;
      if (!isChanged) continue;
      items.push({ from: base, to: p.to, rate: val });
      if (twoWay)
        items.push({
          from: p.to,
          to: base,
          rate: Number((1 / val).toFixed(8)),
        });
    }
    return items;
  }, [pairs, draft, base, twoWay]);

  function handleSave() {
    if (changedItems.length === 0) return;
    bulkUpdate({ items: changedItems }, { onSuccess: onClose });
  }

  const baseMeta = metaOf(base, currencies);
  const changedCount = changedItems.filter((i) => i.from === base).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl"
        title={t("setup.title")}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || changedCount === 0}
            >
              {isPending && <Spinner className="mr-2" />}
              {changedCount > 0
                ? t("savePairs", { count: changedCount })
                : t("save")}
            </Button>
          </DialogFooter>
        }
      >
        <p className="text-xs text-muted-foreground mb-4">{t("setup.hint")}</p>
        <div className="space-y-4">
          {/* Base + two-way toggle */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-50">
              <p className="text-xs text-muted-foreground mb-1.5">
                {t("setup.baseCurrency")}
              </p>
              <AntSelect
                value={base}
                onChange={(v) => {
                  setBase(v);
                  setDraft({});
                }}
                style={{ width: "100%" }}
                popupMatchSelectWidth={false}
                labelRender={(opt) => {
                  const m = metaOf(String(opt.value ?? ""), currencies);
                  return (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <FlagIcon flag={m.flag} />
                      <strong>{String(opt.value ?? "")}</strong>
                    </span>
                  );
                }}
                options={baseOptions}
              />
            </div>
            <label className="flex items-center gap-2 pb-1.5 cursor-pointer select-none">
              <Switch checked={twoWay} onChange={setTwoWay} size="small" />
              <span className="text-sm">{t("setup.twoWay")}</span>
            </label>
          </div>

          {/* Pair list */}
          <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
            {pairsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : !pairs || pairs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {t("setup.noPairs")}
              </p>
            ) : (
              pairs.map((p) => {
                const m = metaOf(p.to, currencies);
                const shown =
                  draft[p.to] !== undefined ? draft[p.to] : String(p.rate);
                const val = Number(shown) || 0;
                const cross = lakCross(base, p.to);
                const diverged =
                  cross && cross > 0 && val > 0
                    ? Math.abs(val - cross) / cross > ARBITRAGE_THRESHOLD
                    : false;
                const divergePct =
                  cross && cross > 0 && val > 0
                    ? ((val - cross) / cross) * 100
                    : 0;
                return (
                  <div
                    key={p.to}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FlagIcon
                        flag={baseMeta.flag}
                        className="text-base leading-none"
                      />
                      <span className="text-sm font-medium shrink-0">
                        1 {base}
                      </span>
                      <ArrowRightOutlined
                        className="text-muted-foreground"
                        style={{ fontSize: 11 }}
                      />
                      <FlagIcon
                        flag={m.flag}
                        className="text-base leading-none"
                      />
                      <span className="text-sm font-medium shrink-0">
                        {p.to}
                      </span>
                      <span
                        className={cn(
                          "ml-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          p.isComputed
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {p.isComputed ? t("computed") : t("saved")}
                      </span>
                      {diverged && (
                        <Tooltip
                          title={t("setup.divergeTooltip", {
                            pct: `${divergePct > 0 ? "+" : ""}${divergePct.toFixed(1)}`,
                            rate: cross ? formatPairRate(cross) : "—",
                          })}
                        >
                          <WarningOutlined className="text-amber-500 shrink-0" />
                        </Tooltip>
                      )}
                    </div>
                    <div className="w-44">
                      <InputNumber
                        min={0}
                        precision={8}
                        value={shown ? Number(shown) : null}
                        onChange={(v) =>
                          setDraft((d) => ({ ...d, [p.to]: String(v ?? "") }))
                        }
                        style={{ width: "100%" }}
                        size="small"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {changedCount > 0 && twoWay && (
            <p className="text-xs text-muted-foreground">
              {t("setup.twoWayNote", { count: changedCount })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lịch sử — filter bar dùng chung ─────────────────────────────────────────

function HistoryFilterBar({
  currencyOptions,
  query,
  onChange,
  onReset,
}: {
  currencyOptions: { value: string; label: string }[];
  query: ExchangeHistoryQuery;
  onChange: (patch: Partial<ExchangeHistoryQuery>) => void;
  onReset: () => void;
}) {
  const t = useTranslations("admin.config.exchangeRates");
  const hasFilter = !!(query.currency || query.fromDate || query.toDate);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AntSelect
        allowClear
        placeholder={t("filter.allCurrencies")}
        style={{ width: 200 }}
        popupMatchSelectWidth={false}
        value={query.currency ?? undefined}
        options={currencyOptions}
        onChange={(v) => onChange({ currency: v ?? undefined, page: 1 })}
      />
      <DatePicker
        placeholder={t("filter.fromDate")}
        style={{ width: 150 }}
        format="DD/MM/YYYY"
        value={query.fromDate ? dayjs(query.fromDate) : null}
        onChange={(d) =>
          onChange({
            fromDate: d ? d.startOf("day").toISOString() : undefined,
            page: 1,
          })
        }
      />
      <DatePicker
        placeholder={t("filter.toDate")}
        style={{ width: 150 }}
        format="DD/MM/YYYY"
        value={query.toDate ? dayjs(query.toDate) : null}
        onChange={(d) =>
          onChange({
            toDate: d ? d.endOf("day").toISOString() : undefined,
            page: 1,
          })
        }
      />
      {hasFilter && (
        <Button variant="destructive" size="sm" onClick={onReset}>
          {t("filter.clear")}
        </Button>
      )}
    </div>
  );
}

// ─── Lịch sử tỷ giá LAK ──────────────────────────────────────────────────────

function LakHistoryPanel({
  currencyOptions,
}: {
  currencyOptions: { value: string; label: string }[];
}) {
  const t = useTranslations("admin.config.exchangeRates");
  const [query, setQuery] = useState<ExchangeHistoryQuery>({
    page: 1,
    pageSize: 10,
  });
  const { data, isLoading, isFetching, refetch } =
    useExchangeRateHistory(query);
  const sessions = data?.data ?? [];
  // sessionId có thể null (dữ liệu cũ) và trùng updatedAt → key duy nhất theo index.
  const rowKeyMap = useMemo(() => {
    const m = new Map<ExchangeRateSession, string>();
    (data?.data ?? []).forEach((s, i) =>
      m.set(s, s.sessionId ?? `${s.updatedAt}#${i}`),
    );
    return m;
  }, [data]);
  const patch = (p: Partial<ExchangeHistoryQuery>) =>
    setQuery((q) => ({ ...q, ...p }));

  const columns: TableColumnsType<ExchangeRateSession> = [
    {
      title: t("history.colTime"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t("history.colUpdatedCurrencies"),
      key: "items",
      render: (_: unknown, r: ExchangeRateSession) => (
        <div className="flex flex-wrap gap-1.5">
          {r.items.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
            >
              <span className="font-medium">{it.currencyCode}</span>
              <span className="font-bold text-primary tabular-nums">
                {formatLak(it.effectiveRate)}
              </span>
              <span className="text-muted-foreground">₭</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      title: t("history.colCount"),
      key: "count",
      width: 80,
      align: "center",
      render: (_: unknown, r: ExchangeRateSession) => r.items.length,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <HistoryFilterBar
          currencyOptions={currencyOptions}
          query={query}
          onChange={patch}
          onReset={() => setQuery({ page: 1, pageSize: 10 })}
        />
        <button
          type="button"
          onClick={() => refetch()}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <SyncOutlined
            className={isFetching ? "animate-spin" : ""}
            style={{ fontSize: 13 }}
          />
        </button>
      </div>
      <Table<ExchangeRateSession>
        dataSource={sessions}
        columns={columns}
        rowKey={(r) => rowKeyMap.get(r) ?? r.updatedAt}
        size="small"
        loading={isLoading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: (pg) => patch({ page: pg }),
          hideOnSinglePage: true,
        }}
        locale={{ emptyText: t("history.empty") }}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              size="small"
              pagination={false}
              rowKey={(it: ExchangeRateSession["items"][number]) =>
                it.currencyCode
              }
              dataSource={r.items}
              columns={[
                {
                  title: t("history.colCurrency"),
                  dataIndex: "currencyCode",
                  key: "c",
                  width: 120,
                },
                {
                  title: t("history.colBaseRate"),
                  dataIndex: "rateToLak",
                  key: "r",
                  align: "right",
                  render: (v: number) => formatLak(v),
                },
                {
                  title: t("history.colAdjustment"),
                  dataIndex: "adjustment",
                  key: "a",
                  align: "right",
                  render: (v: number) => `${v >= 0 ? "+" : ""}${formatLak(v)}`,
                },
                {
                  title: t("history.colEffective"),
                  dataIndex: "effectiveRate",
                  key: "e",
                  align: "right",
                  render: (v: number) => (
                    <span className="font-bold text-primary">
                      {formatLak(v)}
                    </span>
                  ),
                },
              ]}
            />
          ),
        }}
      />
    </div>
  );
}

// ─── Lịch sử Rate Graph (cặp) ────────────────────────────────────────────────

function PairHistoryPanel({
  currencyOptions,
}: {
  currencyOptions: { value: string; label: string }[];
}) {
  const t = useTranslations("admin.config.exchangeRates");
  const [query, setQuery] = useState<ExchangeHistoryQuery>({
    page: 1,
    pageSize: 10,
  });
  const { data, isLoading, isFetching, refetch } =
    useExchangeRatePairHistory(query);
  const sessions = data?.data ?? [];
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  // sessionId có thể null (dữ liệu cũ) và trùng updatedAt → key duy nhất theo index.
  const rowKeyMap = useMemo(() => {
    const m = new Map<ExchangeRatePairSession, string>();
    (data?.data ?? []).forEach((s, i) =>
      m.set(s, s.sessionId ?? `${s.updatedAt}#${i}`),
    );
    return m;
  }, [data]);
  const patch = (p: Partial<ExchangeHistoryQuery>) =>
    setQuery((q) => ({ ...q, ...p }));

  const columns: TableColumnsType<ExchangeRatePairSession> = [
    {
      title: t("history.colTime"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t("history.colUpdatedPairs"),
      key: "items",
      render: (_: unknown, r: ExchangeRatePairSession) => (
        <div className="flex flex-wrap gap-1.5">
          {r.items.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
            >
              <span className="font-medium">
                {it.from} → {it.to}
              </span>
              <span className="text-muted-foreground">:</span>
              <span className="font-bold text-primary tabular-nums">
                {formatPairRate(it.rate)}
              </span>
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <HistoryFilterBar
          currencyOptions={currencyOptions}
          query={query}
          onChange={patch}
          onReset={() => setQuery({ page: 1, pageSize: 10 })}
        />
        <button
          type="button"
          onClick={() => refetch()}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <SyncOutlined
            className={isFetching ? "animate-spin" : ""}
            style={{ fontSize: 13 }}
          />
        </button>
      </div>
      <Table<ExchangeRatePairSession>
        dataSource={sessions}
        columns={columns}
        rowKey={(r) => rowKeyMap.get(r) ?? r.updatedAt}
        size="small"
        loading={isLoading}
        rowClassName={(r) =>
          expandedKeys.includes(rowKeyMap.get(r) ?? r.updatedAt)
            ? "pair-row-expanded"
            : ""
        }
        onRow={(r) => ({
          onClick: (e) => {
            if (
              (e.target as HTMLElement).closest(
                'button, a, input, select, [role="button"]',
              )
            )
              return;
            const key = rowKeyMap.get(r) ?? r.updatedAt;
            setExpandedKeys((prev) => (prev.includes(key) ? [] : [key]));
          },
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: (pg) => patch({ page: pg }),
          hideOnSinglePage: true,
        }}
        locale={{ emptyText: t("history.empty") }}
        expandable={{
          expandedRowKeys: expandedKeys,
          showExpandColumn: false,
          expandedRowRender: (r) => (
            <div style={{ padding: "16px 24px 20px", background: "#f8faff" }}>
              <div className="max-w-2xl">
                <Table
                  size="small"
                  bordered
                  pagination={false}
                  rowKey={(it: ExchangeRatePairSession["items"][number]) =>
                    `${it.from}-${it.to}`
                  }
                  dataSource={r.items}
                  columns={[
                    {
                      title: t("history.colFrom"),
                      dataIndex: "from",
                      key: "f",
                      width: 100,
                    },
                    {
                      title: t("history.colTo"),
                      dataIndex: "to",
                      key: "t",
                      width: 100,
                    },
                    {
                      title: t("history.colRate"),
                      dataIndex: "rate",
                      key: "r",
                      align: "right",
                      render: (
                        v: number,
                        it: ExchangeRatePairSession["items"][number],
                      ) => (
                        <span className="font-bold text-primary">
                          1 {it.from} = {formatPairRate(v)} {it.to}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          ),
        }}
      />
      <style>{`.pair-row-expanded > td { background: #eff6ff !important; }`}</style>
    </div>
  );
}

// ─── Tỷ giá hiện tại (board read-only) ───────────────────────────────────────

function CurrentRatesBoard({
  rates,
  currencies,
  onEdit,
}: {
  rates: ExchangeRate[];
  currencies: Currency[];
  onEdit: (base: string) => void;
}) {
  const t = useTranslations("admin.config.exchangeRates");
  const baseOptions = useMemo(() => {
    const codes = [
      ...new Set([
        "LAK",
        ...currencies
          .filter((c) => c.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => c.code),
        ...rates.map((r) => r.currencyCode),
      ]),
    ];
    return codes.map((code) => {
      const m = metaOf(code, currencies);
      return { value: code, label: `${m.flag} ${code} — ${m.name}` };
    });
  }, [currencies, rates]);

  const [base, setBase] = useState(rates[0]?.currencyCode ?? "USD");
  const {
    data: pairs = [],
    isLoading,
    isFetching,
    refetch,
  } = useExchangeRatePairs(base);
  const baseMeta = metaOf(base, currencies);

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h2 className="text-base font-semibold">{t("board.title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("board.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted transition-colors"
        >
          <SyncOutlined
            className={isFetching ? "animate-spin" : ""}
            style={{ fontSize: 13 }}
          />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <AntSelect
          value={base}
          onChange={setBase}
          style={{ width: "100%" }}
          popupMatchSelectWidth={false}
          labelRender={(opt) => {
            const m = metaOf(String(opt.value ?? ""), currencies);
            return (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FlagIcon flag={m.flag} />
                <strong>{String(opt.value ?? "")}</strong>
              </span>
            );
          }}
          options={baseOptions}
        />

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>1</span>
          <FlagIcon flag={baseMeta.flag} />
          <strong className="text-foreground">{base}</strong>
          <span>=</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {t("board.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {pairs.map((p) => {
              const m = metaOf(p.to, currencies);
              return (
                <div
                  key={p.to}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FlagIcon
                      flag={m.flag}
                      className="text-base leading-none shrink-0"
                    />
                    <span className="text-sm font-semibold shrink-0">
                      {p.to}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {m.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        p.isComputed
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {p.isComputed ? t("computed") : t("saved")}
                    </span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatPairRate(p.rate)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => onEdit(base)}>
          <SwapOutlined className="mr-1.5 h-4 w-4" /> {t("board.updateButton")}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ExchangeRatesPage() {
  const t = useTranslations("admin.config.exchangeRates");
  const { hasPermission } = usePermission();
  const [calcOpen, setCalcOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  // Tiền tệ gốc để mở sẵn trong dialog: đặt khi mở từ card "Cập nhật tỷ giá".
  // undefined khi mở từ nút "Thiết lập tỷ giá" chung → dialog tự dùng mặc định.
  const [setupBase, setSetupBase] = useState<string | undefined>(undefined);

  const { data: rates = [], isLoading } = useExchangeRates();
  const { data: currencies = [] } = useCurrencies();

  const currencyOptions = useMemo(() => {
    const codes = [
      ...new Set([
        "LAK",
        ...currencies.filter((c) => c.isActive).map((c) => c.code),
        ...rates.map((r) => r.currencyCode),
      ]),
    ];
    return codes.map((code) => {
      const m = metaOf(code, currencies);
      return { value: code, label: `${m.flag} ${code}` };
    });
  }, [currencies, rates]);

  if (!hasPermission("CONFIG_PRICE")) return <ForbiddenPage />;

  const noData = rates.length === 0 && !isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          {/* <Button
            variant="outline"
            onClick={() => setCalcOpen(true)}
            disabled={noData}
          >
            <CalculatorOutlined className="mr-1.5 h-4 w-4" /> {t("previewTitle")}
          </Button> */}
          <Button
            onClick={() => {
              setSetupBase(undefined);
              setPairOpen(true);
            }}
            disabled={noData}
          >
            <SwapOutlined className="mr-1.5 h-4 w-4" /> {t("setupButton")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="w-full xl:w-96 shrink-0">
          <CurrentRatesBoard
            rates={rates}
            currencies={currencies}
            onEdit={(b) => {
              setSetupBase(b);
              setPairOpen(true);
            }}
          />
        </div>

        <div className="w-full xl:flex-1 min-w-0">
          <div className="rounded-xl border bg-card shadow-card">
            <div className="px-4 py-3 border-b">
              <h2 className="text-base font-semibold">{t("history.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("history.subtitle")}
              </p>
            </div>
            <div className="p-4">
              <PairHistoryPanel currencyOptions={currencyOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* <Dialog open={calcOpen} onOpenChange={(o) => !o && setCalcOpen(false)}>
        <DialogContent
          className="sm:max-w-md"
          title="Kiểm tra tỷ giá"
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={() => setCalcOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          }
        >
          <RateCalculator rates={rates} currencies={currencies} />
        </DialogContent>
      </Dialog> */}

      <PairConfigDialog
        key={`pair-${String(pairOpen)}-${setupBase ?? ""}`}
        open={pairOpen}
        onClose={() => setPairOpen(false)}
        rates={rates}
        currencies={currencies}
        initialBase={setupBase}
      />
    </div>
  );
}
