'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Select } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined, LockOutlined } from '@ant-design/icons'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useGoldPurities, useWeightUnits } from '@/hooks/useConfig'
import { productRepository } from '@/lib/repositories/product.repository'
import type { GoldPurity } from '@/types/config'

interface FormState {
  productName: string
  productCategoryId: string
  goldPurityId: string
  weightUnitId: string
}

const EMPTY: FormState = {
  productName: '',
  productCategoryId: '',
  goldPurityId: '',
  weightUnitId: '',
}

// Map category code/name → GoldPurity.category to filter purity options
function resolvePurityCategory(categoryName: string): 'Gold' | 'Silver' | undefined {
  const lower = categoryName.toLowerCase()
  if (lower.includes('vàng') || lower.includes('vang') || lower.includes('gold')) return 'Gold'
  if (lower.includes('bạc') || lower.includes('bac') || lower.includes('silver')) return 'Silver'
  return undefined
}

function filterPurities(purities: GoldPurity[], categoryName: string): GoldPurity[] {
  const target = resolvePurityCategory(categoryName)
  if (!target) return purities
  const withCategory = purities.filter((p) => p.category === target)
  return withCategory.length > 0 ? withCategory : purities
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ProductCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.products')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [debouncedName, setDebouncedName] = useState('')
  const [showLockedWarning, setShowLockedWarning] = useState(false)

  const { mutate: create, isPending } = useCreateProduct()
  const { data: categories = [] } = useCategories()
  const { data: allPurities = [] } = useGoldPurities()
  const { data: weightUnits = [] } = useWeightUnits()

  // Chỉ danh mục có kho vật lý (vàng/bạc) — đá quý & ngoại tệ quản lý ở luồng riêng
  // TODO: thay bằng category.hasInventory khi backend bổ sung flag
  const inventoryCategories = categories.filter((c) => resolvePurityCategory(c.name) !== undefined)

  const selectedCategory = inventoryCategories.find((c) => c.id === form.productCategoryId)
  const isMetalCategory = !!selectedCategory && resolvePurityCategory(selectedCategory.name) !== undefined
  const purityOptions = selectedCategory
    ? filterPurities(allPurities, selectedCategory.name)
    : allPurities

  // Debounce productName for duplicate check (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(form.productName.trim()), 400)
    return () => clearTimeout(timer)
  }, [form.productName])

  // Duplicate check via React Query
  const { data: dupCheck, isFetching: isCheckingDup } = useQuery({
    queryKey: ['products', 'check-duplicate', debouncedName],
    queryFn: () => productRepository.checkDuplicate(debouncedName),
    enabled: debouncedName.length >= 2,
    staleTime: 10_000,
  })

  const isDuplicate = dupCheck?.exists === true
  const nameChecked = debouncedName.length >= 2 && !isCheckingDup

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }))

  function handleLockedFieldSelect(key: 'goldPurityId' | 'weightUnitId', value: string) {
    set(key, value)
    if (value) setShowLockedWarning(true)
  }

  const disabled =
    !form.productName.trim() ||
    !form.productCategoryId ||
    (isMetalCategory && !form.goldPurityId) ||
    !form.weightUnitId ||
    isDuplicate ||
    isCheckingDup

  function handleSubmit() {
    if (disabled) return
    create(
      {
        productName: form.productName.trim(),
        productCategoryId: form.productCategoryId,
        goldPurityId: form.goldPurityId || null,
        weightUnitId: form.weightUnitId,
      },
      {
        onSuccess: () => {
          setForm(EMPTY)
          setShowLockedWarning(false)
          onClose()
        },
      },
    )
  }

  function handleClose() {
    setForm(EMPTY)
    setShowLockedWarning(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-lg"
        title={t('createDialog.title')}
        footer={
          <DialogFooter className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {t('createDialog.stockNote')}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isPending}>
                {t('createDialog.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || disabled}>
                {isPending && <Spinner className="mr-2" />}
                {t('createDialog.submit')}
              </Button>
            </div>
          </DialogFooter>
        }
      >
        <FieldGroup className="py-1 gap-3">
          {/* Category */}
          <Field>
            <FieldLabel>{t('form.category')} *</FieldLabel>
            <Select
              value={form.productCategoryId || undefined}
              onChange={(v) => v && setForm((f) => ({ ...f, productCategoryId: v, goldPurityId: '' }))}
              placeholder={t('form.categoryPlaceholder')}
              options={inventoryCategories.map((c) => ({ value: c.id, label: c.name }))}
              showSearch
              filterOption={(input, opt) =>
                ((opt?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="Không tìm thấy"
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </Field>

          {/* Product name + duplicate check */}
          <Field>
            <FieldLabel>{t('form.productName')} *</FieldLabel>
            <Input
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
              placeholder={t('form.productNamePlaceholder')}
              className="h-9"
            />
            {form.productName.trim().length >= 2 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                {isCheckingDup ? (
                  <><LoadingOutlined className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">{t('form.duplicateChecking')}</span></>
                ) : nameChecked && !isDuplicate ? (
                  <><CheckCircleOutlined className="h-3 w-3 text-green-600" /><span className="text-green-600">{t('form.duplicateOk')}</span></>
                ) : nameChecked && isDuplicate ? (
                  <><ExclamationCircleOutlined className="h-3 w-3 text-destructive" /><span className="text-destructive">{t('form.duplicateError')}</span></>
                ) : null}
              </div>
            )}
          </Field>

          {/* Purity (hàm lượng) + Weight unit — luôn hiển thị ngay khi mở popup.
              Hàm lượng chỉ bắt buộc khi danh mục là vàng/bạc (isMetalCategory). */}
          <div className="grid gap-3 grid-cols-2">
            <Field>
              <FieldLabel>{t('form.purity')}{isMetalCategory ? ' *' : ''}</FieldLabel>
              <Select
                value={form.goldPurityId || undefined}
                onChange={(v) => handleLockedFieldSelect('goldPurityId', v ?? '')}
                placeholder={t('form.purityPlaceholder')}
                options={purityOptions.map((p) => ({ value: p.id, label: `${p.ma} (${p.hamLuong}%)` }))}
                allowClear
                disabled={!form.productCategoryId}
                notFoundContent="Không tìm thấy"
                className="w-full"
                popupMatchSelectWidth={false}
              />
              <p className="flex items-center gap-1 mt-1 text-[11px] text-amber-600">
                <LockOutlined className="h-3 w-3" />{t('form.lockedHint')}
              </p>
            </Field>
            <Field>
              <FieldLabel>{t('form.weightUnit')} *</FieldLabel>
              <Select
                value={form.weightUnitId || undefined}
                onChange={(v) => handleLockedFieldSelect('weightUnitId', v ?? '')}
                placeholder={t('form.weightUnitPlaceholder')}
                options={weightUnits.map((u) => ({ value: u.id, label: u.tenDonVi }))}
                allowClear
                notFoundContent="Không tìm thấy"
                className="w-full"
                popupMatchSelectWidth={false}
              />
              <p className="flex items-center gap-1 mt-1 text-[11px] text-amber-600">
                <LockOutlined className="h-3 w-3" />{t('form.lockedHint')}
              </p>
            </Field>
          </div>

          {/* Locked fields warning banner */}
          {showLockedWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <ExclamationCircleOutlined className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t('warnings.lockedFields')}</span>
            </div>
          )}

          {/* Duplicate error banner */}
          {isDuplicate && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <ExclamationCircleOutlined className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t('warnings.duplicate', { name: form.productName.trim() })}</span>
            </div>
          )}
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}
