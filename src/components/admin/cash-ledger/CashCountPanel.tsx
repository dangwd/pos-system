"use client";

import { cashLedgerRepository } from "@/lib/repositories/cash-ledger.repository";
import { useAuthStore } from "@/stores/auth.store";
import type { CashCountItem, CashCurrency } from "@/types/cash-ledger";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input as AntInput } from "antd";
import { ReadOutlined, WarningOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useToast } from "@/lib/toast";

const LAK_DENOMS = [100000, 50000, 20000, 10000, 5000, 2000];
const THB_DENOMS = [1000, 500];
const USD_DENOMS = [100, 50];

const DEFAULT_ITEMS: CashCountItem[] = [
  ...LAK_DENOMS.map((d) => ({ currency: "LAK" as CashCurrency, denomination: d, quantity: 0 })),
  ...THB_DENOMS.map((d) => ({ currency: "THB" as CashCurrency, denomination: d, quantity: 0 })),
  ...USD_DENOMS.map((d) => ({ currency: "USD" as CashCurrency, denomination: d, quantity: 0 })),
];

function formatDenom(denom: number, currency: CashCurrency) {
  const num = denom.toLocaleString("lo-LA");
  if (currency === "LAK") return `${num} ₭`;
  if (currency === "THB") return `${num} ฿`;
  return `${denom} $`;
}

function formatLak(n: number) {
  return n.toLocaleString("lo-LA") + " ₭ (Kip)";
}

interface DenomRowProps {
  left: CashCountItem;
  right?: CashCountItem;
  disabled: boolean;
  onChange: (currency: CashCurrency, denom: number, qty: number) => void;
}

