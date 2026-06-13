/**
 * DataTable — Generic antd Table wrapper
 *
 * Two pagination modes:
 *   Client-side (default):  antd handles paging internally
 *   Server-side:            pass `serverPagination` → controlled pagination + sort callbacks
 *
 * Usage:
 *   Client-side: <DataTable columns={cols} data={rows} searchKey="name" />
 *   Server-side: <DataTable columns={cols} data={pageRows} hideSearch serverPagination={{...}} />
 */

'use client'

import { useState } from 'react'
import { Table } from 'antd'
import type { TableColumnsType, TablePaginationConfig, TableProps } from 'antd'
import type { SorterResult } from 'antd/es/table/interface'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

// Re-export so column files can import from one place
export type { TableColumnsType as ColumnsType }

// ─── Server pagination contract ───────────────────────────────────────────────

interface ServerPagination {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string | null, order: 'asc' | 'desc' | null) => void
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableProps<TData extends object> {
  columns: TableColumnsType<TData>
  data: TData[]
  /** Field or getter used as React key — defaults to 'id' */
  rowKey?: string | ((row: TData) => string)
  /** Column accessor key for client-side search filter */
  searchKey?: string
  searchPlaceholder?: string
  /** Client-side rows per page — default 10 */
  pageSize?: number
  /** Page size choices — default [10, 20, 50] */
  pageSizeOptions?: number[]
  /** Hide the built-in search input */
  hideSearch?: boolean
  /** When provided, switches to server-side (manual) pagination */
  serverPagination?: ServerPagination
  /**
   * Max height for the scrollable table body.
   * - string (e.g. "500px"): sets vertical scroll at that height
   * - false: no fixed height, table grows with content
   * - default: "500px"
   */
  maxHeight?: string | false
  /** Show loading overlay */
  loading?: boolean
  /** When provided, rows become expandable to show a custom panel below */
  renderSubRow?: (row: TData) => React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE_OPTIONS = ['10', '20', '50']

export function DataTable<TData extends object>({
  columns,
  data,
  rowKey = 'id',
  searchKey,
  searchPlaceholder,
  pageSize = 10,
  pageSizeOptions,
  hideSearch,
  serverPagination,
  maxHeight = 'calc(100vh - 280px)',
  loading,
  renderSubRow,
}: DataTableProps<TData>) {
  const t = useTranslations('common.table')
  const [searchValue, setSearchValue] = useState('')

  const sizeOptions = (pageSizeOptions ?? [10, 20, 50]).map(String)

  // Client-side search filter
  const filteredData =
    searchKey && searchValue
      ? data.filter((row) => {
          const val = (row as Record<string, unknown>)[searchKey]
          return String(val ?? '').toLowerCase().includes(searchValue.toLowerCase())
        })
      : data

  // Pagination config
  const pagination: TablePaginationConfig = serverPagination
    ? {
        total: serverPagination.total,
        current: serverPagination.page,
        pageSize: serverPagination.pageSize,
        pageSizeOptions: sizeOptions,
        showSizeChanger: true,
        showTotal: (total) => `${t('results', { count: total })}`,
      }
    : {
        pageSize,
        pageSizeOptions: sizeOptions,
        showSizeChanger: true,
        showTotal: (total) => `${t('results', { count: total })}`,
      }

  const handleTableChange: TableProps<TData>['onChange'] = (
    paginationInfo,
    _filters,
    sorter,
    extra,
  ) => {
    if (!serverPagination) return
    const sp = serverPagination

    if (extra.action === 'sort') {
      const s = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<TData>)
      sp.onSortChange?.(
        s?.field != null ? String(s.field) : null,
        s?.order === 'ascend' ? 'asc' : s?.order === 'descend' ? 'desc' : null,
      )
      return
    }

    const newPage = paginationInfo.current ?? 1
    const newSize = paginationInfo.pageSize ?? sp.pageSize
    if (newSize !== sp.pageSize) {
      sp.onPageSizeChange?.(newSize)
      sp.onPageChange(1)
    } else {
      sp.onPageChange(newPage)
    }
  }

  return (
    <div className="space-y-3">
      {!hideSearch && (
        <Input
          placeholder={searchPlaceholder ?? t('searchPlaceholder')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="max-w-sm"
        />
      )}

      <Table<TData>
        columns={columns}
        dataSource={filteredData}
        rowKey={rowKey as string}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={maxHeight ? { x: 'max-content', y: maxHeight } : { x: 'max-content' }}
        size="small"
        expandable={
          renderSubRow
            ? {
                expandedRowRender: (record) => renderSubRow(record),
                rowExpandable: () => true,
              }
            : undefined
        }
      />
    </div>
  )
}
