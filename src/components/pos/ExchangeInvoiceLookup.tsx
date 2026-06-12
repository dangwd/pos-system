'use client'

import { useExchangeInvoiceLookup } from '@/hooks/useExchangeInvoiceLookup'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Search, X, ExternalLink } from 'lucide-react'
import type { Transaction } from '@/types/transaction'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

export function ExchangeInvoiceLookup() {
  const {
    query, setQuery,
    results, isFetching,
    linkedCode,
    selectInvoice, clearLinkedInvoice,
  } = useExchangeInvoiceLookup()

  return (
    <div className="px-3 py-2 border-b bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
          Liên kết HĐ bán vàng cũ
        </p>
        {linkedCode && (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-400 text-amber-700 bg-amber-50">
              {linkedCode}
            </Badge>
            <button
              onClick={clearLinkedInvoice}
              className="p-0.5 rounded text-amber-600 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Xóa liên kết"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Search input — ẩn khi đã có HĐ liên kết */}
      {!linkedCode && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Nhập mã HĐ bán vàng (ví dụ: BV-20250615-0003)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8 pr-8 h-7 text-xs"
          />
          {isFetching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Spinner className="h-3 w-3" />
            </div>
          )}
        </div>
      )}

      {/* Results dropdown */}
      {!linkedCode && results.length > 0 && (
        <div className="rounded-md border bg-popover shadow-md overflow-hidden max-h-40 overflow-y-auto">
          {results.map((txn: Transaction) => (
            <button
              key={txn.id}
              onClick={() => selectInvoice(txn)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent transition-colors border-b last:border-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold">{txn.invoiceCode}</p>
                <p className="text-[10px] text-muted-foreground">
                  {txn.items.length} sản phẩm · {new Date(txn.transactedAt).toLocaleDateString('lo-LA')}
                  {txn.customer && ` · ${txn.customer.name}`}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xs font-semibold tabular-nums">{formatKip(txn.totalAmount)}</p>
                <ExternalLink className="h-3 w-3 text-muted-foreground mt-0.5 ml-auto" />
              </div>
            </button>
          ))}
        </div>
      )}

      {!linkedCode && query.length >= 3 && !isFetching && results.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">Không tìm thấy HĐ &quot;{query}&quot;</p>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Liên kết tùy chọn — hoặc thêm vàng cũ trực tiếp bên dưới.
      </p>
    </div>
  )
}
