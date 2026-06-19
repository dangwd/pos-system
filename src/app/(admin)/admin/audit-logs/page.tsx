'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Card, DatePicker, Input, Select, Table } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { createAuditLogColumns } from '@/components/admin/columns/audit-log-columns'
import type { LoginEventType } from '@/types/auth'

const PAGE_SIZE = 50

const EVENT_TYPES: { value: number; key: LoginEventType }[] = [
  { value: 1, key: 'LoginSuccess' },
  { value: 2, key: 'LoginFailedBadCredentials' },
  { value: 3, key: 'LoginFailedInactive' },
  { value: 4, key: 'Logout' },
  { value: 5, key: 'TokenRefreshed' },
]

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '14px 16px',
  borderBottom: '1px solid #f0f0f0', background: '#fafafa',
  flexWrap: 'wrap', alignItems: 'center',
}

export default function AuditLogsPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.auditLogs')

  const [usernameSearch, setUsernameSearch] = useState('')
  const [filterEventType, setFilterEventType] = useState<number | null>(null)
  const [filterFrom, setFilterFrom]         = useState<string | null>(null)
  const [filterTo, setFilterTo]             = useState<string | null>(null)
  const [page, setPage]                     = useState(1)

  const params = useMemo(() => ({
    username:  usernameSearch || undefined,
    eventType: filterEventType ?? undefined,
    from:      filterFrom ?? undefined,
    to:        filterTo ?? undefined,
    page,
    pageSize:  PAGE_SIZE,
  }), [usernameSearch, filterEventType, filterFrom, filterTo, page])

  const { data, isLoading, refetch } = useAuditLogs(params)

  const eventLabels = useMemo<Record<LoginEventType, string>>(() => ({
    LoginSuccess:              t('events.LoginSuccess'),
    LoginFailedBadCredentials: t('events.LoginFailedBadCredentials'),
    LoginFailedInactive:       t('events.LoginFailedInactive'),
    Logout:                    t('events.Logout'),
    TokenRefreshed:            t('events.TokenRefreshed'),
  }), [t])

  const columns = useMemo(() => createAuditLogColumns({
    username:    t('columns.username'),
    eventType:   t('columns.eventType'),
    ipAddress:   t('columns.ipAddress'),
    userAgent:   t('columns.userAgent'),
    occurredAt:  t('columns.occurredAt'),
    unknownUser: t('unknownUser'),
    eventLabels,
  }), [t, eventLabels])

  const handleReset = () => {
    setUsernameSearch('')
    setFilterEventType(null)
    setFilterFrom(null)
    setFilterTo(null)
    setPage(1)
  }

  if (!hasPermission('AUDIT_LOG_VIEW')) return <ForbiddenPage />

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: data?.total ?? 0 })}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
          {t('refresh')}
        </Button>
      </div>

      {/* ── Bảng ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        {/* Filters */}
        <div style={FILTER_STYLE}>
          <Input.Search
            placeholder={t('searchPlaceholder')}
            allowClear
            style={{ width: 220 }}
            value={usernameSearch}
            onSearch={v => { setUsernameSearch(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setUsernameSearch(''); setPage(1) } }}
          />
          <Select
            allowClear
            placeholder={t('filterAllEvent')}
            style={{ width: 220 }}
            value={filterEventType ?? undefined}
            options={EVENT_TYPES.map(e => ({ value: e.value, label: eventLabels[e.key] }))}
            onChange={v => { setFilterEventType(v ?? null); setPage(1) }}
            popupMatchSelectWidth={false}
          />
          <DatePicker
            placeholder={t('filterFrom')}
            style={{ width: 160 }}
            value={filterFrom ? dayjs(filterFrom) : null}
            onChange={d => { setFilterFrom(d ? d.startOf('day').toISOString() : null); setPage(1) }}
          />
          <DatePicker
            placeholder={t('filterTo')}
            style={{ width: 160 }}
            value={filterTo ? dayjs(filterTo) : null}
            onChange={d => { setFilterTo(d ? d.endOf('day').toISOString() : null); setPage(1) }}
          />
          <Button onClick={handleReset}>{t('reset')}</Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          bordered
          size="small"
          scroll={{ x: 1030 }}
          pagination={{
            total:    data?.total,
            current:  page,
            pageSize: PAGE_SIZE,
            onChange: p => setPage(p),
            showSizeChanger: false,
            showTotal: (total, [from, to]) => `${from}–${to} / ${total}`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>
    </div>
  )
}
