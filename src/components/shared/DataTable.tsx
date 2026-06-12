/**
 * DataTable — Generic reusable table component (TanStack Table v8)
 *
 * Two pagination modes:
 *   Client-side (default):  getPaginationRowModel handles slicing, internal state
 *   Server-side:            pass `serverPagination` → manualPagination:true, external page state
 *
 * Usage:
 *   Client-side: <DataTable columns={cols} data={rows} searchKey="name" />
 *   Server-side: <DataTable columns={cols} data={pageRows} hideSearch serverPagination={{...}} />
 */

'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type OnChangeFn,
  type Row,
  type Table as TanstackTable,
} from '@tanstack/react-table'
import { Select } from 'antd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Empty, EmptyTitle } from '@/components/ui/empty'

// ─── Generic expand panel ─────────────────────────────────────────────────────
// Renders all visible column headers + cell values in a 3-col responsive grid.
// Used when `expandable` is true but no custom `renderSubRow` is provided.

function GenericSubRow<TData>({
  row,
  table,
}: {
  row: Row<TData>
  table: TanstackTable<TData>
}) {
  const headers = table.getFlatHeaders()
  const cells = row.getVisibleCells()
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-6 py-4 sm:grid-cols-3 lg:grid-cols-4">
      {cells.map(cell => {
        const header = headers.find(h => h.id === cell.column.id)
        const headerNode = header
          ? flexRender(header.column.columnDef.header, header.getContext())
          : cell.column.id
        return (
          <div key={cell.id} className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {headerNode}
            </span>
            <span className="text-sm truncate">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Returns page numbers with '...' gaps: e.g. [1, '...', 4, 5, 6, '...', 20]
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ServerPagination {
  /** Total record count from backend */
  total: number
  /** Current 1-indexed page number */
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string | null, order: 'asc' | 'desc' | null) => void
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  /** Column accessor key for column-level filter (overrides globalFilter) */
  searchKey?: string
  searchPlaceholder?: string
  /** Client-side rows per page — default 10 */
  pageSize?: number
  /** Page size choices shown in the selector — default [10, 20, 50] */
  pageSizeOptions?: number[]
  /** Hide the built-in search input (use when parent provides server-side search) */
  hideSearch?: boolean
  /**
   * When provided, switches to server-side (manual) pagination.
   * DataTable uses manualPagination:true — data must already be the current page's rows.
   */
  serverPagination?: ServerPagination
  /**
   * Max height for the scrollable table body.
   * - string (e.g. "500px", "calc(100vh - 300px)"): clamps the table to that height
   * - false: table grows to fill the parent (parent must be a flex/height container)
   * - default: "500px"
   */
  maxHeight?: string | false
  /** Show loading overlay (use isFetching for background refetch) */
  loading?: boolean
  /**
   * When provided, rows become clickable and expand to show a custom panel below.
   * Only one row is expanded at a time. Clicking the same row collapses it.
   */
  renderSubRow?: (row: TData) => React.ReactNode
  /**
   * When true (and no renderSubRow), clicking a row expands a generic key-value
   * detail panel showing all visible column headers + cell values.
   */
  expandable?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50]

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  hideSearch,
  serverPagination,
  maxHeight = '500px',
  loading,
  renderSubRow,
  expandable,
}: DataTableProps<TData>) {
  const hasExpand = !!renderSubRow || !!expandable
  const t = useTranslations('common.table')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Collapse any open row when data changes (e.g. pagination, filter)
  useEffect(() => { setExpandedRowId(null) }, [data])

  // Internal pagination state for client-side mode
  const [clientPagination, setClientPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  // Server-side: controlled by serverPagination prop (1-indexed → 0-indexed)
  const serverPaginationState: PaginationState | undefined = serverPagination
    ? { pageIndex: serverPagination.page - 1, pageSize: serverPagination.pageSize }
    : undefined

  // Server-side: derive sorting state from serverPagination props
  const serverSortingState: SortingState = serverPagination?.sortField
    ? [{ id: serverPagination.sortField, desc: serverPagination.sortOrder === 'desc' }]
    : []

  const handleServerPaginationChange: OnChangeFn<PaginationState> = serverPagination
    ? (updater) => {
        const next =
          typeof updater === 'function'
            ? updater(serverPaginationState!)
            : updater
        serverPagination.onPageChange(next.pageIndex + 1)
      }
    : () => {}

  const handleServerSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(serverSortingState) : updater
    const first = next[0]
    serverPagination?.onSortChange?.(
      first?.id ?? null,
      first ? (first.desc ? 'desc' : 'asc') : null,
    )
  }

  const table = useReactTable({
    data,
    columns,
    // Server-side mode: trust that `data` is already the correct page/sort/filter
    manualPagination: !!serverPagination,
    manualSorting: !!serverPagination,
    manualFiltering: !!serverPagination,
    // pageCount lets TanStack know total pages for getCanNextPage() etc.
    pageCount: serverPagination
      ? Math.ceil(serverPagination.total / serverPagination.pageSize)
      : undefined,
    state: {
      sorting: serverPagination ? serverSortingState : sorting,
      columnFilters,
      globalFilter,
      pagination: serverPagination ? serverPaginationState! : clientPagination,
    },
    onSortingChange: serverPagination ? handleServerSortingChange : setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: serverPagination ? handleServerPaginationChange : setClientPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const searchValue = searchKey
    ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
    : globalFilter

  const handleSearchChange = (val: string) => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(val)
    } else {
      setGlobalFilter(val)
    }
  }

  const totalCount = serverPagination
    ? serverPagination.total
    : table.getFilteredRowModel().rows.length

  const currentPage = table.getState().pagination.pageIndex + 1
  const currentPageSize = table.getState().pagination.pageSize
  const totalPages = table.getPageCount()
  const pageNumbers = totalPages > 1 ? getPageNumbers(currentPage, totalPages) : []

  const showingFrom = Math.min((currentPage - 1) * currentPageSize + 1, totalCount)
  const showingTo   = Math.min(currentPage * currentPageSize, totalCount)

  function handlePageSizeChange(size: number) {
    if (serverPagination) {
      serverPagination.onPageSizeChange?.(size)
      serverPagination.onPageChange(1)
    } else {
      table.setPageSize(size)
      table.setPageIndex(0)
    }
  }

  const fillMode = maxHeight === false

  return (
    <div className={cn(fillMode ? 'flex flex-col h-full gap-3 overflow-hidden' : 'space-y-3')}>
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      {!hideSearch && (
        <Input
          placeholder={searchPlaceholder ?? t('searchPlaceholder')}
          value={searchValue}
          onChange={e => handleSearchChange(e.target.value)}
          className={cn('max-w-sm', fillMode && 'shrink-0')}
        />
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div
        className={cn('rounded-md border overflow-auto relative', fillMode && 'flex-1 min-h-0')}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hasExpand && <th className="w-8 bg-muted/50" />}
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left font-medium text-muted-foreground bg-muted/50"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => {
                const isExpanded = expandedRowId === row.id
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={hasExpand ? () => setExpandedRowId(isExpanded ? null : row.id) : undefined}
                      className={cn(
                        'border-b transition-colors',
                        hasExpand
                          ? 'cursor-pointer hover:bg-muted/40 select-none'
                          : 'hover:bg-muted/30',
                        isExpanded && 'bg-muted/20',
                      )}
                    >
                      {hasExpand && (
                        <td className="w-8 pl-3 pr-0">
                          <ChevronRight
                            className={cn(
                              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </td>
                      )}
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {hasExpand && isExpanded && (
                      <tr className="border-b bg-muted/10">
                        <td colSpan={columns.length + 1} className="p-0">
                          {renderSubRow
                            ? renderSubRow(row.original)
                            : <GenericSubRow row={row} table={table} />}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (hasExpand ? 1 : 0)}>
                  <Empty className="border-0 rounded-none py-10">
                    <EmptyTitle>{t('noData')}</EmptyTitle>
                  </Empty>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      <div className={cn('flex items-center justify-between gap-4 text-sm', fillMode && 'shrink-0')}>
        {/* Left: range display + page size selector */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>
            {totalCount === 0
              ? t('results', { count: 0 })
              : t('showing', { from: showingFrom, to: showingTo, total: totalCount })}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{t('rowsPerPage')}</span>
            <Select
              size="small"
              value={currentPageSize}
              onChange={handlePageSizeChange}
              options={pageSizeOptions.map(s => ({ value: s, label: String(s) }))}
              popupMatchSelectWidth={false}
              style={{ width: 64 }}
            />
          </div>
        </div>

        {/* Right: Previous / page numbers / Next */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === currentPage ? 'default' : 'outline'}
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => table.setPageIndex((p as number) - 1)}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
