"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { InputNumber } from "@/components/ui/antd-number-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLogout } from "@/hooks/useAuth";
import { useOpenShift } from "@/hooks/useSalesShift";
import { useCurrencies } from "@/hooks/useConfig";
import { useAuthStore } from "@/stores/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BankOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  FileOutlined,
  LogoutOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Input as AntInput } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  openingCashLak: z.string().min(1, "Vui lòng nhập tiền mặt đầu ca"),
  openingBankLak: z.string().min(1, "Vui lòng nhập số dư ngân hàng đầu ca"),
  amounts: z.record(z.string(), z.string().optional()),
  note: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── DenomGrid ────────────────────────────────────────────────────────────────

function DenomGrid({
  denominations, qty, symbol, disabled, onChange,
}: {
  denominations: number[];
  qty: Record<number, number>;
  symbol: string;
  disabled?: boolean;
  onChange: (denom: number, qty: number) => void;
}) {
  const pairs = denominations.reduce<[number, number | undefined][]>((acc, d, i) => {
    if (i % 2 === 0) acc.push([d, denominations[i + 1]]);
    return acc;
  }, []);

  return (
    <div className="space-y-1">
      {pairs.map(([left, right]) => (
        <div key={left} className="grid grid-cols-2 gap-1">
          {([left, right] as (number | undefined)[]).map((d, idx) => {
            if (d === undefined) return <div key={`e${idx}`} />;
            return (
              <div key={d} className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
                <span className="flex-1 text-[11px] tabular-nums text-muted-foreground truncate">
                  {d.toLocaleString()} {symbol}
                </span>
                <AntInput
                  size="small"
                  type="number"
                  min={0}
                  value={qty[d] ?? 0}
                  disabled={disabled}
                  onChange={(e) => onChange(d, parseInt(e.target.value) || 0)}
                  style={{ width: 48, textAlign: "right" }}
                />
              </div>
            );
          })}
        </div>
      ))}
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
  const foreignCurrencies = allCurrencies.filter((c) => c.isActive && c.code !== "LAK");
  const lakCurrency = allCurrencies.find((c) => c.code === "LAK");
  const lakDenoms = useMemo(() => (lakCurrency?.denominations ?? []).map((d) => d.value), [lakCurrency]);
  const lakHasDenoms = lakDenoms.length > 0;

  const [lakQty, setLakQty] = useState<Record<number, number>>({});
  const [fxQty, setFxQty] = useState<Record<string, Record<number, number>>>({});

  const lakComputed = useMemo(
    () => Object.entries(lakQty).reduce((sum, [v, q]) => sum + Number(v) * q, 0),
    [lakQty],
  );
  const fxComputed = useMemo(
    () => Object.fromEntries(
      foreignCurrencies.map((c) => [
        c.code,
        Object.entries(fxQty[c.code] ?? {}).reduce((sum, [v, q]) => sum + Number(v) * q, 0),
      ]),
    ),
    [fxQty, foreignCurrencies],
  );

  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { openingCashLak: "", openingBankLak: "0", amounts: {}, note: "" },
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

    const bank = parseInt(values.openingBankLak.replace(/[^0-9]/g, ""), 10) || 0;

    const lakDenominations = lakHasDenoms
      ? Object.entries(lakQty).filter(([, q]) => q > 0).map(([v, q]) => ({ value: Number(v), quantity: q }))
      : undefined;

    const foreignCurrencyBalances = foreignCurrencies
      .filter((c) => { const v = values.amounts[c.code]; return v && parseFloat(v) > 0; })
      .map((c) => {
        const denomEntries = Object.entries(fxQty[c.code] ?? {}).filter(([, q]) => q > 0);
        return {
          currency: c.code,
          openingAmount: parseFloat(values.amounts[c.code]!),
          denominations: denomEntries.length > 0
            ? denomEntries.map(([v, q]) => ({ value: Number(v), quantity: q }))
            : undefined,
        };
      });

    openShift({
      openingCashLak: cash,
      openingBankLak: bank,
      lakDenominations,
      foreignCurrencyBalances: foreignCurrencyBalances.length > 0 ? foreignCurrencyBalances : undefined,
      note: values.note || undefined,
    });
  };

  const noCounter = !user?.counterId;
  const canAccessAdmin = user?.role !== null;

  return (
    // Full viewport, no outer scroll — panels scroll independently
    <div className="h-screen flex flex-col bg-muted/40 overflow-hidden">

      {/* ── Header bar ── */}
      <div className="bg-primary shrink-0 px-6 py-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo_v%C3%A0ng-removebg-preview.png" alt="logo" className="h-8 w-8 object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] tracking-[0.22em] uppercase text-primary-foreground/50 font-light leading-none mb-0.5">Khamphuvong POS</p>
          <p className="text-sm font-semibold text-primary-foreground leading-none">Mở Ca Bán Hàng</p>
        </div>
        <div className="flex items-center gap-1.5 bg-primary-foreground/10 border border-primary-foreground/15 rounded-full px-3 py-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-300 animate-pulse" />
          <span className="text-[10px] text-primary-foreground/70 font-medium">Chưa mở ca</span>
        </div>
      </div>

      {/* ── 2-column body — fills remaining height ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0">

        {/* ── Left: controls (fixed width, scrollable) ── */}
        <div className="w-72 shrink-0 bg-card border-r flex flex-col overflow-y-auto">
          <div className="flex flex-col gap-3 p-4 flex-1">

            {/* User card */}
            {user && (
              <div className="flex items-center gap-2.5 rounded-xl border bg-muted/30 px-3 py-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <UserOutlined style={{ fontSize: 13, color: "var(--primary)" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{user.fullName}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {user.role}
                    {user.branchName && ` · ${user.branchName}`}
                    {user.counterName && ` · ${user.counterName}`}
                  </p>
                </div>
              </div>
            )}

            {/* Warning */}
            {noCounter && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <WarningOutlined style={{ fontSize: 12, color: "var(--destructive)", marginTop: 1.5, flexShrink: 0 }} />
                <p className="text-xs text-destructive leading-relaxed">
                  Chưa được phân công quầy. Liên hệ quản lý trước khi mở ca.
                </p>
              </div>
            )}

            {/* LAK */}
            <Field>
              <p className="text-xs font-semibold mb-1.5">
                Tiền mặt đầu ca (₭) <span className="text-destructive">*</span>
              </p>
              {currenciesLoading ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : lakHasDenoms ? (
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-muted/50 border-b px-2.5 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mệnh giá ₭</span>
                  </div>
                  <div className="p-2.5">
                    <DenomGrid
                      denominations={lakDenoms}
                      qty={lakQty}
                      symbol="₭"
                      disabled={noCounter}
                      onChange={(d, q) => setLakQty((prev) => ({ ...prev, [d]: q }))}
                    />
                  </div>
                  <div className="bg-primary/5 border-t px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tổng đầu ca</span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {lakComputed.toLocaleString("lo-LA")} ₭
                    </span>
                  </div>
                </div>
              ) : (
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
              )}
              {errors.openingCashLak && <FieldError>{errors.openingCashLak.message}</FieldError>}
            </Field>

            {/* Bank LAK */}
            <Field>
              <p className="text-xs font-semibold mb-1.5">
                Số dư ngân hàng đầu ca (₭) <span className="text-destructive">*</span>
              </p>
              <Controller
                control={control}
                name="openingBankLak"
                render={({ field }) => (
                  <InputNumber
                    value={field.value ? Number(field.value) : null}
                    onChange={(v) => field.onChange(String(v ?? "0"))}
                    placeholder="0"
                    min={0}
                    prefix={<BankOutlined style={{ fontSize: 12, color: "var(--muted-foreground)" }} />}
                    suffix={<span className="text-xs font-bold text-muted-foreground">₭</span>}
                    status={errors.openingBankLak ? "error" : undefined}
                    disabled={noCounter}
                    style={{ width: "100%" }}
                  />
                )}
              />
              {errors.openingBankLak && <FieldError>{errors.openingBankLak.message}</FieldError>}
            </Field>

            {/* Note */}
            <Field>
              <p className="text-xs font-semibold mb-1.5">
                <FileOutlined style={{ fontSize: 11, marginRight: 4, color: "var(--muted-foreground)" }} />
                Ghi chú
              </p>
              <Textarea
                placeholder="Ca sáng, nhận bàn giao từ ca trước..."
                rows={2}
                maxLength={500}
                disabled={noCounter}
                className="text-sm resize-none"
                {...register("note")}
              />
            </Field>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Submit + footer */}
            <div className="space-y-2">
              <Button type="submit" className="w-full" loading={isPending} disabled={noCounter}>
                <ClockCircleOutlined />
                Mở Ca Bán Hàng
              </Button>
              <div className="flex items-center justify-between">
                {canAccessAdmin ? (
                  <Button
                    variant="outline" size="sm" type="button"
                    onClick={() => router.push("/admin/dashboard")}
                    className="gap-1.5 text-xs"
                  >
                    <DashboardOutlined />
                    Quản Trị
                  </Button>
                ) : <span />}
                <Button
                  variant="ghost" size="sm" type="button"
                  onClick={() => logout()} loading={isLoggingOut}
                  className="text-muted-foreground text-xs gap-1 hover:text-destructive hover:bg-destructive/5"
                >
                  <LogoutOutlined />
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: FX currencies (scrollable) ── */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ngoại tệ đầu ca</p>
              <span className="text-[11px] text-muted-foreground/60 italic">Để trống nếu không có</span>
            </div>

            {currenciesLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : foreignCurrencies.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Chưa có ngoại tệ nào được kích hoạt
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {foreignCurrencies.map((c) => {
                  const hasDenoms = c.denominations.length > 0;
                  const computed = fxComputed[c.code] ?? 0;
                  return (
                    <div key={c.code} className="rounded-xl border bg-card overflow-hidden">
                      {/* Currency header */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                        <span className="text-base leading-none select-none">{c.flag ?? "💱"}</span>
                        <span className="font-mono font-bold text-sm text-primary">{c.code}</span>
                        <span className="text-xs text-muted-foreground flex-1 truncate">{c.name}</span>
                      </div>
                      {/* Amount input */}
                      <div className="px-3 pt-2.5 pb-2">
                        <Controller
                          control={control}
                          name={`amounts.${c.code}`}
                          render={({ field }) => (
                            <InputNumber
                              value={field.value ? Number(field.value) : null}
                              onChange={(v) => field.onChange(v != null ? String(v) : "")}
                              placeholder="0"
                              min={0}
                              suffix={
                                <span className="text-xs font-semibold text-muted-foreground select-none">{c.symbol}</span>
                              }
                              disabled={noCounter || (hasDenoms && computed > 0)}
                              style={{ width: "100%" }}
                            />
                          )}
                        />
                      </div>
                      {/* Denom grid */}
                      {hasDenoms && (
                        <div className="px-3 pb-2.5">
                          <DenomGrid
                            denominations={c.denominations.map((d) => d.value)}
                            qty={fxQty[c.code] ?? {}}
                            symbol={c.symbol}
                            disabled={noCounter}
                            onChange={(d, q) =>
                              setFxQty((prev) => ({
                                ...prev,
                                [c.code]: { ...(prev[c.code] ?? {}), [d]: q },
                              }))
                            }
                          />
                        </div>
                      )}
                      {/* Total */}
                      {computed > 0 && (
                        <div className="bg-primary/5 border-t px-3 py-1.5 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tổng</span>
                          <span className="text-xs font-bold text-primary tabular-nums">
                            {computed.toLocaleString()} {c.symbol}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
