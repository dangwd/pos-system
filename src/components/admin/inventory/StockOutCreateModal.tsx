// StockOutCreateModal — modal tạo phiếu xuất kho
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Form, Select, Input, Divider, Button, Tag, message } from 'antd'
import { AppstoreOutlined, UploadOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useCounters } from '@/hooks/useBranches'
import { useBulkAdjustInventory } from '@/hooks/useInventory'
import { StockInProductPickerModal } from './StockInProductPickerModal'
import { StockOutSelectedTable, type SelectedOutLine } from './StockOutSelectedTable'
import type { InventoryItem } from '@/types/inventory'

interface Props {
  open: boolean
  branchId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function StockOutCreateModal({ open, branchId, onClose, onSuccess }: Props) {
  const t = useTranslations('admin.inventory.stockOutForm')
  const [form] = Form.useForm()

  const [lines, setLines] = useState<SelectedOutLine[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: counters = [] } = useCounters(branchId)
  const counterId: string | undefined = Form.useWatch('counterId', form)

  const { mutate: bulkAdjust, isPending } = useBulkAdjustInventory()

  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  const selectedIds = lines.map(l => l.item.id)
  const hasOverStock = lines.some(l => l.qty > l.item.quantity)

  function mergeSelection(picked: InventoryItem[]) {
    const pickedIds = new Set(picked.map(p => p.id))
    const kept = lines.filter(l => pickedIds.has(l.item.id))
    const keptIds = new Set(kept.map(l => l.item.id))
    const fresh = picked.filter(p => !keptIds.has(p.id)).map<SelectedOutLine>(p => ({ item: p, qty: 0 }))
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
    let values: { counterId?: string; reason: string; note?: string }
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (lines.length === 0) { message.error(t('errNoProducts')); return }
    if (!lines.some(l => l.qty > 0)) { message.error(t('errNoQty')); return }
    if (hasOverStock) { message.error(t('errOverStock')); return }

    bulkAdjust(
      {
        items: lines
          .filter(l => l.qty > 0)
          .map(l => ({
            id: l.item.id,
            direction: 'OUT' as const,
            quantity: l.qty,
            reason: [values.reason, values.note].filter(Boolean).join(' — '),
          })),
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
          <Button key="save" type="primary" danger icon={<SaveOutlined />} loading={isPending} onClick={handleSave}>
            {t('saveBtn')}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="counterId"
              label={t('counterLabel')}
              rules={[{ required: true, message: t('counterRequired') }]}
            >
              <Select
                placeholder={t('counterPlaceholder')}
                options={counters.map(c => ({ value: c.id, label: c.counterName }))}
              />
            </Form.Item>
            <Form.Item
              name="reason"
              label={t('reasonLabel')}
              rules={[{ required: true, message: t('reasonRequired') }]}
            >
              <Input placeholder={t('reasonPlaceholder')} />
            </Form.Item>
            <Form.Item name="note" label={t('ghiChuLabel')} style={{ gridColumn: '1 / -1' }}>
              <Input.TextArea
                rows={2}
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder={t('ghiChuPlaceholder')}
              />
            </Form.Item>
          </div>
        </Form>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button icon={<AppstoreOutlined />} onClick={() => setPickerOpen(true)}>
              {t('chooseProd')}
            </Button>
            {lines.length > 0 && <Tag color="red">{lines.length}</Tag>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#555' }}>{t('totalQty')} <b>{totalQty}</b></span>
            <Button icon={<UploadOutlined />} disabled>{t('importExcel')}</Button>
          </div>
        </div>

        <StockOutSelectedTable lines={lines} onQtyChange={handleQtyChange} onRemove={handleRemove} />
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
