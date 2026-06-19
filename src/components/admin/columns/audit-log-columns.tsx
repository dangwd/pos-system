'use client'

import type { TableColumnsType } from 'antd'
import { Tag } from 'antd'
import type { LoginAuditLog, LoginEventType } from '@/types/auth'

const EVENT_TAG_COLOR: Record<LoginEventType, string> = {
  LoginSuccess:               'success',
  LoginFailedBadCredentials:  'error',
  LoginFailedInactive:        'warning',
  Logout:                     'default',
  TokenRefreshed:             'processing',
  ForceLogout:                'volcano',
}

export interface AuditLogColumnLabels {
  username: string
  eventType: string
  ipAddress: string
  userAgent: string
  occurredAt: string
  unknownUser: string
  eventLabels: Record<LoginEventType, string>
}

export function createAuditLogColumns(labels: AuditLogColumnLabels): TableColumnsType<LoginAuditLog> {
  return [
    {
      title: labels.occurredAt,
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 160,
      render: (value: string) => (
        <span className="font-mono text-sm text-muted-foreground" style={{ whiteSpace: 'nowrap' }}>
          {new Date(value).toLocaleString('lo-LA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })}
        </span>
      ),
    },
    {
      title: labels.username,
      dataIndex: 'attemptedUsername',
      key: 'attemptedUsername',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-sm font-medium" style={{ whiteSpace: 'nowrap' }}>
          {value || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      title: labels.eventType,
      dataIndex: 'eventType',
      key: 'eventType',
      width: 200,
      render: (value: LoginEventType) => (
        <Tag color={EVENT_TAG_COLOR[value]} style={{ margin: 0, whiteSpace: 'nowrap' }}>
          {labels.eventLabels[value] ?? value}
        </Tag>
      ),
    },
    {
      title: labels.ipAddress,
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (value: string | null) => (
        <span className="font-mono text-sm" style={{ whiteSpace: 'nowrap' }}>
          {value ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      title: labels.userAgent,
      dataIndex: 'userAgent',
      key: 'userAgent',
      width: 380,
      render: (value: string | null) =>
        value ? (
          <span className="text-sm text-muted-foreground" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
            {value}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]
}
