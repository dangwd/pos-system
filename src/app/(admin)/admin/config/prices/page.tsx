'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  PlusOutlined,
  EyeOutlined,
  CopyOutlined,
  GlobalOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { Button as AntButton, Tooltip } from 'antd'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/DataTable'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { usePermission } from '@/hooks/usePermission'
import { usePriceTables } from '@/hooks/useConfig'
import { useBranches } from '@/hooks/useBranches'
import { PriceTableDetailDialog } from '@/components/admin/config/PriceTableDetailDialog'
import { PriceTableFormDialog } from '@/components/admin/config/PriceTableFormDialog'
import type { ColumnsType } from '@/components/shared/DataTable'
import type { PriceTable } from '@/types/config'

function AvatarChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[11px] font-medium select-none shrink-0"
      style={{ width: 22, height: 22, background: '#D3D1C7', color: '#2C2C2A' }}
    >
      {(name ?? '').charAt(0).toUpperCase() || '?'}
    </span>
  )
}

function ScopeCell({
  row, branchMap, t,
}: {
  row: PriceTable
  branchMap: Record<string, string>
  t: ReturnType<typeof useTranslations>
}) {
  if (row.scope === 'all') {
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <GlobalOutlined className="text-muted-foreground" />
        <span className="text-muted-foreground text-xs">{t('scopeAll')}</span>
      </span>
    )
  }

  const shown = row.branches.slice(0, 3)
  const rest  = row.branches.length - shown.length

  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      <ShopOutlined className="text-muted-foreground shrink-0" />
      {shown.map((id) => (
        <span
          key={id}
          className="px-1.5 py-0.5 text-xs rounded-full"
          style={{ background: '#E6F1FB', color: '#0C447C' }}
        >
          {branchMap[id] ?? id}
        </span>
      ))}
      {rest > 0 && <span className="text-xs text-muted-foreground">+{rest}</span>}
    </span>
  )
}

export default function PricesPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.config.prices')

  const { data: tables = [], isLoading } = usePriceTables()
  const { data: branches = [] }          = useBranches()

  const [detailTable, setDetailTable] = useState<PriceTable | null>(null)
  const [formOpen,    setFormOpen]    = useState(false)
  const [copySource,  setCopySource]  = useState<PriceTable | null>(null)

  const branchMap = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches],
  )

  function openCreate() { setCopySource(null); setFormOpen(true) }
  function openCopy(src: PriceTable) { setCopySource(src); setDetailTable(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setCopySource(null) }

  const columns: ColumnsType<PriceTable> = useMemo(() => [
    {
      title:     t('columns.name'),
      dataIndex: 'name',
      key:       'name',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: t('columns.scope'),
      key:   'scope',
      render: (_: unknown, row: PriceTable) => (
        <ScopeCell row={row} branchMap={branchMap} t={t} />
      ),
    },
    {
      title: t('columns.createdBy'),
      key:   'createdBy',
      render: (_: unknown, row: PriceTable) => (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AvatarChip name={row.createdBy} />
          {row.createdBy || '—'}
        </span>
      ),
    },
    {
      title:     t('columns.updatedAt'),
      dataIndex: 'updatedAt',
      key:       'updatedAt',
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">{new Date(v).toLocaleString('lo-LA')}</span>
      ),
    },
    {
      title: t('columns.status'),
      key:   'active',
      render: (_: unknown, row: PriceTable) => (
        <Badge
          className={row.active ? 'bg-green-100 text-green-800 border-green-200' : ''}
          variant={row.active ? 'outline' : 'secondary'}
        >
          {row.active ? t('statusActive') : t('statusInactive')}
        </Badge>
      ),
    },
    {
      title: '',
      key:   'actions',
      width: 80,
      render: (_: unknown, row: PriceTable) => (
        <span className="flex items-center gap-1">
          <Tooltip title={t('view')}>
            <AntButton size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailTable(row)} />
          </Tooltip>
          <Tooltip title={t('copy')}>
            <AntButton size="small" type="text" icon={<CopyOutlined />} onClick={() => openCopy(row)} />
          </Tooltip>
        </span>
      ),
    },
  ], [t, branchMap])

  if (!hasPermission('CONFIG_PRICE')) return <ForbiddenPage />

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <PlusOutlined className="h-3.5 w-3.5 mr-1.5" />
          {t('createButton')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={tables}
        loading={isLoading}
        searchKey="name"
        maxHeight={false}
      />

      {detailTable && (
        <PriceTableDetailDialog
          table={detailTable}
          branchMap={branchMap}
          onCopy={() => openCopy(detailTable)}
          onClose={() => setDetailTable(null)}
        />
      )}

      <PriceTableFormDialog
        open={formOpen}
        copySource={copySource}
        branches={branches}
        onClose={closeForm}
      />
    </div>
  )
}
