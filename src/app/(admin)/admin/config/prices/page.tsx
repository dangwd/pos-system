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
import { Table, Button, Card, Input } from 'antd'
import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { usePermission } from '@/hooks/usePermission'
import { usePriceTables } from '@/hooks/useConfig'
import { useBranches } from '@/hooks/useBranches'
import { PriceTableDetailDialog } from '@/components/admin/config/PriceTableDetailDialog'
import { PriceTableFormDialog } from '@/components/admin/config/PriceTableFormDialog'
import type { PriceTable } from '@/types/config'

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '14px 16px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
  flexWrap: 'wrap',
}

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

  const [search,      setSearch]      = useState('')
  const [detailTable, setDetailTable] = useState<PriceTable | null>(null)
  const [formOpen,    setFormOpen]    = useState(false)
  const [copySource,  setCopySource]  = useState<PriceTable | null>(null)

  const branchMap = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return tables
    const q = search.toLowerCase()
    return tables.filter(r => r.name.toLowerCase().includes(q))
  }, [tables, search])

  function openCreate() { setCopySource(null); setFormOpen(true) }
  function openCopy(src: PriceTable) { setCopySource(src); setDetailTable(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setCopySource(null) }

  const columns: TableColumnsType<PriceTable> = useMemo(() => [
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
          <button
            type="button"
            title={t('view')}
            onClick={() => setDetailTable(row)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <EyeOutlined className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t('copy')}
            onClick={() => openCopy(row)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <CopyOutlined className="h-3.5 w-3.5" />
          </button>
        </span>
      ),
    },
  ], [t, branchMap])

  if (!hasPermission('CONFIG_PRICE')) return <ForbiddenPage />

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle')}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('createButton')}
        </Button>
      </div>

      {/* ── Bảng ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <div style={FILTER_STYLE}>
          <Input.Search
            placeholder={t('searchPlaceholder')}
            allowClear
            style={{ width: 260 }}
            value={search}
            onSearch={setSearch}
            onChange={(e) => { if (!e.target.value) setSearch('') }}
          />
        </div>
        <Table<PriceTable>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, [from, to]) => `${from}–${to} / ${total}`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

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
