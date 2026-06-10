import { Skeleton } from '@/components/ui/skeleton'

interface TablePageSkeletonProps {
  cols?: number
  rows?: number
}

export function TablePageSkeleton({ cols = 6, rows = 8 }: TablePageSkeletonProps) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 max-w-sm w-full" />
      <div className="rounded-md border overflow-hidden">
        <div className="flex items-center gap-6 px-4 py-2.5 bg-muted/50 border-b">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-6 px-4 py-3 border-b last:border-0">
            {Array.from({ length: cols }).map((_, col) => (
              <Skeleton key={col} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
