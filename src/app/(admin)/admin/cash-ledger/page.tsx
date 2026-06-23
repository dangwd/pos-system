"use client";

import { CashLedgerExpandedRow } from "@/components/admin/cash-ledger/CashLedgerExpandedRow";
import { ForbiddenPage } from "@/components/shared/ForbiddenPage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBranches, useCounters } from "@/hooks/useBranches";
import { usePermission } from "@/hooks/usePermission";
import { useCurrencies } from "@/hooks/useConfig";
import { cashLedgerRepository } from "@/lib/repositories/cash-ledger.repository";
import { useAuthStore } from "@/stores/auth.store";
import type { ActivityItem, CashCurrency } from "@/types/cash-ledger";
import type { Currency } from "@/types/config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button as AntBtn,
  Input as AntInput,
  Select as AntSelect,
  Card,
  DatePicker,
  Form,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table/interface";
import { InputNumber } from "@/components/ui/antd-number-input";
import dayjs from "dayjs";
import {
  CalculatorOutlined,
  FallOutlined,
  FileExcelOutlined,
  PlusOutlined,
  RiseOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { StatCard } from "@/components/admin/shared/StatCard";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/lib/toast";

const PAGE_SIZE = 20;
const PAGE_STYLE: React.CSSProperties = { padding: "24px 24px 32px" };
const FILTER_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #f0f0f0",
  background: "#fafafa",
};

function getCurrencySymbol(code: string): string {
  const map: Record<string, string> = {
    LAK: '₭', USD: '$', THB: '฿', CNY: '¥', KRW: '₩', EUR: '€', JPY: '¥', GBP: '£',
  }
  return map[code] ?? code
}

