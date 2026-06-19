"use client";

import { useTranslations } from "next-intl";
import { cashLedgerRepository } from "@/lib/repositories/cash-ledger.repository";
import { useCurrencies } from "@/hooks/useConfig";
import { useAuthStore } from "@/stores/auth.store";
import type { CashCountItem } from "@/types/cash-ledger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input as AntInput, Skeleton } from "antd";
import { ReadOutlined, WarningOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/lib/toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDenom(denom: number, symbol: string) {
  return `${denom.toLocaleString("lo-LA")} ${symbol}`;
}

function formatLak(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

// ─── DenomRow ─────────────────────────────────────────────────────────────────

interface DenomRowProps {
  left: CashCountItem & { symbol: string };
  right?: CashCountItem & { symbol: string };
  disabled: boolean;
  onChange: (currency: string, denom: number, qty: number) => void;
}

function DenomRow({ left, right, disabled, onChange }: DenomRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
      {([left, right] as const).map((item) => {
        if (!item) return <div key="empty" />;
        return (
          <div key={`${item.currency}-${item.denomination}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#374151", minWidth: 72, flexShrink: 0 }}>
              {formatDenom(item.denomination, item.symbol)}
            </span>
            <AntInput
              size="small"
              type="number"
              min={0}
              value={item.quantity}
              disabled={disabled}
              onChange={(e) => onChange(item.currency, item.denomination, parseInt(e.target.value) || 0)}
              style={{ width: 60, textAlign: "right" }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── CashCountPanel ───────────────────────────────────────────────────────────

interface Props {
  branchId: string;
  date: string;
}

export function CashCountPanel({ branchId, date }: Props) {
  const t = useTranslations("admin.cashCountPanel");
  const { user } = useAuthStore();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: allCurrencies = [], isLoading: currenciesLoading } = useCurrencies();

  const defaultItems = useMemo<(CashCountItem & { symbol: string })[]>(() => {
    return allCurrencies
      .filter((c) => c.isActive && c.denominations.length > 0)
      .flatMap((c) =>
        c.denominations.map((d) => ({
          currency: c.code,
          denomination: d.value,
          quantity: 0,
          symbol: c.symbol,
        }))
      );
  }, [allCurrencies]);

  const { data: daily } = useQuery({
    queryKey: ["cash-ledger", "daily", branchId, date],
    queryFn: () => cashLedgerRepository.getDaily({ branchId, date }),
    staleTime: 30_000,
    enabled: !!branchId,
  });
  const expectedAmountLak = daily?.closingBalanceLak ?? 0;

  const [items, setItems] = useState<(CashCountItem & { symbol: string })[]>([]);
  const [countedByName, setCountedByName] = useState(user?.fullName ?? "");

  useEffect(() => {
    if (defaultItems.length > 0) {
      setItems((prev) => {
        if (prev.length === 0) return defaultItems;
        return defaultItems.map((def) => {
          const found = prev.find((i) => i.currency === def.currency && i.denomination === def.denomination);
          return found ? { ...def, quantity: found.quantity } : def;
        });
      });
    }
  }, [defaultItems]);

  const { data: sheet } = useQuery({
    queryKey: ["cash-count", branchId, date],
    queryFn: () => cashLedgerRepository.getCashCount({ branchId, date }),
    enabled: !!branchId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!sheet?.items?.length) return;
    setItems((prev) =>
      prev.map((def) => {
        const saved = sheet.items.find(
          (i) => i.currency === def.currency && i.denomination === def.denomination,
        );
        return saved ? { ...def, quantity: saved.quantity } : def;
      }),
    );
    if (sheet.countedByName) setCountedByName(sheet.countedByName);
  }, [sheet]);

  const setQty = (currency: string, denomination: number, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.currency === currency && i.denomination === denomination
          ? { ...i, quantity: Math.max(0, qty) }
          : i,
      ),
    );
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      cashLedgerRepository.saveCashCount({
        branchId, date, countedByName,
        items: items.map(({ currency, denomination, quantity }) => ({ currency, denomination, quantity })),
      }),
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["cash-count", branchId, date] });
    },
    onError: () => toast.error(t("saveError")),
  });

  const lakItems = items.filter((i) => i.currency === "LAK");
  const actualAmountLak = lakItems.reduce((sum, i) => sum + i.denomination * i.quantity, 0);
  const diff = actualAmountLak - expectedAmountLak;
  const isFinalized = sheet?.isFinalized ?? false;

  const currencyGroups = useMemo(() => {
    const groups: { code: string; symbol: string; label: string; items: (CashCountItem & { symbol: string })[] }[] = [];
    for (const c of allCurrencies.filter((c) => c.isActive && c.denominations.length > 0)) {
      const currItems = items.filter((i) => i.currency === c.code);
      if (currItems.length > 0) groups.push({ code: c.code, symbol: c.symbol, label: `${c.name} (${c.code})`, items: currItems });
    }
    return groups;
  }, [allCurrencies, items]);

  const pairRows = <T,>(arr: T[]): [T, T | undefined][] =>
    arr.reduce<[T, T | undefined][]>((acc, item, i) => {
      if (i % 2 === 0) acc.push([item, arr[i + 1]]);
      return acc;
    }, []);

  const sectionLabel = (label: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 10 }}>
      {label}
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", fontWeight: 700, fontSize: 14, color: "#111827", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <ReadOutlined style={{ fontSize: 16, color: "#f59e0b" }} />
        {t("title")}
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
        {currenciesLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton.Input key={i} active size="small" style={{ width: "100%", height: 28 }} />)}
          </div>
        ) : currencyGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 12 }}>
            {t("noDenominations")}<br />
            {t("configHint")}
          </div>
        ) : (
          <>
            {currencyGroups.map((g) => (
              <div key={g.code}>
                {sectionLabel(t("denominationLabel", { label: g.label }))}
                {pairRows(g.items).map(([l, r]) => (
                  <DenomRow
                    key={`${l.denomination}`}
                    left={l}
                    right={r}
                    disabled={isFinalized}
                    onChange={setQty}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {/* Comparison — only for LAK */}
        {!currenciesLoading && lakItems.length > 0 && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, marginBottom: 8 }}>
              {t("reconcileTitle")}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{t("expectedLabel")}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: expectedAmountLak < 0 ? "#DC2626" : "#111827" }}>
                {formatLak(expectedAmountLak)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{t("actualLabel")}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{formatLak(actualAmountLak)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 6, background: diff === 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${diff === 0 ? "#bbf7d0" : "#fde68a"}` }}>
              {diff !== 0 && <WarningOutlined style={{ fontSize: 14, color: "#f59e0b", flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: "#374151" }}>{t("statusLabel")}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: diff === 0 ? "#16a34a" : "#d97706", marginLeft: "auto" }}>
                {diff === 0
                  ? t("balanced")
                  : `${diff > 0 ? t("overage") : t("shortage")} (${t("diffText", { sign: diff > 0 ? "+" : "", diff: Math.abs(diff).toLocaleString("lo-LA") })})`}
              </span>
            </div>
          </div>
        )}

        {/* Counted by */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>{t("countedByLabel")}</div>
          <AntInput size="small" value={countedByName} disabled={isFinalized} onChange={(e) => setCountedByName(e.target.value)} placeholder={t("countedByPlaceholder")} />
        </div>

        {isFinalized && sheet?.handoverCode && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, color: "#16a34a" }}>
            {t("alreadyHandedOver", { code: sheet.handoverCode })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
        <button
          disabled={isFinalized || isPending || !countedByName.trim()}
          onClick={() => save()}
          style={{ width: "100%", padding: "10px 0", background: isFinalized ? "#d1d5db" : isPending ? "#fbbf24" : "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: isFinalized || isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.15s" }}
        >
          <ReadOutlined style={{ fontSize: 16 }} />
          {isPending ? t("saving") : isFinalized ? t("finalizedButton") : t("finalizeButton")}
        </button>
      </div>
    </div>
  );
}
