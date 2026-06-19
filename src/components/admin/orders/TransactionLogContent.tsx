"use client";

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { createOrderColumns } from "@/components/admin/columns/order-columns";
import { TransactionExpandedRow } from "@/components/admin/orders/TransactionExpandedRow";
import { useTransactions } from "@/hooks/useTransactions";
import type { TransactionStatus, TransactionType, Transaction } from "@/types/transaction";
import { Table, Select, DatePicker, Input as AntInput, Card } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa',
}

function formatKip(n: number) {
  return n.toLocaleString("lo-LA") + " ₭";
}

interface Props {
  fixedType?: TransactionType;
}

export function TransactionLogContent({ fixedType }: Props) {
  const { hasPermission } = usePermission()
  const t = useTranslations("admin.orders");

  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(PAGE_SIZE);
  const [sortField, setSortField]       = useState<string | null>(null);
  const [sortOrder, setSortOrder]       = useState<"asc" | "desc" | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType]     = useState<string | null>(null);
  const [filterFrom, setFilterFrom]     = useState("");
  const [filterTo, setFilterTo]         = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [filterQ, setFilterQ]           = useState("");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => { setFilterQ(searchInput); setPage(1) }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const transactionStatuses = useMemo(() => ({
    Completed: { label: t("transactionStatuses.Completed.label"), variant: "default" as const },
    Cancelled: { label: t("transactionStatuses.Cancelled.label"), variant: "destructive" as const },
  }), [t]);

  const typeLabels = useMemo(() => ({
    SellGold:         t("transactionTypes.SellGold"),
    SellSilver:       t("transactionTypes.SellSilver"),
    BuyGold:          t("transactionTypes.BuyGold"),
    BuyMoreGold:      t("transactionTypes.BuyMoreGold"),
    ExchangeGold:     t("transactionTypes.ExchangeGold"),
    ExchangeFree:     t("transactionTypes.ExchangeFree"),
    ExchangeToMoney:  t("transactionTypes.ExchangeToMoney"),
    ExchangeCurrency: t("transactionTypes.ExchangeCurrency"),
  }), [t]);

  const resolvedType = (fixedType ?? filterType as TransactionType) ?? undefined;
  const isExchangeType = resolvedType === 'ExchangeGold' || resolvedType === 'ExchangeFree' || resolvedType === 'ExchangeToMoney';

  const { data, isLoading, isFetching } = useTransactions({
    status:    (filterStatus as TransactionStatus) ?? undefined,
    type:      resolvedType,
    from:      filterFrom || undefined,
    to:        filterTo || undefined,
    q:         filterQ || undefined,
    page,
    pageSize,
    sortField: sortField ?? undefined,
    sortOrder: sortOrder ?? undefined,
  });

  const transactions = data?.data ?? [];
  const revenue = transactions.reduce((s, tx) => s + (tx.totalAmount ?? 0), 0);

  const columns = useMemo(() => createOrderColumns({
    colType:        t("columns.type"),
    colInvoiceCode: t("columns.invoiceCode"),
    colRefCode:     t("columns.refCode"),
    colTime:        t("columns.time"),
    colCustomer:    t("columns.customer"),
    colAmount:      t("columns.amount"),
    colStatus:      t("columns.status"),
    transactionTypes: typeLabels,
    transactionStatuses,
    showRefCode: isExchangeType,
  }), [t, transactionStatuses, typeLabels, isExchangeType]);

  if (!hasPermission('TRANSACTION_VIEW_ALL')) return <ForbiddenPage />

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t("title")}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t("summary", { count: data?.total ?? 0 })}{" "}
            <span style={{ fontWeight: 600, color: '#111827' }}>{formatKip(revenue)}</span>
          </p>
        </div>

      </div>

      <Card
        style={{ borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
      >
        <div style={FILTER_STYLE}>
          <AntInput.Search
            placeholder={t("filterQ")}
            allowClear
            style={{ width: 230 }}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onSearch={v => { setFilterQ(v); setPage(1) }}
          />
          <Select
            value={filterStatus || undefined}
            onChange={v => { setFilterStatus(v ?? null); setPage(1) }}
            placeholder={t("filterStatus")}
            options={[
              { value: "Completed", label: transactionStatuses.Completed.label },
              { value: "Cancelled", label: transactionStatuses.Cancelled.label },
            ]}
            allowClear
            style={{ minWidth: 150 }}
            popupMatchSelectWidth={false}
          />
          {!fixedType && (
            <Select
              value={filterType || undefined}
              onChange={v => { setFilterType(v ?? null); setPage(1) }}
              placeholder={t("filterType")}
              options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
              allowClear
              style={{ minWidth: 160 }}
              popupMatchSelectWidth={false}
            />
          )}
          <DatePicker.RangePicker
            value={[filterFrom ? dayjs(filterFrom) : null, filterTo ? dayjs(filterTo) : null]}
            onChange={range => {
              setFilterFrom(range?.[0] ? range[0].format('YYYY-MM-DD') : '');
              setFilterTo(range?.[1] ? range[1].format('YYYY-MM-DD') : '');
              setPage(1);
            }}
            format="DD/MM/YYYY"
            allowEmpty={[true, true]}
            style={{ height: 32 }}
          />
        </div>

        <Table<Transaction>
          rowKey="id"
          columns={columns}
          dataSource={transactions}
          loading={isLoading || isFetching}
          size="middle"
          bordered
          scroll={{ x: 1000 }}
          rowClassName={r => expandedKeys.includes(r.id) ? 'order-row-expanded' : ''}
          expandable={{
            expandedRowKeys: expandedKeys,
            expandRowByClick: true,
            showExpandColumn: false,
            onExpand: (expanded, record) =>
              setExpandedKeys(expanded ? [record.id] : []),
            expandedRowRender: record => <TransactionExpandedRow record={record} />,
          }}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter) && sorter.field) {
              setSortField(sorter.field as string)
              setSortOrder(sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : null)
              setPage(1)
            }
          }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            onChange: (p, ps) => { setPage(p); if (ps !== pageSize) { setPageSize(ps); setPage(1) } },
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (tot, [from, to]) => `${from}–${to} / ${tot} ${t('recordUnit')}`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.order-row-expanded > td { background: #eff6ff !important; } .ant-table-thead > tr > th { white-space: nowrap; } .exchange-in-row > td { background: #eff6ff !important; }`}</style>
    </div>
  );
}
