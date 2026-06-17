'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import { Tag, Button as AntBtn, Spin } from 'antd'
import { cashLedgerRepository } from '@/lib/repositories/cash-ledger.repository'

interface Props { activityId: string }

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'baseline' }}>
      <span style={{ minWidth: 120, fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
        {value ?? <span style={{ color: '#d1d5db' }}>—</span>}
      </span>
    </div>
  )
}

function formatKip(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

const SOURCE_COLOR: Record<string, string> = {
  Transaction: 'blue',
  Manual: 'purple',
  Handover: 'orange',
}

export function CashLedgerExpandedRow({ activityId }: Props) {
  const t = useTranslations('admin.cashLedger')

  const { data: detail, isLoading } = useQuery({
    queryKey: ['cash-ledger', 'activity', activityId],
    queryFn: () => cashLedgerRepository.getActivityById(activityId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
        <Spin size="small" />
        <span style={{ fontSize: 13 }}>{t('detail.loading')}</span>
      </div>
    )
  }

  if (!detail) return null

  const isIncome = detail.direction === 'IN'

  return (
    <div style={{ padding: '16px 16px 16px 48px', background: '#f8faff', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      {/* Cột trái */}
      <div style={{ minWidth: 300, flex: 1 }}>
        <Field label={t('detail.entryCode')} value={
          <span style={{ fontFamily: 'monospace' }}>{detail.entryCode}</span>
        } />
        <Field label={t('detail.time')} value={detail.timeLabel} />
        <Field label={t('detail.description')} value={
          <span style={{ fontStyle: 'italic' }}>{detail.description}</span>
        } />
        <Field label={t('detail.entryType')} value={
          <Tag color={isIncome ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 11 }}>
            {t(`entryType.${detail.entryType}` as Parameters<typeof t>[0])}
          </Tag>
        } />
        <Field label={t('detail.source')} value={
          <Tag color={SOURCE_COLOR[detail.source] ?? 'default'} style={{ borderRadius: 10, fontSize: 11 }}>
            {t(`source.${detail.source}` as Parameters<typeof t>[0])}
          </Tag>
        } />
        {detail.reasonLabel && (
          <Field label={t('detail.reason')} value={detail.reasonLabel} />
        )}
        {detail.note && (
          <Field label={t('detail.note')} value={detail.note} />
        )}
      </div>

      {/* Cột phải */}
      <div style={{ minWidth: 220 }}>
        <Field label={t('detail.value')} value={
          <b style={{ color: isIncome ? '#16a34a' : '#dc2626', fontSize: 14 }}>
            {isIncome ? '+' : '−'}{formatKip(detail.amountLak)}
          </b>
        } />
        <Field label={t('detail.method')} value={t(`method.${detail.method}` as Parameters<typeof t>[0])} />
        {detail.cashAmountLak > 0 && (
          <Field label={t('detail.cashAmount')} value={formatKip(detail.cashAmountLak)} />
        )}
        {detail.bankAmountLak > 0 && (
          <Field label={t('detail.bankAmount')} value={formatKip(detail.bankAmountLak)} />
        )}
        {detail.currency !== 'LAK' && (
          <Field label={t('detail.currency')} value={
            `${detail.currency} × ${detail.exchangeRate.toLocaleString('lo-LA')}`
          } />
        )}
        <Field label={t('detail.createdBy')} value={detail.createdByName} />
        <Field label={t('detail.branch')} value={detail.branchName} />
        {detail.referenceInvoiceCode && (
          <Field label={t('detail.referenceInvoice')} value={
            <span style={{ fontFamily: 'monospace' }}>{detail.referenceInvoiceCode}</span>
          } />
        )}
        {detail.customerName && (
          <Field label={t('detail.customer')} value={detail.customerName} />
        )}
      </div>

      {/* Footer: nút in */}
      <div style={{ width: '100%', display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <AntBtn icon={<FileExcelOutlined />}>
          {t('detail.printExcel')}
        </AntBtn>
        <AntBtn type="primary" icon={<FileTextOutlined />}>
          {t('detail.printPdf')}
        </AntBtn>
      </div>
    </div>
  )
}
