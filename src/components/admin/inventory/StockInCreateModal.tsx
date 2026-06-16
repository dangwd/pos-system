// StockInCreateModal — modal tạo phiếu nhập kho
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Form, Select, Input, Divider, Button, Tag, message } from 'antd'
import { AppstoreOutlined, UploadOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useCounters } from '@/hooks/useBranches'
import { useCreateAdjustment } from '@/hooks/useInventory'
import { StockInProductPickerModal } from './StockInProductPickerModal'
import { StockInSelectedTable, type SelectedLine } from './StockInSelectedTable'
import type { InventoryItem, InventorySource } from '@/types/inventory'

interface Props {
  open: boolean
  branchId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function StockInCreateModal({ open, branchId, onClose, onSuccess }: Props) {
  const t = useTranslations('admin.inventory.stockInForm')
  const [form] = Form.useForm()

  const [lines, setLines] = useState<SelectedLine[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: counters = [] } = useCounters(branchId)
  const counterId: string | undefined = Form.useWatch('counterId', form)

  const { mutate: createAdjustment, isPending } = useCreateAdjustment()

  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  const selectedIds = lines.map(l => l.item.id)

  function mergeSelection(picked: InventoryItem[]) {
    const pickedIds = new Set(picked.map(p => p.id))
    // Giữ các dòng vẫn được chọn; xóa dòng bỏ tích
    const kept = lines.filter(l => pickedIds.has(l.item.id))
    const keptIds = new Set(kept.map(l => l.item.id))
    // Thêm dòng mới (chưa có trong bảng)
    const fresh = picked.filter(p => !keptIds.has(p.id)).map<SelectedLine>(p => ({ item: p, qty: 0 }))
    setLines([...kept, ...fresh])
    setPickerOpen(false)
  }

  function handleQtyChange(id: string, qty: number) {
    setLines(ls => ls.map(l => l.item.id === id ? { ...l, qty } : l))
  }

  function handleRemove(id: string) {
    setLines(ls => ls.filter(l => l.item.id !== id))
  }

  function handleClose() {
    form.resetFields()
    setLines([])
    onClose()
  }

  async function handleSave() {
    let values: { counterId?: string; nguonHang: InventorySource; supplier?: string; note?: string }
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (lines.length === 0) { message.error(t('errNoProducts')); return }
    if (!lines.some(l => l.qty > 0)) { message.error(t('errNoQty')); return }

    createAdjustment(
      {
        direction: 'IN',
        reason: values.note ?? '',
        nguonGoc: values.nguonHang,
        supplier: values.supplier ?? null,
        lines: lines
          .filter(l => l.qty > 0)
          .map(l => ({ itemId: l.item.id, quantity: l.qty })),
      },
      {
        onSuccess: () => {
          message.success(t('saveSuccess'))
          handleClose()
          onSuccess()
        },
      },
    )
  }

  return (
    <>
      <Modal
        open={open}
        title={t('title')}
        width={780}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={handleClose}
        footer={[
          <Button key="close" icon={<CloseOutlined />} onClick={handleClose}>{t('closeBtn')}</Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} loading={isPending} onClick={handleSave}>{t('saveBtn')}</Button>,
        ]}
      >
        {/* Phần A — Thông tin chung */}
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="counterId" label={t('counterLabel')} rules={[{ required: true, message: t('counterRequired') }]}>
              <Select placeholder={t('counterPlaceholder')} options={counters.filter(c => c.isActive).map(c => ({ value: c.id, label: c.counterName }))} />
            </Form.Item>
            <Form.Item name="nguonHang" label={t('nguonHangLabel')} rules={[{ required: true, message: t('nguonHangRequired') }]}>
              <Select placeholder={t('nguonHangPlaceholder')} options={[
                { value: 'Quan', label: t('nguonHangQuan') },
                { value: 'Ngoai', label: t('nguonHangNgoai') },
              ]} />
            </Form.Item>
            <Form.Item name="supplier" label={t('nhaCungCapLabel')}>
              <Input placeholder={t('nhaCungCapPlaceholder')} />
            </Form.Item>

            <Form.Item name="note" label={t('ghiChuLabel')} style={{ gridColumn: '1 / -1' }}>
              <Input.TextArea rows={3} autoSize={{ minRows: 3, maxRows: 6 }} placeholder={t('ghiChuPlaceholder')} />
            </Form.Item>
          </div>
        </Form>

        <Divider />

        {/* Phần B — Danh sách sản phẩm */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button icon={<AppstoreOutlined />} onClick={() => setPickerOpen(true)}>
              {t('chooseProd')}
            </Button>
            {lines.length > 0 && <Tag color="blue">{lines.length}</Tag>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#555' }}>{t('totalQty')} <b>{totalQty}</b></span>
            <Button icon={<UploadOutlined />} disabled>{t('importExcel')}</Button>
          </div>
        </div>

        <StockInSelectedTable lines={lines} onQtyChange={handleQtyChange} onRemove={handleRemove} />
      </Modal>

      <StockInProductPickerModal
        open={pickerOpen}
        branchId={branchId}
        counterId={counterId ?? null}
        selectedIds={selectedIds}
        onConfirm={mergeSelection}
        onCancel={() => setPickerOpen(false)}
      />
    </>
  )
}
