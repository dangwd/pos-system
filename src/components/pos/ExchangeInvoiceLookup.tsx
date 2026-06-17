'use client'

import { useExchangeInvoiceLookup } from '@/hooks/useExchangeInvoiceLookup'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { ExclamationCircleOutlined, LinkOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons'
import type { Transaction } from '@/types/transaction'

interface ExchangeInvoiceLookupProps {
  showError?: boolean
}

export function ExchangeInvoiceLookup({ showError = false }: ExchangeInvoiceLookupProps) {
  const {
    query, setQuery,
    results, isFetching,
    linkedCode,
    selectInvoice, clearLinkedInvoice,
  } = useExchangeInvoiceLookup()

  return (
    <div className="px-4 py-3 shrink-0">
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Hóa đơn gốc <span className="text-destructive">*</span>
        </p>
        {linkedCode && (
          <button
            onClick={clearLinkedInvoice}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Xóa liên kết"
          >
            <CloseOutlined className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Linked invoice — hiển thị khi đã chọn */}
      {linkedCode ? (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
          <LinkOutlined className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="flex-1 text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 truncate">
            {linkedCode}
          </span>
        </div>
      ) : (
        <>
          <Input
            id="pos-exchange-lookup"
            placeholder="Nhập mã HĐ bán vàng cũ..."
            prefix={<SearchOutlined className="h-3 w-3 text-muted-foreground" />}
            suffix={isFetching ? <Spinner className="h-3 w-3" /> : null}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onPaste={e => {
              const pasted = e.clipboardData.getData('text').trim()
              if (pasted) { e.preventDefault(); setQuery(pasted) }
            }}
            status={showError ? 'error' : undefined}
            className="h-8 text-xs"
          />

          {/* Kết quả tìm kiếm */}
          {results.length > 0 && (
            <div className="mt-1 rounded-md border bg-popover shadow-md overflow-hidden max-h-44 overflow-y-auto">
              {results.map((txn: Transaction) => (
                <button
                  key={txn.id}
                  type="button"
                  onClick={() => selectInvoice(txn)}
                  disabled={isFetching}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-0 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{txn.invoiceCode}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {txn.items.length} sp · {new Date(txn.transactedAt).toLocaleDateString('lo-LA')}
                      {txn.customer && ` · ${txn.customer.name}`}
                    </p>
                  </div>
                  <p className="text-xs font-semibold tabular-nums shrink-0 ml-3">
                    {txn.totalAmount.toLocaleString('lo-LA')} ₭
                  </p>
                </button>
              ))}
            </div>
          )}

          {query.length >= 3 && !isFetching && results.length === 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground px-0.5">
              Không tìm thấy &quot;{query}&quot;
            </p>
          )}

          {showError && (
            <p className={cn("mt-1 text-[10px] text-destructive flex items-center gap-1")}>
              <ExclamationCircleOutlined className="h-3 w-3 shrink-0" />
              Vui lòng liên kết hóa đơn vàng gốc
            </p>
          )}
        </>
      )}
    </div>
  )
}
