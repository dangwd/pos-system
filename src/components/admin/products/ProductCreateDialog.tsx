'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useGoldPurities } from '@/hooks/useConfig'
import type { ProductType } from '@/types/product'

const PRODUCT_TYPE_OPTIONS: ProductType[] = ['NguyenKhoi', 'GiaDinh']

const schema = z.object({
  productCode:       z.string().min(1, 'Vui lòng nhập mã sản phẩm'),
  productName:       z.string().min(1, 'Vui lòng nhập tên sản phẩm'),
  productCategoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  goldPurityId:      z.string().optional(),
  weightGram:        z.string()
    .min(1, 'Vui lòng nhập trọng lượng')
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Trọng lượng phải lớn hơn 0'),
  productType: z.enum(['NguyenKhoi', 'GiaDinh']),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function ProductCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.products')
  const { mutate: create, isPending } = useCreateProduct()
  const { data: categories = [] } = useCategories()
  const { data: purities = [] } = useGoldPurities()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productCode: '', productName: '', productCategoryId: '',
      goldPurityId: '', weightGram: '', productType: 'NguyenKhoi',
    },
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) {
      form.reset({
        productCode: '', productName: '', productCategoryId: '',
        goldPurityId: '', weightGram: '', productType: 'NguyenKhoi',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(values: FormValues) {
    create(
      {
        productCode:       values.productCode.trim(),
        productName:       values.productName.trim(),
        productCategoryId: values.productCategoryId,
        goldPurityId:      values.goldPurityId || null,
        weightGram:        parseFloat(values.weightGram),
        productType:       values.productType,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl"
        title={t('createDialog.title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('createDialog.cancel')}</Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('createDialog.submit')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col gap-4 py-1">

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                {t('form.productCode')} <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                placeholder="VANG-24K-NHAN"
                className="h-9 font-mono uppercase"
                status={errors.productCode ? 'error' : undefined}
                {...form.register('productCode')}
              />
              <FieldError errors={[errors.productCode]} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-muted-foreground">
                {t('form.purity')}
              </Label>
              <Controller
                control={form.control}
                name="goldPurityId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onChange={v => field.onChange(v ?? '')}
                    placeholder={t('form.purityPlaceholder')}
                    options={purities.map(p => ({ value: p.id, label: p.ma }))}
                    allowClear
                    notFoundContent="Không tìm thấy"
                    className="w-full"
                    popupMatchSelectWidth={false}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {t('form.productName')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input placeholder="Nhẫn Vàng 24K Trơn" className="h-9" status={errors.productName ? 'error' : undefined} {...form.register('productName')} />
            <FieldError errors={[errors.productName]} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                {t('form.category')} <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Controller
                control={form.control}
                name="productCategoryId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onChange={v => field.onChange(v ?? '')}
                    placeholder={t('form.categoryPlaceholder')}
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    showSearch={{ filterOption: (input, opt) =>
                      (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }}
                    notFoundContent="Không tìm thấy"
                    className="w-full"
                    popupMatchSelectWidth={false}
                  />
                )}
              />
              <FieldError errors={[errors.productCategoryId]} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                {t('form.productType')} <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Controller
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={v => field.onChange(v)}
                    options={PRODUCT_TYPE_OPTIONS.map(pt => ({ value: pt, label: t(`productTypes.${pt}`) }))}
                    className="w-full"
                    popupMatchSelectWidth={false}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {t('form.weight')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Controller
              control={form.control}
              name="weightGram"
              render={({ field }) => (
                <NumberInput
                  decimals={2}
                  min={0}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="3.75"
                  className="h-9"
                />
              )}
            />
            <FieldError errors={[errors.weightGram]} />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
