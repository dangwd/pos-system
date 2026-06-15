'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Button, Input, Select, Card } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createUserColumns } from '@/components/admin/columns/user-columns'
import { UserCreateDialog } from '@/components/admin/users/UserCreateDialog'
import { UserEditInfoDialog } from '@/components/admin/users/UserEditInfoDialog'
import { UserEditRoleDialog } from '@/components/admin/users/UserEditRoleDialog'
import { UserResetPasswordDialog } from '@/components/admin/users/UserResetPasswordDialog'
import { UserAssignCounterDialog } from '@/components/admin/users/UserAssignCounterDialog'
import { useUsersPaged, useActivateUser, useDeactivateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import type { AdminUser } from '@/types/admin-user'

const PAGE_SIZE = 20

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '14px 16px',
  borderBottom: '1px solid #f0f0f0', background: '#fafafa',
  flexWrap: 'wrap',
}

export default function UsersPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.users')

  const [createOpen,          setCreateOpen]          = useState(false)
  const [editInfoUser,        setEditInfoUser]        = useState<AdminUser | null>(null)
  const [editRoleUser,        setEditRoleUser]        = useState<AdminUser | null>(null)
  const [resetPwUser,         setResetPwUser]         = useState<AdminUser | null>(null)
  const [assignCounterUser,   setAssignCounterUser]   = useState<AdminUser | null>(null)

  const [keyword,         setKeyword]         = useState('')
  const [filterBranchId,  setFilterBranchId]  = useState<string | null>(null)
  const [filterIsActive,  setFilterIsActive]  = useState<string | null>(null)
  const [page,            setPage]            = useState(1)

  const { data: branches = [] } = useBranches()
  const branchMap = useMemo(
    () => Object.fromEntries(branches.map(b => [b.id, b.name])),
    [branches],
  )

  const { data, isLoading } = useUsersPaged({
    branchId:  filterBranchId ?? undefined,
    search:    keyword || undefined,
    isActive:  filterIsActive !== null ? (filterIsActive === 'active') : undefined,
    page,
    pageSize:  PAGE_SIZE,
  })
  const users = data?.data ?? []

  const { mutate: activate }   = useActivateUser()
  const { mutate: deactivate } = useDeactivateUser()

  const columns = useMemo(() => createUserColumns(
    {
      employeeCode:   t('columns.employeeCode'),
      fullName:       t('columns.fullName'),
      phone:          t('columns.phone'),
      branch:         t('columns.branch'),
      counter:        t('columns.counter'),
      role:           t('columns.role'),
      status:         t('columns.status'),
      lastLogin:      t('columns.lastLogin'),
      openMenu:       t('columns.openMenu'),
      viewDetail:     t('columns.viewDetail'),
      editInfo:       t('columns.editInfo'),
      editRole:       t('columns.editRole'),
      activate:       t('columns.activate'),
      deactivate:     t('columns.deactivate'),
      resetPassword:  t('columns.resetPassword'),
      assignCounter:  t('columns.assignCounter'),
      active:         t('status.active'),
      inactive:       t('status.inactive'),
      branchMap,
      roleLabels: {
        Cashier:     t('roles.Cashier'),
        ThuQuy:      t('roles.ThuQuy'),
        Manager:     t('roles.Manager'),
        SystemAdmin: t('roles.SystemAdmin'),
      },
    },
    (user) => setEditInfoUser(user),
    (user) => setEditRoleUser(user),
    (user) => activate(user.id),
    (user) => deactivate(user.id),
    (user) => setResetPwUser(user),
    (user) => setAssignCounterUser(user),
  ), [t, branchMap, activate, deactivate])


  if (!hasPermission('USER_MANAGE')) return <ForbiddenPage />
  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: data?.total ?? 0 })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder={t('searchPlaceholder')}
            allowClear
            style={{ width: 230 }}
            onSearch={v => { setKeyword(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setKeyword(''); setPage(1) } }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t('addButton')}
          </Button>
        </div>
      </div>

      {/* ── Bảng ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0 } }}>
        <div style={FILTER_STYLE}>
          <Select
            allowClear
            placeholder={t('filterAll')}
            style={{ width: 200 }}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={filterBranchId || undefined}
            popupMatchSelectWidth={false}
            onChange={v => { setFilterBranchId(v ?? null); setPage(1) }}
          />
          <Select
            allowClear
            placeholder={t('filterAllStatus')}
            style={{ width: 160 }}
            options={[
              { value: 'active',   label: t('status.active') },
              { value: 'inactive', label: t('status.inactive') },
            ]}
            value={filterIsActive || undefined}
            popupMatchSelectWidth={false}
            onChange={v => { setFilterIsActive(v ?? null); setPage(1) }}
          />
        </div>

        <Table<AdminUser>
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={isLoading}
          bordered
          size="middle"
          scroll={{ x: 1000 }}
          rowClassName={(_, i) => i % 2 !== 0 ? 'users-row-alt' : ''}
          pagination={{
            total:    data?.total,
            current:  page,
            pageSize: PAGE_SIZE,
            onChange: p => setPage(p),
            showSizeChanger:  true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, [from, to]) => `${from}–${to} / ${total} bản ghi`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.users-row-alt > td { background: #fafafa !important; }`}</style>

      <UserCreateDialog          open={createOpen}              onClose={() => setCreateOpen(false)} />
      <UserEditInfoDialog        user={editInfoUser}            onClose={() => setEditInfoUser(null)} />
      <UserEditRoleDialog        user={editRoleUser}            onClose={() => setEditRoleUser(null)} />
      <UserResetPasswordDialog   user={resetPwUser}             onClose={() => setResetPwUser(null)} />
      <UserAssignCounterDialog   user={assignCounterUser}       onClose={() => setAssignCounterUser(null)} />
    </div>
  )
}