function DenomRow({ left, right, disabled, onChange }: DenomRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
      {[left, right].map((item) => {
        if (!item) return <div key="empty" />;
        return (
          <div key={`${item.currency}-${item.denomination}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#374151", minWidth: 56, flexShrink: 0 }}>
              {formatDenom(item.denomination, item.currency)}
            </span>
            <AntInput
              size="small"
              type="number"
              min={0}
              value={item.quantity}
              disabled={disabled}
              onChange={(e) =>
                onChange(item.currency, item.denomination, parseInt(e.target.value) || 0)
              }
              style={{ width: 64, textAlign: "right" }}
            />
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  branchId: string;
  date: string;
}

export function CashCountPanel({ branchId, date }: Props) {
  const { user } = useAuthStore();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: daily } = useQuery({
    queryKey: ["cash-ledger", "daily", branchId, date],
    queryFn: () => cashLedgerRepository.getDaily({ branchId, date }),
    staleTime: 30_000,
    enabled: !!branchId,
  });
  const expectedAmountLak = daily?.closingBalanceLak ?? 0;

  const [items, setItems] = useState<CashCountItem[]>(DEFAULT_ITEMS);
  const [countedByName, setCountedByName] = useState(user?.fullName ?? "");

  const { data: sheet } = useQuery({
    queryKey: ["cash-count", branchId, date],
    queryFn: () => cashLedgerRepository.getCashCount({ branchId, date }),
    enabled: !!branchId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (sheet?.items && sheet.items.length > 0) {
      const merged = DEFAULT_ITEMS.map((def) => {
        const found = sheet.items.find(
          (i) => i.currency === def.currency && i.denomination === def.denomination,
        );
        return found ?? def;
      });
      setItems(merged);
    }
    if (sheet?.countedByName) setCountedByName(sheet.countedByName);
  }, [sheet]);

  const setQty = (currency: CashCurrency, denomination: number, qty: number) => {
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
      cashLedgerRepository.saveCashCount({ branchId, date, countedByName, items }),
    onSuccess: () => {
      toast.success("Đã lưu bảng kê đếm tiền");
      queryClient.invalidateQueries({ queryKey: ["cash-count", branchId, date] });
    },
    onError: () => toast.error("Lưu bảng kê thất bại"),
  });

  const lakItems = items.filter((i) => i.currency === "LAK");
  const thbItems = items.filter((i) => i.currency === "THB");
  const usdItems = items.filter((i) => i.currency === "USD");

  const actualAmountLak = lakItems.reduce((sum, i) => sum + i.denomination * i.quantity, 0);
  const diff = actualAmountLak - expectedAmountLak;
  const isFinalized = sheet?.isFinalized ?? false;

  const pairRows = <T,>(arr: T[]): [T, T | undefined][] =>
    arr.reduce<[T, T | undefined][]>((acc, item, i) => {
      if (i % 2 === 0) acc.push([item, arr[i + 1]]);
      return acc;
    }, []);

  const sectionLabel = (label: string) => (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#9ca3af",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 6,
        marginTop: 10,
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #f0f0f0",
          fontWeight: 700,
          fontSize: 14,
          color: "#111827",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <ReadOutlined style={{ fontSize: 16, color: "#f59e0b" }} />
        Kiểm kê quỹ cuối khóa sổ
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
        {/* LAK */}
        {sectionLabel("Mệnh giá LAK (Kip)")}
        {pairRows(lakItems).map(([l, r]) => (
          <DenomRow
            key={`${l.denomination}`}
            left={l}
            right={r}
            disabled={isFinalized}
            onChange={setQty}
          />
        ))}

        {/* THB */}
        {sectionLabel("Mệnh giá THB (Baht Thái)")}
        {pairRows(thbItems).map(([l, r]) => (
          <DenomRow
            key={`${l.denomination}`}
            left={l}
            right={r}
            disabled={isFinalized}
            onChange={setQty}
          />
        ))}

        {/* USD */}
        {sectionLabel("Mệnh giá USD ($)")}
        {pairRows(usdItems).map(([l, r]) => (
          <DenomRow
            key={`${l.denomination}`}
            left={l}
            right={r}
            disabled={isFinalized}
            onChange={setQty}
          />
        ))}

        {/* Comparison */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            background: "#f9fafb",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, marginBottom: 8 }}
          >
            TIỀN TRÌNH ĐỐI CHIẾU SỐ THỰC TẾ:
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Dự kiến quỹ sắc:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: expectedAmountLak < 0 ? "#DC2626" : "#111827" }}>
              {formatLak(expectedAmountLak)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Kiểm cơ cấu thực tế:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
              {formatLak(actualAmountLak)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 8px",
              borderRadius: 6,
              background: diff === 0 ? "#f0fdf4" : "#fffbeb",
              border: `1px solid ${diff === 0 ? "#bbf7d0" : "#fde68a"}`,
            }}
          >
            {diff !== 0 && (
              <WarningOutlined style={{ fontSize: 14, color: "#f59e0b", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 12, color: "#374151" }}>Trạng thái:</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: diff === 0 ? "#16a34a" : "#d97706",
                marginLeft: "auto",
              }}
            >
              {diff === 0
                ? "Cân bằng"
                : `${diff > 0 ? "Lệch thừa" : "Lệch thiếu"} (${diff > 0 ? "+" : ""}${diff.toLocaleString("lo-LA")} Kip)`}
            </span>
          </div>
        </div>

        {/* Counted by */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>
            Người thực hiện kiểm đếm:
          </div>
          <AntInput
            size="small"
            value={countedByName}
            disabled={isFinalized}
            onChange={(e) => setCountedByName(e.target.value)}
            placeholder="Nhập tên người kiểm đếm"
          />
        </div>

        {isFinalized && sheet?.handoverCode && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              fontSize: 12,
              color: "#16a34a",
            }}
          >
            ✓ Đã chốt bàn giao: <strong>{sheet.handoverCode}</strong>
          </div>
        )}
      </div>

      {/* Footer button */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
        <button
          disabled={isFinalized || isPending || !countedByName.trim()}
          onClick={() => save()}
          style={{
            width: "100%",
            padding: "10px 0",
            background: isFinalized ? "#d1d5db" : isPending ? "#fbbf24" : "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: isFinalized || isPending ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.15s",
          }}
        >
          <ReadOutlined style={{ fontSize: 16 }} />
          {isPending ? "Đang lưu..." : isFinalized ? "Đã chốt bàn giao" : "Ghi phiếu bàn giao quỹ"}
        </button>
      </div>
    </div>
  );
}
