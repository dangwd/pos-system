'use client'

import { Card } from 'antd'

// Style card chuẩn dùng chung toàn admin — đồng nhất với module Tổng quan (dashboard).
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
  overflow: 'hidden',
}

export interface StatCardProps {
  label: string
  value: React.ReactNode
  /** Icon node (vd: <RiseOutlined />). Khi có icon sẽ vẽ thêm "blob" tròn mờ góc dưới-phải. */
  icon?: React.ReactNode
  /** Màu icon + màu blob. Mặc định indigo. */
  iconColor?: string
  /** Dòng phụ nhỏ dưới value. */
  sub?: React.ReactNode
  /** Màu của value (vd: thu = xanh, chi = đỏ). Mặc định #111827. */
  valueColor?: string
  /** Viền nhấn (highlight) cho card quan trọng. */
  highlight?: boolean
  /** Badge chênh lệch (vd: so với đầu kỳ). */
  delta?: { value: number; text: string }
}

export function StatCard({
  label, value, icon, iconColor = '#6366f1',
  sub, valueColor = '#111827', highlight, delta,
}: StatCardProps) {
  return (
    <Card
      style={highlight ? { ...CARD_STYLE, borderColor: '#B5D4F4' } : CARD_STYLE}
      styles={{ body: { padding: '16px 20px 20px', position: 'relative' } }}
    >
      {icon && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', right: -32, bottom: -32,
            width: 128, height: 128, borderRadius: '50%',
            background: iconColor, opacity: 0.09, pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color: iconColor, fontSize: 15, lineHeight: 1 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub != null && sub !== '' && (
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{sub}</div>
      )}
      {delta && delta.value !== 0 && (
        <span
          style={{
            display: 'inline-block', fontSize: 10, fontWeight: 500,
            padding: '2px 6px', borderRadius: 4, marginTop: 6,
            ...(delta.value > 0
              ? { background: '#EAF3DE', color: '#3B6D11' }
              : { background: '#FCEBEB', color: '#A32D2D' }),
          }}
        >
          {delta.value > 0 ? '+' : '−'}{Math.abs(delta.value).toLocaleString('lo-LA')} {delta.text} {delta.value > 0 ? '↑' : '↓'}
        </span>
      )}
    </Card>
  )
}
