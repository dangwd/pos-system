'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SafetyCertificateOutlined, MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Table, Button, Card, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  useRoles, usePermissions,
  useUpdateRolePermissions, useCreateRole, useUpdateRole, useDeleteRole,
} from '@/hooks/useConfig'
import type { AppRole, Permission } from '@/types/config'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'

// ─── Types ────────────────────────────────────────────────────────────────────

type PermEditTarget = AppRole | null
type InfoEditTarget = AppRole | null
type DeleteTarget  = AppRole | null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = []
    acc[p.group].push(p)
    return acc
  }, {})
}

// ─── PermissionsDialog ────────────────────────────────────────────────────────

function PermissionsDialog({
  role, allPermissions, onClose,
}: {
  role: AppRole | null
  allPermissions: Permission[]
  onClose: () => void
}) {
  const t = useTranslations('admin.roles')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissions.map((p) => p.id) ?? [])
  )
  const { mutate: updatePermissions, isPending } = useUpdateRolePermissions()

  const grouped = useMemo(() => groupPermissions(allPermissions), [allPermissions])

  function getPermName(perm: Permission) {
    const key = `permNames.${perm.code}` as Parameters<typeof t>[0]
    return t.has(key) ? t(key) : perm.name
  }

  function getGroupName(group: string) {
    const key = `groupNames.${group}` as Parameters<typeof t>[0]
    return t.has(key) ? t(key) : group
  }

  function togglePermission(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(perms: Permission[]) {
    const allChecked = perms.every((p) => selected.has(p.id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) perms.forEach((p) => next.delete(p.id))
      else perms.forEach((p) => next.add(p.id))
      return next
    })
  }

  function handleSave() {
    if (!role) return
    updatePermissions(
      { roleId: role.id, dto: { permissionIds: Array.from(selected) } },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!role} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] p-0"
        title={<span className="text-base">{t('editDialogTitle', { name: role?.name ?? '' })}</span>}
        footer={
          <>
            <Button onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button type="primary" onClick={handleSave} loading={isPending}>
              {t('saveButton')}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 shrink-0">
          <span className="text-xs text-muted-foreground">
            {selected.size} / {allPermissions.length} quyền được chọn
          </span>
          {selected.size < allPermissions.length && (
            <button
              onClick={() => setSelected(new Set(allPermissions.map((p) => p.id)))}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
            >
              Chọn tất cả
            </button>
          )}
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
            >
              Bỏ chọn tất cả
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm font-semibold mb-4">Phân quyền chức năng</p>
          {allPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">—</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(grouped).map(([group, perms]) => {
                const checkedCount = perms.filter((p) => selected.has(p.id)).length
                const allChecked = checkedCount === perms.length
                const someChecked = checkedCount > 0 && checkedCount < perms.length
                return (
                  <div key={group} className="rounded-lg border border-l-4 border-l-primary bg-card overflow-hidden shadow-card">
                    <div
                      className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGroup(perms)}
                    >
                      <Checkbox
                        checked={allChecked}
                        data-indeterminate={someChecked || undefined}
                        onCheckedChange={() => toggleGroup(perms)}
                        className="pointer-events-none shrink-0"
                      />
                      <span className="text-sm font-semibold text-primary truncate">
                        {getGroupName(group)}
                      </span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground shrink-0">
                        {checkedCount}/{perms.length}
                      </span>
                    </div>
                    <div>
                      {perms.map((perm) => {
                        const isChecked = selected.has(perm.id)
                        return (
                          <div
                            key={perm.id}
                            onClick={() => togglePermission(perm.id)}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 border-b last:border-0 cursor-pointer select-none transition-colors',
                              isChecked ? 'bg-primary/5' : 'hover:bg-muted/30',
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="pointer-events-none shrink-0"
                            />
                            <span className="text-sm truncate">{getPermName(perm)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── RoleFormDialog ───────────────────────────────────────────────────────────

function RoleFormDialog({
  target, onClose,
}: {
  target: InfoEditTarget | 'create'
  onClose: () => void
}) {
  const isCreate = target === 'create'
  const role = isCreate ? null : (target as AppRole | null)
  const t = useTranslations('admin.roles')

  const { mutate: createRole, isPending: isCreating } = useCreateRole()
  const { mutate: updateRole, isPending: isUpdating } = useUpdateRole()
  const isPending = isCreating || isUpdating
  const submitRef = useRef<() => { code: string; name: string; description: string } | null>(() => null)

  function handleSave() {
    const data = submitRef.current()
    if (!data) return
    if (isCreate) {
      createRole(
        { code: data.code.trim().toUpperCase(), name: data.name.trim(), description: data.description.trim() },
        { onSuccess: onClose },
      )
    } else if (role) {
      updateRole(
        { roleId: role.id, dto: { name: data.name.trim(), description: data.description.trim() } },
        { onSuccess: onClose },
      )
    }
  }

  const open = target !== null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={isCreate ? t('createDialogTitle') : t('editInfoDialogTitle')}
        footer={
          <>
            <Button onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button type="primary" onClick={handleSave} loading={isPending}>
              {t('saveButton')}
            </Button>
          </>
        }
      >
        {open && (
          <RoleFormBody
            key={isCreate ? 'create' : (role?.id ?? 'none')}
            isCreate={isCreate}
            role={role}
            submitRef={submitRef}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RoleFormBody({ isCreate, role, submitRef }: {
  isCreate: boolean
  role: AppRole | null
  submitRef: React.RefObject<() => { code: string; name: string; description: string } | null>
}) {
  const t = useTranslations('admin.roles')
  const [code, setCode] = useState(() => role?.code ?? '')
  const [name, setName] = useState(() => role?.name ?? '')
  const [description, setDescription] = useState(() => role?.description ?? '')

  submitRef.current = () =>
    name.trim() && (!isCreate || code.trim()) ? { code, name, description } : null

  return (
    <div className="space-y-4 py-2">
      {isCreate && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('fields.code')}</label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('fields.codePlaceholder')}
            className="font-mono uppercase"
            autoFocus
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('fields.name')}</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('fields.namePlaceholder')}
          autoFocus={!isCreate}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('fields.description')}</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('fields.descriptionPlaceholder')}
        />
      </div>
    </div>
  )
}

// ─── DeleteConfirmDialog ──────────────────────────────────────────────────────

function DeleteConfirmDialog({ role, onClose }: { role: DeleteTarget; onClose: () => void }) {
  const t = useTranslations('admin.roles')
  const { mutate: deleteRole, isPending } = useDeleteRole()

  function handleDelete() {
    if (!role) return
    deleteRole(role.id, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!role} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        title={t('deleteConfirmTitle', { name: role?.name ?? '' })}
        footer={
          <>
            <Button onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button danger type="primary" onClick={handleDelete} loading={isPending}>
              {t('deleteConfirmButton')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{t('deleteConfirmDescription')}</p>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type RoleRow = AppRole | { id: string; _divider: true; _label: string }

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}
const CODE_STYLE: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 13,
  color: '#4f46e5', fontWeight: 600, letterSpacing: '0.01em',
}

function isDivider(row: RoleRow): row is { id: string; _divider: true; _label: string } {
  return '_divider' in row
}

// colSpan = 0 ẩn cell, colSpan = 5 = tổng số cột → row header chiếm toàn bộ chiều ngang
const DIVIDER_CELL = { colSpan: 5 }
const HIDDEN_CELL  = { colSpan: 0 }

export default function RolesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.roles')

  const [permEditTarget, setPermEditTarget] = useState<PermEditTarget>(null)
  const [infoEditTarget, setInfoEditTarget] = useState<InfoEditTarget | 'create'>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<DeleteTarget>(null)

  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: allPermissions = [], isLoading: permsLoading } = usePermissions()
  const isLoading = rolesLoading || permsLoading

  // System roles trước, custom roles sau — mỗi nhóm có divider header
  const tableData = useMemo((): RoleRow[] => {
    const system = roles.filter(r => r.isSystem)
    const custom = roles.filter(r => !r.isSystem)
    const rows: RoleRow[] = []
    if (system.length > 0) {
      rows.push({ id: '__div_system', _divider: true, _label: t('sectionSystem') })
      rows.push(...system)
    }
    if (custom.length > 0) {
      rows.push({ id: '__div_custom', _divider: true, _label: t('sectionCustom') })
      rows.push(...custom)
    }
    return rows
  }, [roles, t])

  const columns = useMemo((): TableColumnsType<RoleRow> => [
    {
      title: t('columns.code'), dataIndex: 'code', width: 200,
      onCell: (row) => isDivider(row) ? DIVIDER_CELL : {},
      render: (_: unknown, row: RoleRow) => {
        if (isDivider(row)) {
          return (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {row._label}
            </span>
          )
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={CODE_STYLE}>{row.code}</span>
          </div>
        )
      },
    },
    {
      title: t('columns.name'), dataIndex: 'name',
      onCell: (row) => isDivider(row) ? HIDDEN_CELL : {},
      render: (_: unknown, row: RoleRow) => isDivider(row) ? null
        : <span style={{ fontWeight: 500 }}>{row.name}</span>,
    },
    {
      title: t('columns.description'), dataIndex: 'description', ellipsis: true,
      onCell: (row) => isDivider(row) ? HIDDEN_CELL : {},
      render: (_: unknown, row: RoleRow) => {
        if (isDivider(row)) return null
        return row.description
          ? <span style={{ color: '#6b7280', fontSize: 13 }}>{row.description}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: t('columns.permissions'), dataIndex: 'permissions', width: 150,
      onCell: (row) => isDivider(row) ? HIDDEN_CELL : {},
      render: (_: unknown, row: RoleRow) => {
        if (isDivider(row)) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}>
            <SafetyCertificateOutlined style={{ width: 14, height: 14, color: '#6366f1' }} />
            <span style={{ fontSize: 13 }}>{t('permissionsCount', { count: row.permissions.length })}</span>
          </div>
        )
      },
    },
    {
      title: '', key: 'actions', width: 160, align: 'right' as const,
      onCell: (row) => isDivider(row) ? HIDDEN_CELL : {},
      render: (_: unknown, row: RoleRow) => {
        if (isDivider(row)) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <Button size="small" onClick={() => setPermEditTarget(row)}>
              {t('editButton')}
            </Button>
            {!row.isSystem && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none">
                  <MoreOutlined className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem onClick={() => setInfoEditTarget(row)}>
                    <EditOutlined className="h-3.5 w-3.5" />
                    {t('editInfoButton')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>
                    <DeleteOutlined className="h-3.5 w-3.5" />
                    {t('deleteButton')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      },
    },
  ], [t])


  if (!hasPermission('USER_MANAGE')) return <ForbiddenPage />
  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{t('title')}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: roles.length })}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setInfoEditTarget('create')}>
          {t('createButton')}
        </Button>
      </div>

      {/* ── Bảng ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <Table<RoleRow>
          rowKey="id"
          columns={columns}
          dataSource={tableData}
          loading={isLoading}
          bordered
          size="middle"
          scroll={{ x: 800 }}
          rowClassName={(row) => isDivider(row) ? 'roles-divider-row' : ''}
          pagination={false}
        />
      </Card>

      <style>{`
        .roles-divider-row > td { background: #f8f9fb !important; padding-top: 8px !important; padding-bottom: 8px !important; border-bottom: 1px solid #e5e7eb !important; }
        .roles-divider-row:first-child > td { border-top: none !important; }
      `}</style>

      <PermissionsDialog
        key={permEditTarget?.id ?? 'none'}
        role={permEditTarget}
        allPermissions={allPermissions}
        onClose={() => setPermEditTarget(null)}
      />

      <RoleFormDialog
        target={infoEditTarget}
        onClose={() => setInfoEditTarget(null)}
      />

      <DeleteConfirmDialog
        role={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
