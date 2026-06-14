'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Building2, Layers, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { BranchUpsertDialog } from '@/components/admin/branches/BranchUpsertDialog'
import { CounterUpsertDialog } from '@/components/admin/branches/CounterUpsertDialog'
import { useBranches, useCounters, useDeactivateCounter, useActivateCounter } from '@/hooks/useBranches'
import { cn } from '@/lib/utils'
import type { Branch, Counter } from '@/types/branch'

export default function BranchesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.branches')

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [counterDialogOpen, setCounterDialogOpen] = useState(false)
  const [editingCounter, setEditingCounter] = useState<Counter | null>(null)

  const { data: branches = [], isLoading } = useBranches()
  const { data: counters = [], isLoading: countersLoading } = useCounters(selectedBranch?.id ?? null)
  const { mutate: deactivateCounter, isPending: deactivating } = useDeactivateCounter()
  const { mutate: activateCounter, isPending: activating } = useActivateCounter()

  function openCreateBranch() {
    setEditingBranch(null)
    setBranchDialogOpen(true)
  }

  function openEditBranch(branch: Branch, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingBranch(branch)
    setBranchDialogOpen(true)
  }

  function openCreateCounter() {
    setEditingCounter(null)
    setCounterDialogOpen(true)
  }

  function openEditCounter(counter: Counter) {
    setEditingCounter(counter)
    setCounterDialogOpen(true)
  }

  function handleDeactivateCounter(counter: Counter) {
    if (!selectedBranch) return
    deactivateCounter({ branchId: selectedBranch.id, counterId: counter.id })
  }

  function handleActivateCounter(counter: Counter) {
    if (!selectedBranch) return
    activateCounter({ branchId: selectedBranch.id, counterId: counter.id })
  }


  if (!hasPermission('BRANCH_MANAGE')) return <ForbiddenPage />
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('subtitle', { count: branches.length })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreateBranch}>
          <Plus className="h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {/* ── Left: Branches list ────────────────────────── */}
        <div className="col-span-2 rounded-lg border overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-4"><TablePageSkeleton cols={1} rows={5} /></div>
          ) : branches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">—</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y">
              {branches.map(branch => {
                const isSelected = selectedBranch?.id === branch.id
                return (
                  <li
                    key={branch.id}
                    onClick={() => setSelectedBranch(branch)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors group',
                      isSelected
                        ? 'bg-primary/8 border-l-2 border-primary'
                        : 'hover:bg-muted/40 border-l-2 border-transparent',
                    )}
                  >
                    <Building2 className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      isSelected ? 'text-primary' : 'text-muted-foreground',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          'text-sm font-medium truncate',
                          isSelected && 'text-primary',
                        )}>
                          {branch.name}
                        </span>
                        {branch.isHeadquarters && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            {t('hqBadge')}
                          </Badge>
                        )}
                        {!branch.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                            {t('inactive')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{branch.address}</p>
                      <p className="text-xs text-muted-foreground font-mono">{branch.phone}</p>
                    </div>
                    <button
                      onClick={e => openEditBranch(branch, e)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Right: Counters ─────────────────────────────── */}
        <div className="col-span-3 rounded-lg border overflow-hidden flex flex-col">
          {/* Counters header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedBranch
                  ? t('counters.title', { branchName: selectedBranch.name })
                  : t('counters.title', { branchName: '—' })}
              </span>
            </div>
            {selectedBranch && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openCreateCounter}>
                <Plus className="h-3.5 w-3.5" />
                {t('counters.addButton')}
              </Button>
            )}
          </div>

          {/* Counters body */}
          {!selectedBranch ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Layers className="h-8 w-8 opacity-30" />
              <p className="text-sm">{t('counters.selectPrompt')}</p>
            </div>
          ) : countersLoading ? (
            <div className="p-4"><TablePageSkeleton cols={1} rows={4} /></div>
          ) : counters.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Layers className="h-8 w-8 opacity-30" />
              <p className="text-sm">{t('counters.empty')}</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreateCounter}>
                <Plus className="h-3.5 w-3.5" />
                {t('counters.addButton')}
              </Button>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y">
              {counters.map(counter => (
                <li key={counter.id} className="flex items-center gap-3 px-4 py-3 group">
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', !counter.isActive && 'text-muted-foreground')}>
                      {counter.counterName}
                    </p>
                  </div>
                  <Badge
                    variant={counter.isActive ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {counter.isActive ? t('counters.active') : t('counters.inactive')}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditCounter(counter)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
                      title={t('counters.edit')}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {counter.isActive ? (
                      <button
                        onClick={() => handleDeactivateCounter(counter)}
                        disabled={deactivating}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10"
                        title={t('counters.deactivate')}
                      >
                        {deactivating
                          ? <Spinner className="h-3 w-3" />
                          : <PowerOff className="h-3 w-3 text-destructive" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateCounter(counter)}
                        disabled={activating}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-primary/10"
                        title={t('counters.activate')}
                      >
                        {activating
                          ? <Spinner className="h-3 w-3" />
                          : <Power className="h-3 w-3 text-primary" />}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BranchUpsertDialog
        open={branchDialogOpen}
        branch={editingBranch}
        onClose={() => setBranchDialogOpen(false)}
      />
      {selectedBranch && (
        <CounterUpsertDialog
          open={counterDialogOpen}
          branchId={selectedBranch.id}
          branchName={selectedBranch.name}
          counter={editingCounter}
          onClose={() => setCounterDialogOpen(false)}
        />
      )}
    </div>
  )
}
