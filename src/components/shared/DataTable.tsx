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

import { useState } from 'react'
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
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Empty, EmptyTitle } from '@/components/ui/empty'

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
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  /** Column accessor key for column-level filter (overrides globalFilter) */
  searchKey?: string
  searchPlaceholder?: string
  /** Client-side rows per page — default 10 */
  pageSize?: number
  /** Hide the built-in search input (use when parent provides server-side search) */
  hideSearch?: boolean
  /**
   * When provided, switches to server-side (manual) pagination.
   * DataTable uses manualPagination:true — data must already be the current page's rows.
   */
  serverPagination?: ServerPagination
  /** Max height for the table body area (default: 500px). Set false to disable. */
  maxHeight?: string | false
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  pageSize = 10,
  hideSearch,
  serverPagination,
  maxHeight = '500px',
}: DataTableProps<TData>) {
  const t = useTranslations('common.table')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Internal pagination state for client-side mode
  const [clientPagination, setClientPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  // Server-side: controlled by serverPagination prop (1-indexed → 0-indexed)
  const serverPaginationState: PaginationState | undefined = serverPagination
    ? { pageIndex: serverPagination.page - 1, pageSize: serverPagination.pageSize }
    : undefined

  const handleServerPaginationChange: OnChangeFn<PaginationState> = serverPagination
    ? (updater) => {
        const next =
          typeof updater === 'function'
            ? updater(serverPaginationState!)
            : updater
        serverPagination.onPageChange(next.pageIndex + 1)
      }
    : () => {}

  const table = useReactTable({
    data,
    columns,
    // Server-side mode: trust that `data` is already the correct page
    manualPagination: !!serverPagination,
    // pageCount lets TanStack know total pages for getCanNextPage() etc.
    pageCount: serverPagination
      ? Math.ceil(serverPagination.total / serverPagination.pageSize)
      : undefined,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: serverPagination ? serverPaginationState! : clientPagination,
    },
    onSortingChange: setSorting,
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
  const totalPages = table.getPageCount()
  const pageNumbers = totalPages > 1 ? getPageNumbers(currentPage, totalPages) : []

  return (
    <div className="space-y-3">
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      {!hideSearch && (
        <Input
          placeholder={searchPlaceholder ?? t('searchPlaceholder')}
          value={searchValue}
          onChange={e => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-md border overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
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
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('results', { count: totalCount })}
        </span>

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
