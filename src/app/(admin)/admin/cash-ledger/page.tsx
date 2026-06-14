'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashLedgerRepository } from '@/lib/repositories/cash-ledger.repository'
import { useAuthStore } from '@/stores/auth.store'
import { useCounters } from '@/hooks/useBranches'
import { Form, DatePicker, Table, Input as AntInput, Select as AntSelect, Card, Button as AntBtn, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { Spinner } from '@/components/ui/spinner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { CashLedgerExpandedRow } from '@/components/admin/cash-ledger/CashLedgerExpandedRow'
import { FileSpreadsheet, Plus } from 'lucide-react'
import type { CashMethod, CashCurrency, CashLedgerEntry } from '@/types/cash-ledger'

const PAGE_SIZE = 20
const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa',
}

function formatKip(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

// ─── Add entry dialog ─────────────────────────────────────────────────────────
function AddEntryDialog({
  branchId, open, defaultDirection, onClose,
}: { branchId: string; open: boolean; defaultDirection: 'IN' | 'OUT'; onClose: () => void }) {
  const t = useTranslations('admin.cashLedger')
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    description: '',
    direction: defaultDirection as 'IN' | 'OUT',
    method: 'CASH' as CashMethod,
    currency: 'LAK' as CashCurrency,
    originalAmount: '',
    exchangeRate: '1',
  })

  const { mutate: addEntry, isPending } = useMutation({
    mutationFn: () => cashLedgerRepository.addManualEntry({
      branchId,
      description: form.description,
      direction: form.direction,
      method: form.method,
      currency: form.currency,
      originalAmount: Number(form.originalAmount),
      exchangeRate: Number(form.exchangeRate),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-ledger'] })
      onClose()
    },
    onError: () => toast.error('Failed to add entry'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-xl"
        title={defaultDirection === 'IN' ? t('createIncome') : t('createExpense')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button
              onClick={() => addEntry()}
              disabled={isPending || !form.description || !form.originalAmount}
            >
              {isPending ? <Spinner /> : t('addEntry')}
            </Button>
          </DialogFooter>
        }
      >
        <Form layout="vertical" className="py-2">
          <Form.Item label={t('columns.description')}>
            <Input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label={t('filterVoucherType')}>
              <Select
                value={form.direction}
                onValueChange={v => setForm(p => ({ ...p, direction: v as 'IN' | 'OUT' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">{t('filterIncome')}</SelectItem>
                  <SelectItem value="OUT">{t('filterExpense')}</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
            <Form.Item label={t('columns.method')}>
              <Select
                value={form.method}
                onValueChange={v => setForm(p => ({ ...p, method: v as CashMethod }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t('method.CASH')}</SelectItem>
                  <SelectItem value="BANK">{t('method.BANK')}</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label={t('columns.amount')}>
              <NumberInput
                min={0}
                value={form.originalAmount}
                onChange={v => setForm(p => ({ ...p, originalAmount: v }))}
              />
            </Form.Item>
            <Form.Item label={t('columns.currency')} style={{ marginBottom: 0 }}>
              <Select
                value={form.currency}
                onValueChange={v => setForm(p => ({ ...p, currency: v as CashCurrency }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAK">LAK</SelectItem>
                  <SelectItem value="THB">THB</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </Form.Item>
          </div>
          {form.currency !== 'LAK' && (
            <Form.Item label={t('columns.exchangeRate')} style={{ marginBottom: 0 }}>
              <NumberInput
                min={1}
                value={form.exchangeRate}
                onChange={v => setForm(p => ({ ...p, exchangeRate: v }))}
              />
            </Form.Item>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Summary strip ────────────────────────────────────────────────────────────
function SummaryStrip({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '14px 20px', marginBottom: 16,
    }}>
      {items.map(({ label, value, color }, i) => (
        <div key={label} style={{
          textAlign: i === 0 ? 'left' : 'center',
          padding: '0 16px',
          borderLeft: i > 0 ? '1px solid #f0f0f0' : 'none',
        }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color }}>{formatKip(value)}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CashLedgerPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.cashLedger')
  const { user } = useAuthStore()
  const branchId = user?.branchId ?? ''

  const today = dayjs()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([today.subtract(30, 'day'), today])
  const [keyword, setKeyword]           = useState('')
  const [counterId, setCounterId]       = useState<string | undefined>()
  const [page, setPage]                 = useState(1)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [addOpen, setAddOpen]           = useState(false)
  const [addDir, setAddDir]             = useState<'IN' | 'OUT'>('IN')

  const fromDate = dateRange[0]?.format('YYYY-MM-DD')
  const toDate   = dateRange[1]?.format('YYYY-MM-DD')

  const { data: counters = [] } = useCounters(branchId || null)

  // Summary: GET /daily dùng ngày "from" để lấy số dư đầu kỳ
  const { data: daily } = useQuery({
    queryKey: ['cash-ledger', 'daily', branchId, counterId, fromDate],
    queryFn: () => cashLedgerRepository.getDaily({ branchId, counterId, date: fromDate }),
    staleTime: 30_000,
    enabled: !!branchId,
  })

  // Tổng thu/chi tính từ entries của /daily (ngày đầu kỳ)
  const totalIn  = daily?.entries.filter(e => e.sign === 1).reduce((s, e) => s + e.amountLak, 0) ?? 0
  const totalOut = daily?.entries.filter(e => e.sign === -1).reduce((s, e) => s + e.amountLak, 0) ?? 0

  // Table: GET /activities
  const { data: activities, isLoading } = useQuery({
    queryKey: ['cash-ledger', 'activities', branchId, counterId, fromDate, toDate, keyword, page],
    queryFn: () => cashLedgerRepository.getActivities({
      branchId, counterId,
      fromDate, toDate,
      keyword: keyword.trim() || undefined,
      page, pageSize: PAGE_SIZE,
    }),
    staleTime: 30_000,
    enabled: !!branchId,
  })

  const entries    = activities?.entries ?? []
  const totalCount = activities?.totalCount ?? 0

  const summaryItems = [
    { label: t('openingBalance'), value: (daily?.openingCashLak ?? 0) + (daily?.openingBankLak ?? 0), color: '#111827' },
    { label: t('totalIn'),        value: totalIn,  color: '#16A34A' },
    { label: t('totalOut'),       value: totalOut, color: '#DC2626' },
    { label: t('closingBalance'), value: (daily?.expectedCashClosingLak ?? 0) + (daily?.expectedBankClosingLak ?? 0), color: '#16A34A' },
  ]

  const columns = useMemo((): ColumnsType<CashLedgerEntry> => [
    {
      title: t('columns.time'), dataIndex: 'timeLabel', width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</span>,
    },
    {
      title: t('columns.description'), dataIndex: 'description', width: 360,
      render: (v: string) => <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 13 }}>{v}</span>,
    },
    {
      title: t('columns.entryType'), dataIndex: 'entryType', width: 130,
      render: (v: string, r: CashLedgerEntry) => (
        <Tag
          color={r.sign === 1 ? 'green' : 'red'}
          style={{ borderRadius: 10, fontSize: 11 }}
        >
          {t(`entryType.${v}` as Parameters<typeof t>[0])}
        </Tag>
      ),
    },
    {
      title: t('columns.method'), dataIndex: 'method', width: 110,
      render: (v: CashMethod) => t(`method.${v}` as Parameters<typeof t>[0]),
    },
    {
      title: t('columns.amount'), dataIndex: 'amountLak', width: 140, align: 'right' as const,
      render: (v: number, r: CashLedgerEntry) => (
        <b style={{ color: r.sign === 1 ? '#16A34A' : '#DC2626', fontFamily: 'monospace' }}>
          {r.sign === 1 ? '+' : '−'}{formatKip(v)}
        </b>
      ),
    },
  ], [t])

  if (!hasPermission('CASH_LEDGER_MANAGE')) return <ForbiddenPage />

  return (
    <div style={PAGE_STYLE}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{t('title')}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {totalCount > 0
              ? t('showTotal', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, totalCount), total: totalCount })
              : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <AntBtn
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => { setAddDir('IN'); setAddOpen(true) }}
          >
            {t('createIncome')}
          </AntBtn>
          <AntBtn
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => { setAddDir('OUT'); setAddOpen(true) }}
          >
            {t('createExpense')}
          </AntBtn>
          <AntBtn icon={<FileSpreadsheet size={14} />}>{t('exportFile')}</AntBtn>
        </div>
      </div>

      {/* ── Summary ── */}
      <SummaryStrip items={summaryItems} />

      {/* ── Table card ── */}
      <Card
        style={{ borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={FILTER_STYLE}>
          <AntInput.Search
            placeholder={t('searchPlaceholder')}
            allowClear
            style={{ width: 230 }}
            onSearch={v => { setKeyword(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setKeyword(''); setPage(1) } }}
          />
          <DatePicker.RangePicker
            value={[dateRange[0], dateRange[1]]}
            onChange={range => {
              setDateRange([range?.[0] ?? null, range?.[1] ?? null])
              setPage(1)
            }}
            format="DD/MM/YYYY"
            allowEmpty={[true, true]}
            style={{ height: 32 }}
          />
          <AntSelect
            allowClear
            placeholder={t('filterCounter')}
            value={counterId}
            onChange={v => { setCounterId(v); setPage(1) }}
            style={{ width: 160 }}
            options={counters.map(c => ({ value: c.id, label: c.counterName }))}
          />
        </div>

        <Table<CashLedgerEntry>
          rowKey="id"
          columns={columns}
          dataSource={entries}
          loading={isLoading}
          size="middle"
          bordered
          scroll={{ x: 800 }}
          rowClassName={r => expandedKeys.includes(r.id) ? 'cash-row-expanded' : ''}
          expandable={{
            expandedRowKeys: expandedKeys,
            expandRowByClick: true,
            showExpandColumn: false,
            onExpand: (expanded, record) =>
              setExpandedKeys(expanded
                ? [...expandedKeys, record.id]
                : expandedKeys.filter(k => k !== record.id),
              ),
            expandedRowRender: record => <CashLedgerExpandedRow record={record} />,
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: totalCount,
            onChange: p => setPage(p),
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (tot, [from, to]) => `${t('showTotal', { from, to, total: tot })}`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.cash-row-expanded > td { background: #eff6ff !important; }`}</style>

      <AddEntryDialog
        branchId={branchId}
        open={addOpen}
        defaultDirection={addDir}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}
