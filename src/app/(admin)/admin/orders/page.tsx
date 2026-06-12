"use client";

import { createOrderColumns } from "@/components/admin/columns/order-columns";
import { Receipt } from "@/components/pos/Receipt";
import { DataTable } from "@/components/shared/DataTable";
import { TablePageSkeleton } from "@/components/shared/PageSkeleton";
import { Input } from "@/components/ui/input";
import {
  useTransactionById,
  useTransactions,
} from "@/hooks/useTransactions";
import type { TransactionStatus, TransactionType } from "@/types/transaction";
import { Select } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

function formatKip(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

export default function OrdersPage() {
  const t = useTranslations("admin.orders");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterQ(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const transactionStatuses = useMemo(
    () => ({
      Completed: {
        label: t("transactionStatuses.Completed.label"),
        variant: "default" as const,
      },
      Cancelled: {
        label: t("transactionStatuses.Cancelled.label"),
        variant: "destructive" as const,
      },
    }),
    [t],
  );

  const typeLabels = useMemo(
    () => ({
      SellGold: t("transactionTypes.SellGold"),
      SellSilver: t("transactionTypes.SellSilver"),
      BuyGold: t("transactionTypes.BuyGold"),
      BuyMoreGold: t("transactionTypes.BuyMoreGold"),
      ExchangeGold: t("transactionTypes.ExchangeGold"),
      ExchangeFree: t("transactionTypes.ExchangeFree"),
      ExchangeToMoney: t("transactionTypes.ExchangeToMoney"),
      ExchangeCurrency: t("transactionTypes.ExchangeCurrency"),
    }),
    [t],
  );

  const { data, isLoading, isFetching } = useTransactions({
    status: (filterStatus as TransactionStatus) ?? undefined,
    type: (filterType as TransactionType) ?? undefined,
    from: filterFrom || undefined,
    to: filterTo || undefined,
    q: filterQ || undefined,
    page,
    pageSize,
    sortField: sortField ?? undefined,
    sortOrder: sortOrder ?? undefined,
  });

  const { data: selectedTxn } = useTransactionById(selectedTxnId ?? undefined);

  const transactions = data?.data ?? [];
  const revenue = transactions.reduce((s, tx) => s + (tx.totalAmount ?? 0), 0);

  const columns = useMemo(
    () =>
      createOrderColumns({
        invoiceCode: t("columns.invoiceCode"),
        time: t("columns.time"),
        type: t("columns.type"),
        payment: t("columns.payment"),
        amount: t("columns.amount"),
        status: t("columns.status"),
        openMenu: t("columns.openMenu"),
        viewDetail: t("columns.viewDetail"),
        transactionTypes: typeLabels,
        transactionStatuses,
        onViewDetail: (tx) => setSelectedTxnId(tx.id),
      }),
    [t, transactionStatuses, typeLabels],
  );

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("summary", { count: data?.total ?? 0 })}{" "}
          <span className="font-semibold text-foreground">
            {formatKip(revenue)}
          </span>
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("filterQ")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-56 text-sm"
        />

        {/* Status */}
        <Select
          value={filterStatus || undefined}
          onChange={(v) => {
            setFilterStatus(v ?? null);
            setPage(1);
          }}
          placeholder={t("filterStatus")}
          options={[
            { value: "Completed", label: transactionStatuses.Completed.label },
            { value: "Cancelled", label: transactionStatuses.Cancelled.label },
          ]}
          allowClear
          className="min-w-40"
          popupMatchSelectWidth={false}
        />

        {/* Type */}
        <Select
          value={filterType || undefined}
          onChange={(v) => {
            setFilterType(v ?? null);
            setPage(1);
          }}
          placeholder={t("filterType")}
          options={Object.entries(typeLabels).map(([value, label]) => ({
            value,
            label,
          }))}
          allowClear
          className="min-w-44"
          popupMatchSelectWidth={false}
        />

        {/* Date range */}
        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => {
            setFilterFrom(e.target.value);
            setPage(1);
          }}
          className="h-8 w-36 text-sm"
          title={t("filterFrom")}
        />
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => {
            setFilterTo(e.target.value);
            setPage(1);
          }}
          className="h-8 w-36 text-sm"
          title={t("filterTo")}
        />
      </div>

      {isLoading ? (
        <TablePageSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          hideSearch
          maxHeight={false}
          loading={isFetching}
          serverPagination={
            data
              ? {
                  total: data.total,
                  page: data.page,
                  pageSize: data.pageSize,
                  onPageChange: setPage,
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPage(1);
                  },
                  sortField: sortField ?? undefined,
                  sortOrder: sortOrder ?? undefined,
                  onSortChange: (field, order) => {
                    setSortField(field);
                    setSortOrder(order);
                    setPage(1);
                  },
                }
              : undefined
          }
        />
      )}

      <Receipt
        open={!!selectedTxnId && !!selectedTxn}
        transaction={selectedTxn ?? null}
        onClose={() => setSelectedTxnId(null)}
      />
    </div>
  );
}