function formatKip(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

// ─── Add entry dialog ─────────────────────────────────────────────────────────
function AddEntryDialog({
  branchId,
  open,
  defaultDirection,
  currencies,
  onClose,
}: {
  branchId: string;
  open: boolean;
  defaultDirection: "IN" | "OUT";
  currencies: Currency[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.cashLedger");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    description: "",
    direction: defaultDirection as "IN" | "OUT",
    method: "CASH" as "CASH" | "BANK",
    currency: "LAK" as CashCurrency,
    originalAmount: "",
    exchangeRate: "1",
  });

  const { mutate: addEntry, isPending } = useMutation({
    mutationFn: () =>
      cashLedgerRepository.addManualEntry({
        branchId,
        description: form.description,
        direction: form.direction,
        method: form.method,
        currency: form.currency,
        originalAmount: Number(form.originalAmount),
        exchangeRate: Number(form.exchangeRate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-ledger"] });
      onClose();
    },
    onError: () => toast.error("Failed to add entry"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-xl"
        title={t("createExpense")}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => addEntry()}
              disabled={isPending || !form.description || !form.originalAmount}
            >
              {isPending ? <Spinner /> : t("addEntry")}
            </Button>
          </DialogFooter>
        }
      >
        <Form layout="vertical" className="py-2">
          <Form.Item label={t("columns.description")}>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label={t("filterVoucherType")}>
              <Select
                value={form.direction}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, direction: v as "IN" | "OUT" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">{t("filterIncome")}</SelectItem>
                  <SelectItem value="OUT">{t("filterExpense")}</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
            <Form.Item label={t("columns.method")}>
              <Select
                value={form.method}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, method: v as "CASH" | "BANK" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("method.CASH")}</SelectItem>
                  <SelectItem value="BANK">{t("method.BANK")}</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label={t("columns.amount")}>
              <InputNumber
                min={0}
                value={form.originalAmount ? Number(form.originalAmount) : null}
                onChange={(v) => setForm((p) => ({ ...p, originalAmount: String(v ?? '') }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label={t("columns.currency")}
              style={{ marginBottom: 0 }}
            >
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, currency: v as CashCurrency }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies
                    .filter((c) => c.isActive)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag ? `${c.flag} ` : ""}{c.code}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Form.Item>
          </div>
          {form.currency !== "LAK" && (
            <Form.Item
              label={t("columns.exchangeRate")}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={1}
                value={form.exchangeRate ? Number(form.exchangeRate) : null}
                onChange={(v) => setForm((p) => ({ ...p, exchangeRate: String(v ?? '') }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────
function SummaryStrip({
  openingBalance,
  totalIn,
  totalOut,
  closingBalance,
  symbol,
}: {
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  symbol: string;
}) {
  const t = useTranslations("admin.cashLedger");
  const fmt = (n: number) => n.toLocaleString("lo-LA") + " " + symbol;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <StatCard
        label={t("summaryOpening")}
        value={fmt(openingBalance)}
        icon={<WalletOutlined />}
        iconColor="#3b82f6"
        sub={t("summaryOpeningSub")}
      />
      <StatCard
        label={t("totalIn")}
        value={fmt(totalIn)}
        icon={<RiseOutlined />}
        iconColor="#22c55e"
        sub={t("summaryTotalInSub")}
      />
      <StatCard
        label={t("totalOut")}
        value={fmt(totalOut)}
        icon={<FallOutlined />}
        iconColor="#ef4444"
        sub={t("summaryTotalOutSub")}
      />
      <StatCard
        label={t("summaryClosing")}
        value={fmt(closingBalance)}
        icon={<CalculatorOutlined />}
        iconColor="#6366f1"
        highlight
        sub={t("summaryClosingSub")}
      />
    </div>
  );
}

// ─── Currency tabs ────────────────────────────────────────────────────────────
function CurrencyTabs({
  currencies,
  selected,
  onChange,
}: {
  currencies: Currency[];
  selected: string | undefined;
  onChange: (code: string | undefined) => void;
}) {
  const tabs = currencies
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ code: c.code, label: c.code, flag: c.flag }));

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {tabs.map((tab) => {
        const active = selected === tab.code;
        return (
          <button
            key={tab.code ?? "__all__"}
            onClick={() => onChange(tab.code)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 16px",
              borderRadius: 20,
              border: `1.5px solid ${active ? "#4f46e5" : "#e5e7eb"}`,
              background: active ? "#eef2ff" : "#fff",
              color: active ? "#4338ca" : "#374151",
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: active ? "0 0 0 3px rgba(79,70,229,0.08)" : "none",
            }}
          >
            {tab.flag && <span>{tab.flag}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CashLedgerPage() {
  const { hasPermission } = usePermission();
  const t = useTranslations("admin.cashLedger");
  const toast = useToast();
  const { user } = useAuthStore();
  const branchId = user?.branchId ?? "";

  const today = dayjs();
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null]
  >([today, today]);
  const [keyword, setKeyword] = useState("");
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>(branchId || undefined);
  const [counterId, setCounterId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addDir, setAddDir] = useState<"IN" | "OUT">("IN");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>();
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>();

  const { data: currencies = [] } = useCurrencies();

  async function handleExport() {
    setIsExporting(true);
    try {
      await cashLedgerRepository.exportActivities({
        branchId: filterBranchId,
        counterId,
        fromDate,
        toDate,
        keyword: keyword.trim() || undefined,
      });
    } catch {
      toast.error(t("exportError"));
    } finally {
      setIsExporting(false);
    }
  }

  const fromDate = dateRange[0]?.format("YYYY-MM-DD");
  const toDate = dateRange[1]?.format("YYYY-MM-DD");

  const { data: branches = [] } = useBranches();
  const { data: counters = [] } = useCounters(filterBranchId ?? null);

  useEffect(() => {
    if (!filterBranchId && branches.length > 0) {
      setFilterBranchId(branches[0].id);
    }
  }, [branches, filterBranchId]);

  useEffect(() => {
    if (selectedCurrency === undefined && currencies.length > 0) {
      const first = currencies
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (first) setSelectedCurrency(first.code);
    }
  }, [currencies]);

  // Table + summary: GET /activities (trả về cả summary fields đồng bộ với bộ lọc)
  const { data: activities, isLoading } = useQuery({
    queryKey: [
      "cash-ledger",
      "activities",
      filterBranchId,
      counterId,
      fromDate,
      toDate,
      keyword,
      selectedCurrency,
      selectedMethod,
      page,
    ],
    queryFn: () =>
      cashLedgerRepository.getActivities({
        branchId: filterBranchId,
        counterId,
        fromDate,
        toDate,
        keyword: keyword.trim() || undefined,
        currency: selectedCurrency,
        method: selectedMethod,
        page,
        pageSize: PAGE_SIZE,
      }),
    staleTime: 30_000,
    enabled: !!filterBranchId,
  });

  const items = activities?.items ?? [];
  const totalCount = activities?.totalCount ?? 0;

  const sym = selectedCurrency ? getCurrencySymbol(selectedCurrency) : '₭';
  const hasNative = !!(selectedCurrency && activities?.totalInOriginal !== undefined);

  const summaryOpening = hasNative ? (activities?.openingBalanceOriginal ?? 0) : (activities?.openingBalanceLak ?? 0);
  const summaryTotalIn = hasNative ? (activities?.totalInOriginal ?? 0) : (activities?.totalInLak ?? 0);
  const summaryTotalOut = hasNative ? (activities?.totalOutOriginal ?? 0) : (activities?.totalOutLak ?? 0);
  const summaryClosing = summaryOpening + summaryTotalIn - summaryTotalOut;

  const columns = useMemo(
    (): ColumnsType<ActivityItem> => [
      {
        title: t("columns.direction"),
        dataIndex: "direction",
        width: 80,
        render: (v: string) => (
          <Tag style={{ borderRadius: 10, fontSize: 11 }}>
            {v === "IN" ? t("filterIncome") : t("filterExpense")}
          </Tag>
        ),
      },
      {
        title: t("columns.entryCode"),
        dataIndex: "entryCode",
        width: 130,
        render: (v: string) => (
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>
        ),
      },
      {
        title: t("columns.amount"),
        key: "amount",
        width: 150,
        align: "right" as const,
        render: (_: unknown, record: ActivityItem) => {
          const val = record.originalAmount ?? record.amountLak ?? 0;
          const csym = getCurrencySymbol(record.currency);
          return (
            <span style={{
              fontWeight: 600,
              fontFamily: "monospace",
              fontSize: 13,
            }}>
              {val.toLocaleString("lo-LA")} {csym}
            </span>
          );
        },
      },

      {
        title: t("columns.time"),
        dataIndex: "timeLabel",
        width: 160,
        render: (v: string) => (
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>
        ),
      },
      {
        title: t("columns.createdBy"),
        dataIndex: "createdByName",
        width: 140,
        render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span>,
      },
      {
        title: t("columns.currency"),
        dataIndex: "currency",
        width: 80,
        render: (v: string) => (
          <Tag style={{ borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{v}</Tag>
        ),
      },
      {
        title: t("columns.method"),
        key: "method",
        width: 160,
        render: (_: unknown, record: ActivityItem) => {
          const label = record.method
            ? t(`method.${record.method}` as Parameters<typeof t>[0])
            : record.methodLabel
          return <span style={{ fontSize: 13 }}>{label}</span>
        },
      },
    ],
    [t],
  );

  if (!hasPermission("CASH_LEDGER_MANAGE")) return <ForbiddenPage />;

  return (
    <div style={PAGE_STYLE}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* ── Left: main content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {t("title")}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
                {totalCount > 0
                  ? t("showTotal", {
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, totalCount),
                      total: totalCount,
                    })
                  : "—"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <AntBtn
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddDir("IN");
                  setAddOpen(true);
                }}
              >
                {t("createExpense")}
              </AntBtn>
              <AntBtn
                icon={<FileExcelOutlined />}
                loading={isExporting}
                onClick={handleExport}
              >
                {t("exportFile")}
              </AntBtn>
            </div>
          </div>

          {/* ── Summary ── */}
          <SummaryStrip
            openingBalance={summaryOpening}
            totalIn={summaryTotalIn}
            totalOut={summaryTotalOut}
            closingBalance={summaryClosing}
            symbol={sym}
          />

          {/* ── Currency tabs ── */}
          <CurrencyTabs
            currencies={currencies}
            selected={selectedCurrency}
            onChange={(code) => { setSelectedCurrency(code); setPage(1); }}
          />

          {/* ── Table card ── */}
          <Card
            style={{
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)",
            }}
            styles={{ body: { padding: 0, overflow: 'hidden' } }}
          >
            <div style={FILTER_STYLE}>
              <AntInput.Search
                placeholder={t("searchPlaceholder")}
                allowClear
                style={{ width: 230 }}
                onSearch={(v) => {
                  setKeyword(v);
                  setPage(1);
                }}
                onChange={(e) => {
                  if (!e.target.value) {
                    setKeyword("");
                    setPage(1);
                  }
                }}
              />
              <DatePicker.RangePicker
                value={[dateRange[0], dateRange[1]]}
                onChange={(range) => {
                  setDateRange([range?.[0] ?? null, range?.[1] ?? null]);
                  setPage(1);
                }}
                format="DD/MM/YYYY"
                allowEmpty={[true, true]}
                style={{ height: 32 }}
              />
              <AntSelect
                allowClear
                placeholder={t("filterBranch")}
                value={filterBranchId}
                onChange={(v) => {
                  setFilterBranchId(v);
                  setCounterId(undefined);
                  setPage(1);
                }}
                style={{ width: 180 }}
                options={branches.map((b) => ({
                  value: b.id,
                  label: b.name,
                }))}
              />
              <AntSelect
                allowClear
                placeholder={t("filterCounter")}
                value={counterId}
                disabled={!filterBranchId}
                onChange={(v) => {
                  setCounterId(v);
                  setPage(1);
                }}
                style={{ width: 160 }}
                options={counters.map((c) => ({
                  value: c.id,
                  label: c.counterName,
                }))}
              />
              <AntSelect
                allowClear
                placeholder={t("columns.method")}
                value={selectedMethod}
                onChange={(v) => {
                  setSelectedMethod(v);
                  setPage(1);
                }}
                style={{ width: 160 }}
                options={[
                  { value: "CASH",     label: t("method.CASH") },
                  { value: "BANK",     label: t("method.BANK") },
                  { value: "COMBINED", label: t("method.COMBINED") },
                ]}
              />
            </div>

            <Table<ActivityItem>
              rowKey="id"
              columns={columns}
              dataSource={items}
              loading={isLoading}
              size="middle"
              bordered
              scroll={{ x: 800 }}
              rowClassName={(r) =>
                expandedKeys.includes(r.id) ? "cash-row-expanded" : ""
              }
              expandable={{
                expandedRowKeys: expandedKeys,
                expandRowByClick: true,
                showExpandColumn: false,
                onExpand: (expanded, record) =>
                  setExpandedKeys(expanded ? [record.id] : []),
                expandedRowRender: (record) => (
                  <CashLedgerExpandedRow activityId={record.id} />
                ),
              }}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total: totalCount,
                onChange: (p) => setPage(p),
                showSizeChanger: true,
                pageSizeOptions: ["20", "50", "100"],
                showTotal: (tot, [from, to]) =>
                  `${t("showTotal", { from, to, total: tot })}`,
                style: { padding: "12px 16px", borderTop: "1px solid #f0f0f0" },
              }}
            />
          </Card>
        </div>

        {/* ── Right: cash count panel ── (tạm ẩn) */}
        {/* <div style={{ width: 360, flexShrink: 0 }}>
          <CashCountPanel
            branchId={branchId}
            date={today.format("YYYY-MM-DD")}
          />
        </div> */}
      </div>

      <style>{`.cash-row-expanded > td { background: #eff6ff !important; } .ant-table-thead > tr > th { white-space: nowrap; }`}</style>

      <AddEntryDialog
        branchId={branchId}
        open={addOpen}
        defaultDirection={addDir}
        currencies={currencies}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
