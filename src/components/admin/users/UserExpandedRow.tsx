'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Popconfirm, Tabs, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  EditOutlined,
  LockOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { Badge } from '@/components/ui/badge'
import { UserInlineEditForm } from './UserInlineEditForm'
import { useUserAuditLogs } from '@/hooks/useAuditLogs'
import type { AdminUser } from '@/types/admin-user'
import type { LoginAuditLog, LoginEventType } from '@/types/auth'

const EVENT_TAG_COLOR: Record<LoginEventType, string> = {
  LoginSuccess:              'success',
  LoginFailedBadCredentials: 'error',
  LoginFailedInactive:       'warning',
  Logout:                    'default',
  TokenRefreshed:            'processing',
  ForceLogout:               'volcano',
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ minWidth: 150, color: '#6b7280', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 500, color: '#111827' }}>
        {value ?? <span style={{ color: '#d1d5db', fontWeight: 400 }}>—</span>}
      </span>
    </div>
  )
}

function UserActivityPanel({ userId }: { userId: string }) {
  const t = useTranslations('admin.auditLogs')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useUserAuditLogs({ userId, page, pageSize: 10 })

  const eventLabels = useMemo<Record<LoginEventType, string>>(() => ({
    LoginSuccess:              t('events.LoginSuccess'),
    LoginFailedBadCredentials: t('events.LoginFailedBadCredentials'),
    LoginFailedInactive:       t('events.LoginFailedInactive'),
    Logout:                    t('events.Logout'),
    TokenRefreshed:            t('events.TokenRefreshed'),
    ForceLogout:               t('events.ForceLogout'),
  }), [t])

  const columns: TableColumnsType<LoginAuditLog> = useMemo(() => [
    {
      title: t('columns.occurredAt'),
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 155,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>
          {new Date(v).toLocaleString('lo-LA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })}
        </span>
      ),
    },
    {
      title: t('columns.eventType'),
      dataIndex: 'eventType',
      key: 'eventType',
      width: 210,
      render: (v: LoginEventType) => (
        <Tag color={EVENT_TAG_COLOR[v] ?? 'default'} style={{ margin: 0, fontSize: 12 }}>
          {eventLabels[v] ?? v}
        </Tag>
      ),
    },
    {
      title: t('columns.ipAddress'),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (v: string | null) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: v ? '#374151' : '#d1d5db' }}>
          {v ?? '—'}
        </span>
      ),
    },
    {
      title: t('columns.userAgent'),
      dataIndex: 'userAgent',
      key: 'userAgent',
      render: (v: string | null) =>
        v ? <span style={{ fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>{v}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>,
    },
  ], [t, eventLabels])

  return (
    <Table<LoginAuditLog>
      rowKey="id"
      columns={columns}
      dataSource={data?.items ?? []}
      loading={isLoading}
      size="small"
      scroll={{ x: 700 }}
      style={{ marginTop: 8 }}
      locale={{ emptyText: <span style={{ color: '#9ca3af', fontSize: 13 }}>Chưa có hoạt động nào</span> }}
      pagination={
        (data?.total ?? 0) > 10
          ? {
              total: data?.total,
              current: page,
              pageSize: 10,
              onChange: p => setPage(p),
              showSizeChanger: false,
              size: 'small',
              showTotal: (total, [from, to]) => `${from}–${to} / ${total}`,
              style: { padding: '8px 0 0' },
            }
          : false
      }
    />
  )
}

interface Props {
  user: AdminUser
  branchMap: Record<string, string>
  onResetPassword: (user: AdminUser) => void
  onActivate:      (user: AdminUser) => void
  onDeactivate:    (user: AdminUser) => void
  onForceLogout:   (user: AdminUser) => void
}

export function UserExpandedRow({
  user,
  branchMap,
  onResetPassword,
  onActivate,
  onDeactivate,
  onForceLogout,
}: Props) {
  const t  = useTranslations('admin.users')
  const tc = useTranslations('admin.users.columns')
  const tf = useTranslations('admin.users.forceLogout')
  const tt = useTranslations('admin.users.tabs')

  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <UserInlineEditForm
        user={user}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    )
  }

  const roleName   = user.role?.name || user.role?.code
  const branchName = branchMap[user.branchId] ?? user.branchId

  const infoTab = (
    <>
      {/* Fields */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <Field label={tc('username')}    value={<span style={{ fontFamily: 'monospace' }}>{user.username}</span>} />
          <Field label={tc('fullName')}    value={<b>{user.fullName}</b>} />
          <Field label={tc('phone')}       value={user.phone} />
          <Field label={tc('email')}       value={user.email} />
          <Field label={tc('dateOfBirth')} value={
            user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : undefined
          } />
          <Field label={tc('address')} value={user.address} />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <Field label={tc('role')}        value={<b>{roleName}</b>} />
          <Field label={tc('branchStore')} value={<b>{branchName}</b>} />
          <Field label={tc('counter')}     value={user.counterName} />
          <Field label={tc('status')}      value={
            <Badge variant={user.isActive ? 'default' : 'secondary'}>
              {user.isActive ? t('status.active') : t('status.inactive')}
            </Badge>
          } />
          <Field label={tc('createdAt')} value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : undefined
          } />
          <Field label={tc('lastLogin')} value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : undefined
          } />
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        paddingTop: 12, borderTop: '1px solid #e5e7eb',
      }}>
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>
          {tc('editInfo')}
        </Button>
        <Button size="small" icon={<LockOutlined />} onClick={() => onResetPassword(user)}>
          {tc('resetPassword')}
        </Button>

        <div style={{ width: 1, height: 18, background: '#e5e7eb' }} />

        {user.isActive ? (
          <Button size="small" danger icon={<StopOutlined />} onClick={() => onDeactivate(user)}>
            {tc('deactivate')}
          </Button>
        ) : (
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            style={{ color: '#16a34a', borderColor: '#16a34a' }}
            onClick={() => onActivate(user)}
          >
            {tc('activate')}
          </Button>
        )}

        <Popconfirm
          title={tf('confirmTitle')}
          description={tf('confirmDesc')}
          okText={tf('ok')}
          cancelText={tf('cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={() => onForceLogout(user)}
          placement="topRight"
        >
          <Button size="small" icon={<ThunderboltOutlined />} style={{ color: '#d97706', borderColor: '#d97706' }}>
            {tf('button')}
          </Button>
        </Popconfirm>
      </div>
    </>
  )

  return (
    <div style={{ padding: '16px 24px 20px', background: '#f8faff' }}>
      <Tabs
        defaultActiveKey="info"
        size="small"
        items={[
          {
            key: 'info',
            label: tt('info'),
            children: infoTab,
          },
          {
            key: 'activity',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <HistoryOutlined style={{ fontSize: 12 }} />
                {tt('activity')}
              </span>
            ),
            children: <UserActivityPanel userId={user.id} />,
          },
        ]}
      />
    </div>
  )
}
