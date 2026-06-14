'use client'

import { useTranslations } from 'next-intl'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { Tag, Button as AntBtn } from 'antd'
import type { CashLedgerEntry } from '@/types/cash-ledger'

interface Props { record: CashLedgerEntry }

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'baseline' }}>
      <span style={{ minWidth: 110, fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
        {value ?? <span style={{ color: '#d1d5db' }}>—</span>}
      </span>
    </div>
  )
}

function formatKip(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

export function CashLedgerExpandedRow({ record }: Props) {
  const t = useTranslations('admin.cashLedger')

  const isIncome = record.sign === 1
  const methodLabel = t(`method.${record.method}` as Parameters<typeof t>[0])
  const entryTypeKey = `entryType.${record.entryType}` as Parameters<typeof t>[0]

  return (
    <div style={{ padding: '16px 16px 16px 48px', background: '#f0fdfa', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      {/* Cột trái */}
      <div style={{ minWidth: 280, flex: 1 }}>
        <Field label={t('detail.time')}
          value={`${record.timeLabel} — ${new Date(record.sortAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
        />
        <Field label={t('detail.description')} value={<span style={{ fontStyle: 'italic' }}>{record.description}</span>} />
        <Field label={t('detail.entryType')}
          value={
            <Tag color={isIncome ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 11 }}>
              {t(entryTypeKey)}
            </Tag>
          }
        />
        <Field label={t('detail.source')}
          value={
            <Tag color={record.source === 'Transaction' ? 'blue' : 'purple'} style={{ borderRadius: 10, fontSize: 11 }}>
              {t(`source.${record.source}` as Parameters<typeof t>[0])}
            </Tag>
          }
        />
      </div>

      {/* Cột phải */}
      <div style={{ minWidth: 200 }}>
        <Field label={t('detail.method')} value={methodLabel} />
        <Field label={t('detail.value')}
          value={
            <b style={{ color: isIncome ? '#16a34a' : '#dc2626', fontSize: 14 }}>
              {isIncome ? '+' : '−'}{formatKip(record.amountLak)}
            </b>
          }
        />
      </div>

      {/* Footer: nút in */}
      <div style={{ width: '100%', display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <AntBtn icon={<FileSpreadsheet size={13} />}>
          {t('detail.printExcel')}
        </AntBtn>
        <AntBtn type="primary" icon={<FileText size={13} />}>
          {t('detail.printPdf')}
        </AntBtn>
      </div>
    </div>
  )
}
