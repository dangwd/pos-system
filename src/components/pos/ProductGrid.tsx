'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Product } from '@/types/product'
import { useTranslations } from 'next-intl'

interface ProductGridProps {
  products: Product[]
  categories: string[]
  search: string
  category: string
  onSearch: (v: string) => void
  onCategory: (v: string | null) => void
  onSelect: (p: Product) => void
}

export function ProductGrid({ products, categories, search, category, onSearch, onCategory, onSelect }: ProductGridProps) {
  const t = useTranslations('product.grid')

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={category} onValueChange={onCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('categoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? t('allCategories') : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1">
        {products.map(product => (
          <Card
            key={product.id}
            onClick={() => onSelect(product)}
            className="cursor-pointer hover:shadow-md hover:border-primary transition-all p-3 flex flex-col gap-2 select-none"
          >
            <div className="bg-muted rounded-md h-24 flex items-center justify-center text-4xl">
              💎
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-tight line-clamp-2">{product.productName}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{product.category.name}</Badge>
                <Badge variant="outline" className="text-xs font-mono">{product.purity}</Badge>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{product.productCode}</p>
          </Card>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            {t('notFound')}
          </div>
        )}
      </div>
    </div>
  )
}
