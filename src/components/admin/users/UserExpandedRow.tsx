'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from 'antd'
import {
  EditOutlined,
  LockOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { Badge } from '@/components/ui/badge'
import { UserInlineEditForm } from './UserInlineEditForm'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser
  branchMap: Record<string, string>
  onResetPassword:  (user: AdminUser) => void
  onActivate:       (user: AdminUser) => void
  onDeactivate:     (user: AdminUser) => void
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '9px 0',
      borderBottom: '1px solid #f3f4f6', fontSize: 13, alignItems: 'center',
    }}>
      <span style={{ minWidth: 170, color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#111827' }}>
        {value ?? <span style={{ color: '#d1d5db', fontWeight: 400 }}>—</span>}
      </span>
    </div>
  )
}

export function UserExpandedRow({
  user,
  branchMap,
  onResetPassword,
  onActivate,
  onDeactivate,
}: Props) {
  const t  = useTranslations('admin.users')
  const tc = useTranslations('admin.users.columns')
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

  const roleName = user.role?.name || user.role?.code
  const branchName = branchMap[user.branchId] ?? user.branchId

  return (
    <div style={{ padding: '12px 16px 4px 48px', background: '#f8faff' }}>
      {/* Thông tin chi tiết */}
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', paddingBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <Field label={tc('username')}    value={user.username} />
          <Field label={tc('fullName')}    value={<b>{user.fullName}</b>} />
          <Field label={tc('phone')}       value={user.phone} />
          <Field label={tc('email')}       value={user.email} />
          <Field label={tc('dateOfBirth')} value={
            user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : undefined
          } />
          <Field label={tc('address')}     value={user.address} />
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <Field label={tc('role')}        value={<b>{roleName}</b>} />
          <Field label={tc('branchStore')} value={<b>{branchName}</b>} />
          <Field label={tc('counter')}     value={user.counterName} />
          <Field label={tc('status')}      value={
            <Badge variant={user.isActive ? 'default' : 'secondary'}>
              {user.isActive ? t('status.active') : t('status.inactive')}
            </Badge>
          } />
          <Field label={tc('createdAt')}   value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : undefined
          } />
          <Field label={tc('lastLogin')}   value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : undefined
          } />
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        padding: '12px 0', borderTop: '1px solid #e5e7eb',
      }}>
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>
          {tc('editInfo')}
        </Button>
        <Button size="small" icon={<LockOutlined />} onClick={() => onResetPassword(user)}>
          {tc('resetPassword')}
        </Button>

        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />

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
      </div>
    </div>
  )
}
