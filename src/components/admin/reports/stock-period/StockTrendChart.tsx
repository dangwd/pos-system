'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Segmented } from 'antd'
import dayjs from 'dayjs'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Panel, EmptyHint, formatNum, CHART_COLORS } from '@/components/admin/reports/report-ui'
import type {
  StockTrendReport, StockTrendSeries, StockTrendGranularity, StockMetal,
} from '@/types/report'

// Màu cố định cho 2 kim loại ở chế độ "Gộp CN" (recharts cần hex, không dùng CSS token).
const C_GOLD = '#EF9F27'
const C_SILVER = '#185FA5'

const tooltipStyle = { fontSize: 12, borderRadius: 8 }

type Mode = 'combine' | 'split'

function seriesKey(s: StockTrendSeries) {
  return `${s.branchId ?? 'all'}__${s.metal}`
}

// buckets là ISO datetime — rút gọn theo độ chia cho trục X.
function bucketLabel(iso: string, g: StockTrendGranularity) {
  const d = dayjs(iso)
  if (g === 'month') return d.format('MM/YYYY')
  if (g === 'week') return d.format('DD/MM')
  return d.format('D/M')
}

export function StockTrendChart({
  data, loading,
}: {
  data?: StockTrendReport
  loading?: boolean
}) {
  const t = useTranslations('admin.reports.stockPeriod')
  const [mode, setMode] = useState<Mode>('combine')
  // Độ chia theo response BE (ăn theo khoảng ngày của bộ lọc tổng) — không có selector riêng.
  const granularity: StockTrendGranularity = data?.granularity ?? 'day'

  const metalLabel = (m: StockMetal) => (m === 'Gold' ? t('legendGold') : t('legendSilver'))

  // Series hiển thị theo chế độ: gộp → branchId === null; tách → branchId !== null.
  const visible = useMemo(
    () => (data?.series ?? []).filter((s) => (mode === 'combine' ? s.branchId === null : s.branchId !== null)),
    [data?.series, mode],
  )

  // Pivot series → 1 row / bucket (căn theo index của `buckets`).
  const chartData = useMemo(() => {
    const buckets = data?.buckets ?? []
    return buckets.map((iso, i) => {
      const row: Record<string, number | string> = { label: bucketLabel(iso, granularity) }
      for (const s of visible) row[seriesKey(s)] = s.points[i]?.closeQty ?? 0
      return row
    })
  }, [data?.buckets, visible, granularity])

  // Gán màu: gộp → cam/xanh theo kim loại; tách → màu theo chi nhánh, vàng nét liền + bạc nét đứt.
  const branchColors = useMemo(() => {
    const ids = Array.from(new Set(visible.map((s) => s.branchId ?? 'all')))
    return new Map(ids.map((id, i) => [id, CHART_COLORS[i % CHART_COLORS.length]]))
  }, [visible])

  const colorOf = (s: StockTrendSeries) =>
    mode === 'combine'
      ? (s.metal === 'Gold' ? C_GOLD : C_SILVER)
      : (branchColors.get(s.branchId ?? 'all') ?? CHART_COLORS[0])

  const nameOf = (s: StockTrendSeries) =>
    mode === 'combine' ? metalLabel(s.metal) : `${metalLabel(s.metal)} · ${s.branchName}`

  return (
    <Panel
      title={t('trendTitle')}
      action={
        <Segmented<Mode>
          size="small"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'combine', label: t('trendCombine') },
            { value: 'split', label: t('trendSplit') },
          ]}
        />
      }
    >
      <p className="text-[11px] text-muted-foreground -mt-2">{t('trendSubtitle')}</p>
      {loading || chartData.length === 0 || visible.length === 0 ? (
        <EmptyHint>{loading ? '…' : t('trendEmpty')}</EmptyHint>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v) => formatNum(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {visible.map((s) => {
              const key = seriesKey(s)
              const color = colorOf(s)
              // Gộp + Vàng → vùng tô; còn lại → đường (bạc nét đứt cho dễ phân biệt).
              if (mode === 'combine' && s.metal === 'Gold') {
                return (
                  <Area
                    key={key} type="monotone" dataKey={key} name={nameOf(s)}
                    stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2}
                    dot={{ r: 2 }} activeDot={{ r: 4 }}
                  />
                )
              }
              return (
                <Line
                  key={key} type="monotone" dataKey={key} name={nameOf(s)}
                  stroke={color} strokeWidth={2}
                  strokeDasharray={s.metal === 'Silver' ? '5 4' : undefined}
                  dot={{ r: 2 }} activeDot={{ r: 4 }}
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Panel>
  )
}
