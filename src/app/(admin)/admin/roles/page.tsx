'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { cn } from '@/lib/utils'
import { useRoles, usePermissions, useUpdateRolePermissions } from '@/hooks/useConfig'
import type { AppRole, Permission } from '@/types/config'

type EditingRole = AppRole | null

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = []
    acc[p.group].push(p)
    return acc
  }, {})
}

export default function RolesPage() {
  const t = useTranslations('admin.roles')
  const [editingRole, setEditingRole] = useState<EditingRole>(null)

  function getPermName(perm: Permission): string {
    const key = `permNames.${perm.code}` as Parameters<typeof t>[0]
    return t.has(key) ? t(key) : perm.name
  }

  function getGroupName(group: string): string {
    const key = `groupNames.${group}` as Parameters<typeof t>[0]
    return t.has(key) ? t(key) : group
  }
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: allPermissions = [], isLoading: permsLoading } = usePermissions()
  const { mutate: updatePermissions, isPending } = useUpdateRolePermissions()

  const isLoading = rolesLoading || permsLoading

  function openEdit(role: AppRole) {
    setEditingRole(role)
    setSelected(new Set(role.permissions.map((p) => p.id)))
  }

  function closeEdit() {
    setEditingRole(null)
    setSelected(new Set())
  }

  function handleSave() {
    if (!editingRole) return
    updatePermissions(
      { roleId: editingRole.id, dto: { permissionIds: Array.from(selected) } },
      { onSuccess: closeEdit },
    )
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

  const grouped = useMemo(() => groupPermissions(allPermissions), [allPermissions])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle', { count: roles.length })}</p>
        </div>
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
              ) : (
                roles.map((role) => (
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
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(role)}>
                        {t('editButton')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editingRole} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogHeader>
              <DialogTitle className="text-base">{t('editDialogTitle', { name: editingRole?.name ?? '' })}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-3">
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
          </div>

          {/* Permission groups — 3-column card grid */}
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
                      {/* Card header */}
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

                      {/* Permission items */}
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

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={closeEdit} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('saveButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
