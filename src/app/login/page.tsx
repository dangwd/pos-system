"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen flex bg-background">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-115 xl:w-130 flex-col items-center justify-between py-12 px-10 relative overflow-hidden shrink-0 bg-primary">
        {/* Soft glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 rounded-full blur-[100px] bg-primary-foreground/5 pointer-events-none" />

        {/* Top label */}
        <div className="relative z-10 self-start">
          <span className="text-[10px] tracking-[0.3em] text-primary-foreground/50 uppercase font-light">
            FoxAI POS
          </span>
        </div>

        {/* Center */}
        <div className="relative z-10 flex flex-col items-center gap-7 text-center">
          {/* Concentric rings echoing the ring logo */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-65 h-65 rounded-full border border-primary-foreground/10" />
            <div className="absolute w-49 h-49 rounded-full border border-primary-foreground/15" />
            <div className="absolute w-33 h-33 rounded-full border border-primary-foreground/20" />

            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-lg bg-primary-foreground/10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/logo-pv-nobg.png"
                alt="Khamphouvong PV Logo"
                width={96}
                height={96}
                className="relative drop-shadow-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-[0.18em] uppercase text-primary-foreground">
              Khamphouvong
            </h2>
            <p className="text-[11px] tracking-[0.35em] text-primary-foreground/55 uppercase font-light">
              Jewelry · ເຄື່ອງທອງ · Vàng Bạc
            </p>
          </div>

          <div className="w-16 h-px bg-primary-foreground/25" />

          <p className="text-primary-foreground/40 text-[11px] tracking-[0.18em] leading-relaxed">
            ຄຸ້ມຄອງຮ້ານຄ້າ · ຕິດຕາມສິນຄ້າ · ລາຍງານ
          </p>
        </div>

        <div className="relative z-10 text-primary-foreground/30 text-[10px] tracking-[0.3em] uppercase">
          Vientiane · Laos PDR
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/logo-pv-nobg.png"
              alt="PV"
              width={26}
              height={26}
            />
            <span className="font-semibold text-sm text-primary">
              Khamphouvong
            </span>
          </div>
          <div className="ml-auto">
            <LocaleSwitcher />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="w-8 h-0.5 bg-primary mb-8 rounded-full" />

            <div className="space-y-1.5 mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

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
                    className="h-11"
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
                  <InputGroup className="h-11">
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="current-password"
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
                  className="w-full h-11 font-semibold mt-2"
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

        <div className="px-6 py-4 text-center text-[11px] text-muted-foreground border-t border-border">
          FoxAI POS · Khamphouvong Jewelry &copy; 2026
        </div>
      </div>
    </div>
  );
}
