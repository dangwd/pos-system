'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Boxes, PackagePlus } from 'lucide-react'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { InventoryCatalog } from '@/components/admin/inventory/InventoryCatalog'
import { InventoryDeclareForm } from '@/components/admin/inventory/InventoryDeclareForm'
import { InventoryAdjustPanel } from '@/components/admin/inventory/InventoryAdjustPanel'
import { InventoryActivityLog } from '@/components/admin/inventory/InventoryActivityLog'
import { InventoryStatusDialog } from '@/components/admin/inventory/InventoryStatusDialog'
import { useBranches } from '@/hooks/useBranches'
import { useInventoryValuation } from '@/hooks/useInventory'
import { lakToForeign, findRate } from '@/lib/inventory-valuation'
import { useAuthStore } from '@/stores/auth.store'
import type { InventoryItem } from '@/types/inventory'

type Tab = 'catalog' | 'declare'

export default function InventoryPage() {
  const t = useTranslations('admin.inventory')
  const user = useAuthStore(s => s.user)

  // Phân quyền (§14): INVENTORY_MANAGE để điều chỉnh kho; PRODUCT_MANAGE để khai báo SP.
  const canManage = !!user?.permissions.includes('INVENTORY_MANAGE')
  const canDeclare = !!user?.permissions.includes('PRODUCT_MANAGE')

  const [tab, setTab] = useState<Tab>('catalog')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [statusItem, setStatusItem] = useState<InventoryItem | null>(null)

  const { data: branches = [] } = useBranches()
  // Mặc định theo chi nhánh của người dùng (§9.1 — tồn kho theo chi nhánh).
  const effectiveBranchId = branchId ?? user?.branchId ?? branches[0]?.id ?? null
  const branchName = branches.find(b => b.id === effectiveBranchId)?.name ?? '—'
  const activeTab: Tab = tab === 'declare' && !canDeclare ? 'catalog' : tab

  const { items, totals, rates } = useInventoryValuation(effectiveBranchId)
  const totalAssetLak = totals.totalAssetLak.toLocaleString('lo-LA', { maximumFractionDigits: 0 })
  const usdTotal = lakToForeign(totals.totalAssetLak, findRate(rates, 'USD'))

  return (
    <div className="p-4 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2">
        <div className="flex items-center gap-1.5">
          <TabButton active={activeTab === 'catalog'} onClick={() => setTab('catalog')} icon={<Boxes className="h-4 w-4" />}>
            {t('tabs.catalog', { count: items.length })}
          </TabButton>
          {canDeclare && (
            <TabButton active={activeTab === 'declare'} onClick={() => setTab('declare')} icon={<PackagePlus className="h-4 w-4" />}>
              {t('tabs.declare')}
            </TabButton>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ComboboxSelect
            value={effectiveBranchId}
            onChange={setBranchId}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            placeholder={t('filterBranch')}
            className="w-48"
          />
          <div className="text-right">
            <span className="text-xs text-muted-foreground">{t('totalAsset')}: </span>
            <span className="font-bold text-primary tabular-nums">{totalAssetLak} ₭</span>
            <span className="ml-1 text-xs text-muted-foreground">(~{usdTotal == null ? 'N/A' : usdTotal.toLocaleString('lo-LA', { maximumFractionDigits: 0 })} USD)</span>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {activeTab === 'catalog' ? (
            <InventoryCatalog
              branchId={effectiveBranchId}
              branchName={branchName}
              onEditItem={canManage ? item => setSelectedItemId(item.id) : undefined}
            />
          ) : (
            <InventoryDeclareForm onBack={() => setTab('catalog')} />
          )}
        </div>

        <aside className="space-y-4">
          {canManage && (
            <InventoryAdjustPanel
              branchId={effectiveBranchId}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onChangeStatus={setStatusItem}
            />
          )}
          <InventoryActivityLog branchId={effectiveBranchId} branchName={branchName} />
        </aside>
      </div>

      <InventoryStatusDialog item={statusItem} onClose={() => setStatusItem(null)} />
    </div>
  )
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
