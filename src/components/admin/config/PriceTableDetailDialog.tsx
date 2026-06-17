'use client'

import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlobalOutlined,
  ShopOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useTogglePriceTableActive } from '@/hooks/useConfig'
import type { PriceTable, PriceRow } from '@/types/config'

interface Props {
  table:     PriceTable
  branchMap: Record<string, string>
  onCopy:    () => void
  onClose:   () => void
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

function ScopePills({ ids, map }: { ids: string[]; map: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {ids.map((id) => (
        <span
          key={id}
          className="px-2 py-0.5 text-xs rounded-full"
          style={{ background: '#E6F1FB', color: '#0C447C' }}
        >
          {map[id] ?? id}
        </span>
      ))}
    </div>
  )
}

function PriceCard({ row, buyLabel, sellLabel }: { row: PriceRow; buyLabel: string; sellLabel: string }) {
  const isGold = row.type === 'gold'
  const fmt = (n: number) => n > 0 ? n.toLocaleString('lo-LA') + ' ₭' : null
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted/5">
      <span
        className="text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0"
        style={isGold ? { background: '#FAEEDA', color: '#633806' } : { background: '#D3D1C7', color: '#2C2C2A' }}
      >
        {row.karat}
      </span>
      <span className="text-xs text-muted-foreground shrink-0 w-12">{row.unit}</span>
      <div className="flex-1 flex gap-6 justify-end text-xs tabular-nums">
        <span className="text-muted-foreground">
          {buyLabel}:{' '}
          {fmt(row.buy)
            ? <strong className="text-foreground">{fmt(row.buy)}</strong>
            : <span>—</span>}
        </span>
        <span className="text-muted-foreground">
          {sellLabel}:{' '}
          {fmt(row.sell)
            ? <strong className="text-foreground">{fmt(row.sell)}</strong>
            : <span>—</span>}
        </span>
      </div>
    </div>
  )
}

export function PriceTableDetailDialog({ table, branchMap, onCopy, onClose }: Props) {
  const t = useTranslations('admin.config.prices')
  const { mutate: toggle, isPending } = useTogglePriceTableActive()

  const goldPrices   = table.prices.filter((p) => p.type === 'gold')
  const silverPrices = table.prices.filter((p) => p.type === 'silver')

  function handleToggle() {
    toggle({ id: table.id, active: !table.active }, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base font-semibold">{table.name}</DialogTitle>

          {/* Scope + updatedAt + status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {table.scope === 'all' ? (
              <><GlobalOutlined /><span>{t('scopeAll')}</span></>
            ) : (
              <><ShopOutlined /><span>{t('branchCount', { count: table.branches.length })}</span></>
            )}
            <span>·</span>
            <span>{new Date(table.updatedAt).toLocaleString('lo-LA')}</span>
            <span>·</span>
            <Badge
              className={table.active ? 'bg-green-100 text-green-800 border-green-200' : ''}
              variant={table.active ? 'outline' : 'secondary'}
            >
              {table.active ? t('statusActive') : t('statusInactive')}
            </Badge>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AvatarChip name={table.createdBy} />
            <span>{t('createdBy')}: <strong>{table.createdBy || '—'}</strong></span>
            <span>·</span>
            <span>{t('createdAt')}: {new Date(table.createdAt).toLocaleDateString('lo-LA')}</span>
          </div>

          {/* Scope pills */}
          {table.scope === 'branch' && table.branches.length > 0 && <ScopePills ids={table.branches} map={branchMap} />}
        </DialogHeader>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {goldPrices.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t('groupGold')}
              </p>
              <div className="space-y-1.5">
                {goldPrices.map((row, i) => (
                  <PriceCard key={i} row={row} buyLabel={t('columns.buy')} sellLabel={t('columns.sell')} />
                ))}
              </div>
            </section>
          )}
          {silverPrices.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t('groupSilver')}
              </p>
              <div className="space-y-1.5">
                {silverPrices.map((row, i) => (
                  <PriceCard key={i} row={row} buyLabel={t('columns.buy')} sellLabel={t('columns.sell')} />
                ))}
              </div>
            </section>
          )}
          {table.prices.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">{t('empty')}</p>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>
              <CopyOutlined className="mr-1.5" />
              {t('copy')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleToggle} disabled={isPending}>
              {table.active ? t('deactivate') : t('activate')}
            </Button>
          </div>
          <Button size="sm" onClick={onClose}>{t('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
