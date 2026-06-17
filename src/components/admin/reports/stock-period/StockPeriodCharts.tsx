'use client'

import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Panel, EmptyHint, formatNum } from '@/components/admin/reports/report-ui'
import type { StockPeriodKaratRow } from '@/types/report'

// Màu theo spec (recharts cần hex cụ thể, không dùng được CSS token).
const C_OPEN = '#B5D4F4'
const C_MID = '#EF9F27'
const C_CLOSE = '#185FA5'
const C_RECEIPT = '#97C459'
const C_ISSUE = '#F09595'

const tooltipStyle = { fontSize: 12, borderRadius: 8 }

export function StockPeriodCharts({ byKarat }: { byKarat: StockPeriodKaratRow[] }) {
  const t = useTranslations('admin.reports.stockPeriod')

  const compareData = byKarat.map((k) => ({
    karat: k.karat, open: k.openQty, mid: k.midQty, close: k.closeQty,
  }))
  const flowData = byKarat.map((k) => ({
    karat: k.karat, receipt: k.receiptQty, issue: k.issueQty,
  }))

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={t('chartCompareTitle')}>
        {compareData.length === 0 ? <EmptyHint>—</EmptyHint> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compareData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="karat" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => formatNum(Number(v))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="open"  name={t('legendOpen')}  fill={C_OPEN}  radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar dataKey="mid"   name={t('legendMid')}   fill={C_MID}   radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar dataKey="close" name={t('legendClose')} fill={C_CLOSE} radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title={t('chartFlowTitle')}>
        {flowData.length === 0 ? <EmptyHint>—</EmptyHint> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={flowData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="karat" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => formatNum(Number(v))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receipt" name={t('legendReceipt')} fill={C_RECEIPT} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar dataKey="issue"   name={t('legendIssue')}   fill={C_ISSUE}   radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  )
}
