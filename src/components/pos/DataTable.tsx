/**
 * DataTable — Generic reusable table component (TanStack Table)
 *
 * Docs rule: MỌI bảng dữ liệu phải dùng TanStack Table, không dùng
 * shadcn Table primitive hay <table> HTML thuần.
 *
 * Features: sort, filter theo column, global filter, pagination.
 * Columns định nghĩa riêng ở src/components/pos/columns/*.tsx
 *
 * Dùng:
 *   <DataTable columns={productColumns} data={products} searchKey="name" />
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
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  /** accessor key để filter theo cột cụ thể (ưu tiên hơn globalFilter) */
  searchKey?: string
  searchPlaceholder?: string
  /** Số rows mỗi trang — mặc định 10 */
  pageSize?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  pageSize = 10,
}: DataTableProps<TData>) {
  const t = useTranslations('common.table')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    initialState: { pagination: { pageSize } },
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Giá trị filter hiện tại của searchKey column (nếu có)
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

  return (
    <div className="space-y-3">
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <Input
        placeholder={searchPlaceholder ?? t('searchPlaceholder')}
        value={searchValue}
        onChange={e => handleSearchChange(e.target.value)}
        className="max-w-sm"
      />

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left font-medium text-muted-foreground"
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
                <td colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {t('noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('results', { count: table.getFilteredRowModel().rows.length })}
          {table.getPageCount() > 1 && (
            <span className="ml-2">
              · {t('page', { page: table.getState().pagination.pageIndex + 1, total: table.getPageCount() })}
            </span>
          )}
        </span>

        {table.getPageCount() > 1 && (
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
