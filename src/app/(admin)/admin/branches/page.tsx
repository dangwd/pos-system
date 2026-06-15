'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Building2, Layers, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { BranchUpsertDialog } from '@/components/admin/branches/BranchUpsertDialog'
import { CounterUpsertDialog } from '@/components/admin/branches/CounterUpsertDialog'
import { useBranches, useCounters, useDeactivateCounter, useActivateCounter } from '@/hooks/useBranches'
import { cn } from '@/lib/utils'
import type { Branch, Counter } from '@/types/branch'
import { Button as AntBtn } from 'antd'

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }

const PANEL_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const PANEL_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
  flexShrink: 0,
}

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
    <div style={PAGE_STYLE}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: branches.length })}
          </p>
        </div>
        <AntBtn type="primary" icon={<Plus size={14} />} onClick={openCreateBranch}>
          {t('addButton')}
        </AntBtn>
      </div>

      {/* ── Split panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16, minHeight: 500 }}>

        {/* ── Left: Branches ── */}
        <div style={PANEL_STYLE}>
          <div style={PANEL_HEADER_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={15} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {t('panelTitle')}
              </span>
              {branches.length > 0 && (
                <span style={{ fontSize: 11, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                  ({branches.length})
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: 16 }}><TablePageSkeleton cols={1} rows={5} /></div>
          ) : branches.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: '#9ca3af' }}>
              <Building2 size={28} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 13, margin: 0 }}>—</p>
            </div>
          ) : (
            <ul style={{ flex: 1, overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }}>
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
                    style={{ borderBottom: '1px solid #f3f4f6' }}
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

        {/* ── Right: Counters ── */}
        <div style={PANEL_STYLE}>
          <div style={PANEL_HEADER_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={15} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {selectedBranch
                  ? t('counters.title', { branchName: selectedBranch.name })
                  : t('counters.title', { branchName: '—' })}
              </span>
              {counters.length > 0 && (
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  ({counters.length})
                </span>
              )}
            </div>
            {selectedBranch && (
              <AntBtn size="small" icon={<Plus size={12} />} onClick={openCreateCounter}>
                {t('counters.addButton')}
              </AntBtn>
            )}
          </div>

          {!selectedBranch ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: '#9ca3af' }}>
              <Layers size={28} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 13, margin: 0 }}>{t('counters.selectPrompt')}</p>
            </div>
          ) : countersLoading ? (
            <div style={{ padding: 16 }}><TablePageSkeleton cols={1} rows={4} /></div>
          ) : counters.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 0', color: '#9ca3af' }}>
              <Layers size={28} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 13, margin: 0 }}>{t('counters.empty')}</p>
              <AntBtn size="small" icon={<Plus size={12} />} onClick={openCreateCounter}>
                {t('counters.addButton')}
              </AntBtn>
            </div>
          ) : (
            <ul style={{ flex: 1, overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }}>
              {counters.map(counter => (
                <li
                  key={counter.id}
                  className="flex items-center gap-3 px-4 py-3 group"
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
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

      {/* ── Dialogs ── */}
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
