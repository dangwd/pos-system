// StockInProductPickerModal — picker chọn mặt hàng (infinite scroll)
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Table, Input, Select, Tag, Spin } from 'antd'
import type { TableColumnsType } from 'antd'
import { useInventoryInfinite } from '@/hooks/useInventory'
import { useWeightUnits } from '@/hooks/useConfig'
import type { InventoryItem } from '@/types/inventory'

interface Props {
  open: boolean
  branchId: string | null
  counterId: string | null
  selectedIds: string[]
  onConfirm: (items: InventoryItem[]) => void
  onCancel: () => void
}

const PAGE_SIZE = 50
// ~15 dòng × 38 px/dòng (antd small)
const SCROLL_HEIGHT = 570

export function StockInProductPickerModal({ open, branchId, counterId, selectedIds, onConfirm, onCancel }: Props) {
  const t = useTranslations('admin.inventory.stockInPicker')

  const [search, setSearch]                 = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [draftKeys, setDraftKeys]           = useState<string[]>([])

  // Map weightUnitId → tên đơn vị ("Chỉ", "Lượng"...)
  const { data: weightUnits = [] } = useWeightUnits()
  const unitMap = useMemo(
    () => new Map(weightUnits.map(u => [u.id, u.tenDonVi])),
    [weightUnits],
  )

  // ── Data — useInfiniteQuery tự tích lũy trang ──────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInventoryInfinite({
    branchId: branchId ?? undefined,
    counterId: counterId ?? undefined,
    keyword: search.trim() || undefined,
    pageSize: PAGE_SIZE,
  })

  // Tất cả rows đã load (TanStack Query tự reset khi params thay đổi)
  const allRows = useMemo(
    () => data?.pages.flatMap(p => p.data) ?? [],
    [data],
  )

  // itemMap để lookup khi confirm
  const itemMap = useMemo(
    () => new Map(allRows.map(r => [r.id, r])),
    [allRows],
  )

  const total = data?.pages[0]?.total ?? 0

  // ── Reset draft selection khi mở modal ─────────────────
  useEffect(() => {
    if (open) {
      setDraftKeys(selectedIds)
      setSearch('')
      setCategoryFilter(null)
    }
  }, [open, selectedIds])

  // ── Scroll handler — fetchNextPage khi gần đáy ─────────
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120
    if (nearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  // ── Client-side filter theo danh mục ────────────────────
  const filtered = useMemo(() => (
    categoryFilter ? allRows.filter(r => r.category === categoryFilter) : allRows
  ), [allRows, categoryFilter])

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(allRows.map(r => r.category).filter(Boolean)))
    return cats.map(c => ({ value: c, label: c }))
  }, [allRows])

  // ── Columns ─────────────────────────────────────────────
  const columns: TableColumnsType<InventoryItem> = [
    { title: '#', width: 50, render: (_v: unknown, _r: InventoryItem, i: number) => i + 1 },
    { title: t('colCode'), dataIndex: 'productCode', width: 110 },
    { title: t('colName'), dataIndex: 'productName' },
    { title: t('colCounter'), dataIndex: 'counterName', width: 130 },
    { title: t('colCategory'), dataIndex: 'category', width: 140 },
    { title: t('colPurity'), dataIndex: 'purity', width: 90, render: (v: string | null) => v ?? '—' },
    {
      title: t('colUnit'), dataIndex: 'weightUnitId', width: 90,
      render: (v: string | null) => (v ? unitMap.get(v) : null) ?? '—',
    },
    { title: t('colStock'), dataIndex: 'quantity', width: 70, align: 'right' as const },
    {
      title: t('colStatus'), width: 120,
      render: () => <Tag color="green">{t('statusActive')}</Tag>,
    },
  ]

  function handleConfirm() {
    const selected = draftKeys.map(id => itemMap.get(id)).filter((x): x is InventoryItem => !!x)
    onConfirm(selected)
  }

  return (
    <Modal
      open={open}
      title={
        <span>
          {t('title')}
          {draftKeys.length > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {t('selectedBadge', { count: draftKeys.length })}
            </Tag>
          )}
        </span>
      }
      width={1200}
      style={{ top: 30 }}
      zIndex={1010}
      mask={{ closable: false }}
      destroyOnHidden={false}
      onCancel={onCancel}
      okText={t('confirmBtn')}
      cancelText={t('cancelBtn')}
      onOk={handleConfirm}
    >
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input.Search
          placeholder={t('searchPlaceholder')}
          allowClear
          style={{ flex: 1 }}
          onSearch={v => setSearch(v)}
          onChange={e => { if (!e.target.value) setSearch('') }}
        />
        <Select
          allowClear
          placeholder={t('allGroups')}
          style={{ width: 180 }}
          options={categoryOptions}
          value={categoryFilter}
          onChange={v => setCategoryFilter(v ?? null)}
        />
      </div>

      {/* Scroll container — wrapper div làm scroll container */}
      <div
        style={{
          maxHeight: SCROLL_HEIGHT,
          overflowY: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
        }}
        onScroll={handleScroll}
      >
        <Table<InventoryItem>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          size="small"
          sticky
          pagination={false}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: draftKeys,
            onChange: keys => setDraftKeys(keys as string[]),
          }}
        />

        {/* Spinner khi load thêm trang */}
        {isFetchingNextPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0', gap: 8, color: '#6b7280', fontSize: 13 }}>
            <Spin size="small" />
            <span>Đang tải thêm...</span>
          </div>
        )}

        {/* Hết danh sách */}
        {!hasNextPage && allRows.length > 0 && !isFetchingNextPage && (
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#9ca3af', fontSize: 12, borderTop: '1px solid #f0f0f0' }}>
            ✓ Đã tải hết — {allRows.length} / {total} sản phẩm
          </div>
        )}
      </div>

      {/* Tổng kết quả */}
      <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
        {t('totalResults', { count: total })}
        {allRows.length > 0 && allRows.length < total && ` · Đã tải ${allRows.length}`}
      </div>
    </Modal>
  )
}
