"use client";

/**
 * OpenShiftModal — Full-page screen yêu cầu mở ca.
 *
 * KHÔNG dùng Dialog/Modal để tránh z-index conflict với dropdown portals.
 * ShiftGuard render component này THAY THẾ children (không phải overlay),
 * nên DOM của POS page hoàn toàn không tồn tại → không thể navigate đến Admin.
 *
 * Thoát duy nhất: mở ca hoặc đăng xuất.
 */

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useLogout } from "@/hooks/useAuth";
import { useOpenShift } from "@/hooks/useSalesShift";
import { useAuthStore } from "@/stores/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Calendar,
  Clock,
  LayoutDashboard,
  LogOut,
  StickyNote,
  User2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  openingCashLak: z.string().min(1, "Vui lòng nhập tiền mặt đầu ca"),
  openedAt: z.string().min(1, "Vui lòng chọn thời gian bắt đầu ca"),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

type FormValues = z.infer<typeof schema>;

function toLocalDatetimeInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function OpenShiftModal() {
  const { mutate: openShift, isPending } = useOpenShift();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const canAccessAdmin = user?.role !== null;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      openingCashLak: "",
      openedAt: toLocalDatetimeInput(),
      note: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const cash = parseInt(values.openingCashLak.replace(/[^0-9]/g, ""), 10);
    if (isNaN(cash) || cash < 0) return;
    openShift({
      openingCashLak: cash,
      openedAt: new Date(values.openedAt).toISOString(),
      note: values.note || undefined,
    });
  };

  const noCounter = !user?.counterId;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-muted/40 p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border shadow-2xl rounded-2xl overflow-hidden">
          {/* Header strip */}
          <div className="bg-primary px-7 py-5 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/logo_v%C3%A0ng-removebg-preview.png"
              alt="logo"
              className="h-9 w-9 object-contain shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.25em] uppercase text-primary-foreground/60 font-light">
                Khamphuvong POS
              </p>
              <p className="text-base font-semibold text-primary-foreground leading-tight">
                Mở Ca Bán Hàng
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-300 animate-pulse" />
              <span className="text-[10px] text-primary-foreground/80 font-medium">
                Chưa mở ca
              </span>
            </div>
          </div>

          <div className="px-7 py-6 space-y-5">
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <User2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.role}
                    {user.branchName && ` · ${user.branchName}`}
                    {user.counterName && ` · ${user.counterName}`}
                  </p>
                </div>
              </div>
            )}

            {/* Warning khi chưa có quầy */}
            {noCounter && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">
                  Tài khoản chưa được phân công quầy. Vui lòng liên hệ quản lý
                  để được cấu hình trước khi mở ca.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Tiền mặt đầu ca */}
              <Field>
                <FieldLabel>
                  Tiền mặt đầu ca (₭)
                  <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="openingCashLak"
                  render={({ field }) => (
                    <NumberInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="0"
                      prefix={
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                      suffix={
                        <span className="text-xs font-semibold text-muted-foreground">
                          ₭
                        </span>
                      }
                      status={errors.openingCashLak ? "error" : undefined}
                      disabled={noCounter}
                    />
                  )}
                />
                {errors.openingCashLak && (
                  <FieldError>{errors.openingCashLak.message}</FieldError>
                )}
              </Field>

              {/* Thời gian bắt đầu */}
              <Field>
                <FieldLabel>
                  Thời gian bắt đầu ca
                  <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <Input
                  type="datetime-local"
                  prefix={
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  status={errors.openedAt ? "error" : undefined}
                  disabled={noCounter}
                  {...register("openedAt")}
                />
                {errors.openedAt && (
                  <FieldError>{errors.openedAt.message}</FieldError>
                )}
              </Field>

              {/* Ghi chú */}
              <Field>
                <FieldLabel>
                  <StickyNote className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                  Ghi chú
                </FieldLabel>
                <Textarea
                  placeholder="Ca sáng, nhận bàn giao từ ca trước..."
                  rows={2}
                  maxLength={500}
                  disabled={noCounter}
                  {...register("note")}
                />
                {errors.note && <FieldError>{errors.note.message}</FieldError>}
              </Field>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isPending}
                disabled={noCounter}
              >
                <Clock className="h-4 w-4" />
                Mở Ca Bán Hàng
              </Button>
            </form>

            <div className="pt-2 pb-1 flex flex-col items-center gap-1">
              <Separator className="mb-4" />
              {canAccessAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => router.push("/admin/dashboard")}
                  className="w-full gap-1.5 text-xs mb-1"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Vào Trang Quản Trị
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => logout()}
                loading={isLoggingOut}
                className="text-muted-foreground text-xs gap-1.5 hover:text-destructive hover:bg-destructive/5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất — dùng tài khoản khác
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
          FoxAI POS · Khamphuvong Jewelry
        </p>
      </div>
    </div>
  );
}
