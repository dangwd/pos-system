"use client";

/**
 * OpenShiftModal — Full-page screen yêu cầu mở ca.
 *
 * Ngoại tệ: load từ GET /api/currencies → isActive=true, bỏ LAK.
 * openedAt KHÔNG gửi lên server — server tự gán DateTime.UtcNow.
 */

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputNumber } from "@/components/ui/antd-number-input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLogout } from "@/hooks/useAuth";
import { useOpenShift } from "@/hooks/useSalesShift";
import { useCurrencies } from "@/hooks/useConfig";
import { useAuthStore } from "@/stores/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClockCircleOutlined,
  DashboardOutlined,
  FileOutlined,
  LogoutOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  openingCashLak: z.string().min(1, "Vui lòng nhập tiền mặt đầu ca"),
  amounts: z.record(z.string(), z.string().optional()),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

type FormValues = z.infer<typeof schema>;

export function OpenShiftModal() {
  const { mutate: openShift, isPending } = useOpenShift();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data: allCurrencies = [], isLoading: currenciesLoading } = useCurrencies();
  const foreignCurrencies = allCurrencies.filter((c) => c.isActive && c.code !== "LAK");

  const { control, register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { openingCashLak: "", amounts: {}, note: "" },
  });

  const onSubmit = (values: FormValues) => {
    const cash = parseInt(values.openingCashLak.replace(/[^0-9]/g, ""), 10);
    if (isNaN(cash) || cash < 0) return;

    const foreignCurrencyBalances = foreignCurrencies
      .filter((c) => { const v = values.amounts[c.code]; return v && parseFloat(v) > 0; })
      .map((c) => ({ currency: c.code, openingAmount: parseFloat(values.amounts[c.code]!) }));

    openShift({
      openingCashLak: cash,
      foreignCurrencyBalances: foreignCurrencyBalances.length > 0 ? foreignCurrencyBalances : undefined,
      note: values.note || undefined,
    });
  };

  const noCounter = !user?.counterId;
  const canAccessAdmin = user?.role !== null;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-muted/40 p-6 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <div className="bg-card border shadow-2xl rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-primary px-8 py-5 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo_v%C3%A0ng-removebg-preview.png" alt="logo" className="h-9 w-9 object-contain shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] tracking-[0.22em] uppercase text-primary-foreground/55 font-light">
                Khamphuvong POS
              </p>
              <p className="text-base font-semibold text-primary-foreground leading-tight">
                Mở Ca Bán Hàng
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-primary-foreground/10 border border-primary-foreground/15 rounded-full px-3 py-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-300 animate-pulse" />
              <span className="text-[10px] text-primary-foreground/75 font-medium">Chưa mở ca</span>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5">
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <UserOutlined className="text-primary" style={{ fontSize: 15 }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-tight truncate">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user.role}
                    {user.branchName && ` · ${user.branchName}`}
                    {user.counterName && ` · ${user.counterName}`}
                  </p>
                </div>
              </div>
            )}

            {/* Warning */}
            {noCounter && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <WarningOutlined className="text-destructive shrink-0 mt-0.5" style={{ fontSize: 14 }} />
                <p className="text-xs text-destructive leading-relaxed">
                  Tài khoản chưa được phân công quầy. Vui lòng liên hệ quản lý trước khi mở ca.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Tiền mặt LAK */}
              <Field>
                <FieldLabel>
                  Tiền mặt đầu ca (₭)<span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="openingCashLak"
                  render={({ field }) => (
                    <InputNumber
                      value={field.value ? Number(field.value) : null}
                      onChange={(v) => field.onChange(String(v ?? ""))}
                      placeholder="0"
                      min={0}
                      prefix={<WalletOutlined style={{ fontSize: 13, color: "var(--muted-foreground)" }} />}
                      suffix={<span className="text-xs font-bold text-muted-foreground">₭</span>}
                      status={errors.openingCashLak ? "error" : undefined}
                      disabled={noCounter}
                      style={{ width: "100%" }}
                    />
                  )}
                />
                {errors.openingCashLak && <FieldError>{errors.openingCashLak.message}</FieldError>}
              </Field>

              {/* Bảng ngoại tệ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel className="mb-0">Ngoại tệ đầu ca</FieldLabel>
                  <span className="text-[11px] text-muted-foreground italic">Để trống nếu không có</span>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[36px_80px_1fr_160px] bg-muted/50 border-b">
                    <div className="px-3 py-2" />
                    <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Mã</div>
                    <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tên tiền tệ</div>
                    <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right">Số dư đầu ca</div>
                  </div>

                  {/* Table body */}
                  {currenciesLoading ? (
                    <div className="divide-y divide-border/60">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-cols-[36px_80px_1fr_160px] px-0 py-3 items-center">
                          <div className="px-3"><Skeleton className="h-4 w-4 rounded" /></div>
                          <div className="px-3"><Skeleton className="h-3.5 w-10" /></div>
                          <div className="px-3"><Skeleton className="h-3.5 w-32" /></div>
                          <div className="px-3"><Skeleton className="h-8 w-full" /></div>
                        </div>
                      ))}
                    </div>
                  ) : foreignCurrencies.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Chưa có ngoại tệ nào được kích hoạt
                    </div>
                  ) : (
                    <div className="overflow-y-auto max-h-60 divide-y divide-border/50 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                      {foreignCurrencies.map((c) => (
                        <div key={c.code} className="grid grid-cols-[36px_80px_1fr_160px] items-center py-1.5 hover:bg-muted/30 transition-colors">
                          <div className="px-3 text-center text-base leading-none select-none">
                            {c.flag ?? "💱"}
                          </div>
                          <div className="px-3 font-mono font-bold text-sm">{c.code}</div>
                          <div className="px-3 text-sm text-muted-foreground truncate">{c.name}</div>
                          <div className="px-3">
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
                                    <span className="text-xs font-semibold text-muted-foreground select-none">
                                      {c.symbol}
                                    </span>
                                  }
                                  disabled={noCounter}
                                  style={{ width: "100%" }}
                                />
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              <Field>
                <FieldLabel>
                  <FileOutlined className="mr-1 text-muted-foreground" style={{ fontSize: 12 }} />
                  Ghi chú
                </FieldLabel>
                <Textarea
                  placeholder="Ca sáng, nhận bàn giao từ ca trước..."
                  rows={2}
                  maxLength={500}
                  disabled={noCounter}
                  className="text-sm resize-none"
                  {...register("note")}
                />
                {errors.note && <FieldError>{errors.note.message}</FieldError>}
              </Field>

              <Button type="submit" className="w-full" size="lg" loading={isPending} disabled={noCounter}>
                <ClockCircleOutlined />
                Mở Ca Bán Hàng
              </Button>
            </form>

            {/* Footer */}
            <div>
              <Separator className="mb-3" />
              <div className="flex items-center justify-between gap-2">
                {canAccessAdmin ? (
                  <Button variant="outline" size="sm" type="button" onClick={() => router.push("/admin/dashboard")} className="gap-1.5 text-xs">
                    <DashboardOutlined />
                    Trang Quản Trị
                  </Button>
                ) : <span />}
                <Button
                  variant="ghost" size="sm" type="button"
                  onClick={() => logout()} loading={isLoggingOut}
                  className="text-muted-foreground text-xs gap-1.5 hover:text-destructive hover:bg-destructive/5"
                >
                  <LogoutOutlined />
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-3">
          FoxAI POS · Khamphuvong Jewelry
        </p>
      </div>
    </div>
  );
}
