'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, ShieldCheck, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Form } from 'antd'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { cn } from '@/lib/utils'
import {
  useRoles, usePermissions,
  useUpdateRolePermissions, useCreateRole, useUpdateRole, useDeleteRole,
} from '@/hooks/useConfig'
import type { AppRole, Permission } from '@/types/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type PermEditTarget = AppRole | null
type InfoEditTarget = AppRole | null   // null = create mode
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
        className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0"
        title={<span className="text-base">{t('editDialogTitle', { name: role?.name ?? '' })}</span>}
        footer={
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('saveButton')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 shrink-0">
          <span className="text-xs text-muted-foreground">
            {selected.size} / {allPermissions.length} quyền được chọn
          </span>
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
                  <div key={group} className="rounded-lg border border-l-4 border-l-primary bg-card overflow-hidden">
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

// ─── RoleFormDialog — Create & Edit Info ──────────────────────────────────────
// Outer: Dialog shell + mutations. Inner (RoleFormBody) is keyed so useState
// reinitialises whenever the target switches between create and different roles.

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
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('saveButton')}
            </Button>
          </DialogFooter>
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
    <Form layout="vertical" className="py-2">
      {isCreate && (
        <Form.Item label={t('fields.code')}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('fields.codePlaceholder')}
            className="font-mono uppercase"
            autoFocus
          />
        </Form.Item>
      )}
      <Form.Item label={t('fields.name')}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('fields.namePlaceholder')}
          autoFocus={!isCreate}
        />
      </Form.Item>
      <Form.Item label={t('fields.description')} style={{ marginBottom: 0 }}>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('fields.descriptionPlaceholder')}
        />
      </Form.Item>
    </Form>
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
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('deleteConfirmButton')}
            </Button>
          </DialogFooter>
        }
      >
        <p className="text-sm text-muted-foreground">{t('deleteConfirmDescription')}</p>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const t = useTranslations('admin.roles')

  const [permEditTarget, setPermEditTarget] = useState<PermEditTarget>(null)
  const [infoEditTarget, setInfoEditTarget] = useState<InfoEditTarget | 'create'>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: allPermissions = [], isLoading: permsLoading } = usePermissions()
  const isLoading = rolesLoading || permsLoading

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle', { count: roles.length })}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setInfoEditTarget('create')}>
          <Plus className="h-4 w-4" />
          {t('createButton')}
        </Button>
      </div>

      {isLoading ? <TablePageSkeleton cols={4} rows={5} /> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.code')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.name')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.description')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('columns.permissions')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
              ) : roles.map((role) => (
                <tr key={role.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{role.code}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('systemBadge')}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{role.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs">{role.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                      <span className="text-xs">{t('permissionsCount', { count: role.permissions.length })}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setPermEditTarget(role)}>
                        {t('editButton')}
                      </Button>
                      {!role.isSystem && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem onClick={() => setInfoEditTarget(role)}>
                              <Pencil className="h-3.5 w-3.5" />
                              {t('editInfoButton')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(role)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('deleteButton')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
