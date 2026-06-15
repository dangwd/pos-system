"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useLogin } from "@/hooks/useAuth";

type LoginForm = { username: string; password: string };

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const { mutate: login, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const schema = z.object({
    username: z.string().min(1, t("usernameRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-105 xl:w-120 flex-col justify-between p-10 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
            <Monitor className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">FoxAI POS</span>
        </div>

        <div className="space-y-4">
          <div className="text-4xl font-bold leading-tight">
            Khamphouvong
            <br />
            Jewelry
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
            ຄຸ້ມຄອງຮ້ານຄ້າ · ຕິດຕາມສິນຄ້າ · ລາຍງານການຂາຍ
          </p>
        </div>

        <div className="text-xs text-primary-foreground/40 font-mono">
          Vientiane, Laos PDR
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2 lg:hidden">
            <Monitor className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">FoxAI POS</span>
          </div>
          <div className="ml-auto">
            <LocaleSwitcher />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">
            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit((data) => login(data))}>
              <div className="space-y-5">
                <Field>
                  <FieldLabel htmlFor="username">
                    {t("usernameLabel")}
                  </FieldLabel>
                  <Input
                    id="username"
                    placeholder={t("usernamePlaceholder")}
                    autoComplete="username"
                    autoFocus
                    className="h-10"
                    {...register("username")}
                  />
                  {errors.username && (
                    <FieldError>{errors.username.message}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">
                    {t("passwordLabel")}
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="current-password"
                      className="h-10"
                      {...register("password")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.password && (
                    <FieldError>{errors.password.message}</FieldError>
                  )}
                </Field>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-10 font-semibold"
                >
                  {isPending ? (
                    <>
                      <Spinner className="mr-2" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("submit")
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center text-xs text-muted-foreground border-t">
          FoxAI POS · Khamphouvong Jewelry &copy; 2026
        </div>
      </div>
    </div>
  );
}
