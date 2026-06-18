"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { InputNumber } from "@/components/ui/antd-number-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLogout } from "@/hooks/useAuth";
import { useOpenShift } from "@/hooks/useSalesShift";
import { useCurrencies, useExchangeRates } from "@/hooks/useConfig";
import { useAuthStore } from "@/stores/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckOutlined,
  DashboardOutlined,
  FileOutlined,
  LogoutOutlined,
  MinusOutlined,
  PlusOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";

const schema = z.object({
  openingCashLak: z.string().min(1, "Vui lòng nhập tiền mặt đầu ca"),
  amounts: z.record(z.string(), z.string().optional()),
  note: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

function getTimePeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "Sáng";
  if (h < 18) return "Chiều";
  return "Tối";
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  value, disabled, onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 flex items-center justify-center rounded-l-md border border-border bg-muted/60 hover:bg-muted active:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
      >
        <MinusOutlined style={{ fontSize: 10 }} />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="h-8 w-14 border-y border-border bg-background text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 flex items-center justify-center rounded-r-md border border-border bg-muted/60 hover:bg-muted active:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
      >
        <PlusOutlined style={{ fontSize: 10 }} />
      </button>
    </div>
  );
}

// ─── DenomTable ───────────────────────────────────────────────────────────────

function DenomTable({
  denominations, qty, symbol, currencyName, disabled, onChange,
}: {
  denominations: number[];
  qty: Record<number, number>;
  symbol: string;
  currencyName: string;
  disabled?: boolean;
  onChange: (denom: number, qty: number) => void;
}) {
  const sorted = useMemo(() => [...denominations].sort((a, b) => b - a), [denominations]);
  const totalCount = useMemo(() => Object.values(qty).reduce((s, q) => s + q, 0), [qty]);
  const totalAmount = useMemo(
    () => Object.entries(qty).reduce((s, [v, q]) => s + Number(v) * q, 0),
    [qty],
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[1fr_180px_140px] bg-muted/50 border-b">
        <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Mệnh giá
        </div>
        <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
          Số lượng (tờ / đồng)
        </div>
        <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
          Thành tiền
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-border/50">
        {sorted.map((d) => {
          const count = qty[d] ?? 0;
          const lineTotal = d * count;
          return (
            <div
              key={d}
              className={cn(
                "grid grid-cols-[1fr_180px_140px] items-center hover:bg-muted/20 transition-colors",
                count > 0 && "bg-primary/[0.03]",
              )}
            >
              <div className="px-5 py-3 flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {d.toLocaleString()}
                </span>
                <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-border bg-muted text-[9px] font-bold text-muted-foreground leading-none shrink-0">
                  {symbol}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-center">
                <Stepper
                  value={count}
                  disabled={disabled}
                  onChange={(v) => onChange(d, v)}
                />
              </div>
              <div className="px-5 py-3 text-right">
                {count > 0 ? (
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {symbol} {lineTotal.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-sm tabular-nums text-muted-foreground/30">
                    {symbol} 0
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="grid grid-cols-[1fr_180px_140px] items-center bg-muted/30 border-t">
        <div className="px-5 py-3">
          <span className="text-sm font-semibold text-foreground">
            Tổng cộng — {currencyName}
          </span>
        </div>
        <div className="px-4 py-3 text-center">
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalCount.toLocaleString()} tờ
            </span>
          )}
        </div>
        <div className="px-5 py-3 text-right">
          <span className="text-base font-bold tabular-nums text-primary">
            {symbol} {totalAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── OpenShiftModal ───────────────────────────────────────────────────────────

export function OpenShiftModal() {
  const { mutate: openShift, isPending } = useOpenShift();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data: allCurrencies = [], isLoading: currenciesLoading } = useCurrencies();
  const { data: exchangeRates = [] } = useExchangeRates();

  const foreignCurrencies = allCurrencies.filter((c) => c.isActive && c.code !== "LAK");
  const lakCurrency = allCurrencies.find((c) => c.code === "LAK");
  const lakDenoms = useMemo(
    () => (lakCurrency?.denominations ?? []).map((d) => d.value),
    [lakCurrency],
  );
  const lakHasDenoms = lakDenoms.length > 0;

  // All currency tabs
  const allTabs = useMemo(() => [
    {
      code: "LAK",
      name: lakCurrency?.name ?? "Kíp Lào",
      flag: lakCurrency?.flag ?? "🇱🇦",
      symbol: lakCurrency?.symbol ?? "₭",
      denominations: lakDenoms,
    },
    ...foreignCurrencies.map((c) => ({
      code: c.code,
      name: c.name,
      flag: c.flag ?? "💱",
      symbol: c.symbol,
      denominations: c.denominations.map((d: { value: number }) => d.value),
    })),
  ], [lakCurrency, lakDenoms, foreignCurrencies]);

  const [activeTab, setActiveTab] = useState("LAK");
  const [lakQty, setLakQty] = useState<Record<number, number>>({});
  const [fxQty, setFxQty] = useState<Record<string, Record<number, number>>>({});
  const [now] = useState(() => new Date());

  const lakComputed = useMemo(
    () => Object.entries(lakQty).reduce((sum, [v, q]) => sum + Number(v) * q, 0),
    [lakQty],
  );
  const fxComputed = useMemo(
    () =>
      Object.fromEntries(
        foreignCurrencies.map((c) => [
          c.code,
          Object.entries(fxQty[c.code] ?? {}).reduce(
            (sum, [v, q]) => sum + Number(v) * q,
            0,
          ),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fxQty, foreignCurrencies.map((c) => c.code).join(",")],
  );

  // LAK-equivalent of all fx totals (for tổng quỹ quy đổi)
  const totalLakEquivalent = useMemo(() => {
    let total = lakComputed;
    for (const c of foreignCurrencies) {
      const fxTotal = fxComputed[c.code] ?? 0;
      const rate = exchangeRates.find((r) => r.currencyCode === c.code);
      if (rate && fxTotal > 0) {
        total += fxTotal * rate.effectiveRate;
      }
    }
    return Math.round(total);
  }, [lakComputed, fxComputed, foreignCurrencies, exchangeRates]);

  const { control, register, handleSubmit, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { openingCashLak: "", amounts: {}, note: "" },
    });

  useEffect(() => {
    if (!lakHasDenoms) return;
    setValue("openingCashLak", String(lakComputed), { shouldValidate: false });
  }, [lakComputed, lakHasDenoms, setValue]);

  useEffect(() => {
    for (const c of foreignCurrencies.filter((x) => x.denominations.length > 0)) {
      const total = fxComputed[c.code] ?? 0;
      if (total > 0) setValue(`amounts.${c.code}`, String(total), { shouldValidate: false });
    }
  }, [fxComputed, foreignCurrencies, setValue]);

  const onSubmit = (values: FormValues) => {
    const cash = lakHasDenoms
      ? lakComputed
      : parseInt(values.openingCashLak.replace(/[^0-9]/g, ""), 10);
    if (isNaN(cash) || cash < 0) return;

    const lakDenominations = lakHasDenoms
      ? Object.entries(lakQty)
          .filter(([, q]) => q > 0)
          .map(([v, q]) => ({ value: Number(v), quantity: q }))
      : undefined;

    const foreignCurrencyBalances = foreignCurrencies
      .filter((c) => {
        const v = values.amounts[c.code];
        return v && parseFloat(v) > 0;
      })
      .map((c) => {
        const denomEntries = Object.entries(fxQty[c.code] ?? {}).filter(([, q]) => q > 0);
        return {
          currency: c.code,
          openingAmount: parseFloat(values.amounts[c.code]!),
          denominations:
            denomEntries.length > 0
              ? denomEntries.map(([v, q]) => ({ value: Number(v), quantity: q }))
              : undefined,
        };
      });

    openShift({
      openingCashLak: cash,
      lakDenominations,
      foreignCurrencyBalances: foreignCurrencyBalances.length > 0 ? foreignCurrencyBalances : undefined,
      note: values.note || undefined,
    });
  };

  const noCounter = !user?.counterId;
  const canAccessAdmin = user?.role !== null;
  const activeCurrencyData = allTabs.find((t) => t.code === activeTab);

  const activeTotal = useMemo(() => {
    if (activeTab === "LAK") return lakComputed;
    return fxComputed[activeTab] ?? 0;
  }, [activeTab, lakComputed, fxComputed]);

  return (
    <div className="h-screen flex flex-col bg-muted/50 p-3 gap-2.5 overflow-hidden">

      {/* ── Logo header — island ── */}
      <div className="bg-primary rounded-xl shrink-0 px-5 py-2.5 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/logo_v%C3%A0ng-removebg-preview.png"
          alt="logo"
          className="h-7 w-7 object-contain shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] tracking-[0.22em] uppercase text-primary-foreground/50 font-light leading-none mb-0.5">
            Khamphuvong POS
          </p>
          <p className="text-sm font-semibold text-primary-foreground leading-none">
            Mở Ca Bán Hàng
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-primary-foreground/10 border border-primary-foreground/15 rounded-full px-3 py-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-300 animate-pulse" />
          <span className="text-[10px] text-primary-foreground/70 font-medium">Chưa mở ca</span>
        </div>
      </div>

      {/* ── Info bar — 4 islands ── */}
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        {[
          {
            label: "Thu ngân",
            content: (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold leading-none truncate">
                  {user?.fullName ?? "—"}
                </span>
                {user?.employeeCode && (
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                    {user.employeeCode}
                  </span>
                )}
              </div>
            ),
          },
          {
            label: "Quầy / Cửa hàng",
            content: (
              <p className="text-sm font-semibold leading-none truncate">
                {user?.counterName ?? (
                  <span className="text-muted-foreground font-normal">Chưa phân công</span>
                )}
                {user?.branchName && (
                  <span className="font-normal text-muted-foreground"> · {user.branchName}</span>
                )}
              </p>
            ),
          },
          {
            label: "Mã ca",
            content: <p className="text-sm text-muted-foreground leading-none">Chưa xác nhận</p>,
          },
          {
            label: "Giờ mở ca",
            content: (
              <p className="text-sm font-semibold leading-none">
                {formatTime(now)}{" "}
                <span className="font-normal text-muted-foreground">· {getTimePeriod()}</span>
              </p>
            ),
          },
        ].map(({ label, content }) => (
          <div key={label} className="rounded-xl bg-card border px-4 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              {label}
            </p>
            {content}
          </div>
        ))}
      </div>

      {/* ── Currency tabs — islands ── */}
      {!currenciesLoading && (
        <div className="grid shrink-0 gap-2.5" style={{ gridTemplateColumns: `repeat(${allTabs.length}, 1fr)` }}>
          {allTabs.map((tab) => {
            const tabTotal = tab.code === "LAK" ? lakComputed : (fxComputed[tab.code] ?? 0);
            const isActive = activeTab === tab.code;
            return (
              <button
                key={tab.code}
                type="button"
                onClick={() => setActiveTab(tab.code)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all",
                  isActive
                    ? "bg-card border-primary shadow-sm ring-1 ring-primary/20"
                    : "bg-card hover:bg-muted/60 border-border",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm leading-none select-none">{tab.flag}</span>
                  <span className={cn("font-mono font-bold text-sm", isActive ? "text-primary" : "text-foreground")}>
                    {tab.code}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{tab.name}</span>
                </div>
                <div className={cn(
                  "text-base font-bold tabular-nums leading-none",
                  isActive ? "text-primary" : tabTotal > 0 ? "text-foreground" : "text-muted-foreground/40",
                )}>
                  {tab.symbol} {tabTotal.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main body + bottom — form ── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0 gap-2.5"
      >
        <div className="flex flex-1 min-h-0 gap-2.5">

          {/* ── Left: denomination table — island ── */}
          <div className="flex-1 min-w-0 rounded-xl bg-card border overflow-y-auto">
            {currenciesLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : activeCurrencyData ? (
              <>
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 border-b">
                  <h2 className="text-sm font-semibold">
                    Bảng mệnh giá · {activeCurrencyData.code}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="leading-none select-none">{activeCurrencyData.flag}</span>
                    <span>{activeCurrencyData.name}</span>
                    {activeCurrencyData.denominations.length > 0 && (
                      <span className="text-muted-foreground/40">
                        — {activeCurrencyData.denominations.length} mệnh giá
                      </span>
                    )}
                  </div>
                </div>

                {activeCurrencyData.denominations.length > 0 ? (
                  <DenomTable
                    denominations={activeCurrencyData.denominations}
                    qty={activeTab === "LAK" ? lakQty : (fxQty[activeTab] ?? {})}
                    symbol={activeCurrencyData.symbol}
                    currencyName={activeCurrencyData.name}
                    disabled={noCounter}
                    onChange={(d, q) => {
                      if (activeTab === "LAK") {
                        setLakQty((prev) => ({ ...prev, [d]: q }));
                      } else {
                        setFxQty((prev) => ({
                          ...prev,
                          [activeTab]: { ...(prev[activeTab] ?? {}), [d]: q },
                        }));
                      }
                    }}
                  />
                ) : (
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Nhập số tiền đầu ca thủ công cho {activeCurrencyData.name}
                    </p>
                    {activeTab === "LAK" ? (
                      <Field>
                        <Controller
                          control={control}
                          name="openingCashLak"
                          render={({ field }) => (
                            <InputNumber
                              value={field.value ? Number(field.value) : null}
                              onChange={(v) => field.onChange(String(v ?? ""))}
                              placeholder="0"
                              min={0}
                              prefix={<WalletOutlined style={{ fontSize: 12, color: "var(--muted-foreground)" }} />}
                              suffix={<span className="text-xs font-bold text-muted-foreground">₭</span>}
                              status={errors.openingCashLak ? "error" : undefined}
                              disabled={noCounter}
                              style={{ width: "100%" }}
                            />
                          )}
                        />
                        {errors.openingCashLak && <FieldError>{errors.openingCashLak.message}</FieldError>}
                      </Field>
                    ) : (
                      <Controller
                        control={control}
                        name={`amounts.${activeTab}`}
                        render={({ field }) => (
                          <InputNumber
                            value={field.value ? Number(field.value) : null}
                            onChange={(v) => field.onChange(v != null ? String(v) : "")}
                            placeholder="0"
                            min={0}
                            suffix={<span className="text-xs font-semibold text-muted-foreground">{activeCurrencyData.symbol}</span>}
                            disabled={noCounter}
                            style={{ width: "100%" }}
                          />
                        )}
                      />
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* ── Right: 2 stacked islands ── */}
          <div className="w-85 shrink-0 flex flex-col gap-2.5">

            {/* Warning island */}
            {noCounter && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2 shrink-0">
                <WarningOutlined style={{ fontSize: 12, color: "var(--destructive)", marginTop: 2, flexShrink: 0 }} />
                <p className="text-xs text-destructive leading-relaxed">
                  Chưa được phân công quầy. Liên hệ quản lý trước khi mở ca.
                </p>
              </div>
            )}

            {/* Island 1: Tiền đầu ca + ghi chú */}
            <div className="rounded-xl bg-card border p-4 shrink-0">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-semibold">Tiền đầu ca</p>
                <span className="text-[10px] text-muted-foreground">Quỹ giao đầu ca</span>
              </div>
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">Đang kiểm đếm</p>
                  <p className="text-[10px] text-muted-foreground/50">Loại tiền hiện tại</p>
                </div>
                <span className={cn(
                  "text-sm font-bold tabular-nums shrink-0",
                  activeTotal > 0 ? "text-primary" : "text-muted-foreground",
                )}>
                  {activeCurrencyData?.symbol} {activeTotal.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileOutlined style={{ fontSize: 10 }} />
                Ghi chú đầu ca
              </p>
              <Textarea
                placeholder="VD: Nhận đủ quỹ, máy POS hoạt động bình thường..."
                rows={3}
                maxLength={500}
                disabled={noCounter}
                className="text-xs resize-none"
                {...register("note")}
              />
            </div>

            {/* Island 2: Tổng quỹ */}
            <div className="rounded-xl bg-primary/6 border border-primary/20 p-4 flex-1 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-3">
                Tổng quỹ — tất cả loại tiền
              </p>
              <div className="space-y-2.5">
                {allTabs.map((tab) => {
                  const total = tab.code === "LAK" ? lakComputed : (fxComputed[tab.code] ?? 0);
                  return (
                    <div key={tab.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none select-none">{tab.flag}</span>
                        <span className="text-xs font-mono font-semibold text-muted-foreground">{tab.code}</span>
                      </div>
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        total > 0 ? "text-foreground" : "text-muted-foreground/30",
                      )}>
                        {tab.symbol} {total.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
              {totalLakEquivalent > 0 && exchangeRates.length > 0 && (
                <div className="border-t border-primary/15 mt-3 pt-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Quy đổi tương đương</p>
                  <p className="text-xl font-black tabular-nums text-primary">
                    ₭ {totalLakEquivalent.toLocaleString("lo-LA")}
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 mt-1 leading-relaxed">
                    {exchangeRates
                      .filter((r) => foreignCurrencies.some((c) => c.code === r.currencyCode))
                      .map((r) => `1 ${r.currencyCode} ≈ ${r.effectiveRate.toLocaleString()} ₭`)
                      .join(" · ")}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Bottom bar — island ── */}
        <div className="rounded-xl bg-card border shrink-0 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Trạng thái:{" "}
              <span className="font-semibold text-foreground">Chưa mở ca</span>
              {allTabs.length > 0 && (
                <span className="ml-2">· {allTabs.length} loại tiền cần xác nhận quỹ đầu</span>
              )}
            </p>
            <div className="h-3.5 w-px bg-border" />
            {canAccessAdmin && (
              <Button
                variant="ghost" size="sm" type="button"
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs gap-1.5 text-muted-foreground h-7 px-2"
              >
                <DashboardOutlined />
                Quản trị
              </Button>
            )}
            <Button
              variant="ghost" size="sm" type="button"
              onClick={() => logout()} loading={isLoggingOut}
              className="text-xs gap-1.5 text-muted-foreground h-7 px-2 hover:text-destructive hover:bg-destructive/5"
            >
              <LogoutOutlined />
              Đăng xuất
            </Button>
          </div>
          <div className="flex items-center gap-2">
<Button type="submit" size="sm" loading={isPending} disabled={noCounter} className="gap-1.5">
              <CheckOutlined style={{ fontSize: 12 }} />
              Xác nhận mở ca
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
