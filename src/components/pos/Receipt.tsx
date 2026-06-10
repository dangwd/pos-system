'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Transaction } from '@/types/transaction'
import { type PaymentMethodKey } from '@/lib/strategies/payment.strategy'
import { CheckCircle2, Printer } from 'lucide-react'
import { useTranslations } from 'next-intl'

function formatKip(amount: number) {
  return amount.toLocaleString('lo-LA') + ' ₭'
}

interface ReceiptProps {
  open: boolean
  transaction: Transaction | null
  onClose: () => void
}

export function Receipt({ open, transaction, onClose }: ReceiptProps) {
  const t = useTranslations('pos.receipt')
  const tMethods = useTranslations('pos.payment.methods')

  if (!transaction) return null

  const rawKey = transaction.paymentMethod?.toLowerCase().replace('banktransfer', 'bank-transfer') as PaymentMethodKey
  const paymentLabel = tMethods(rawKey) ?? transaction.paymentMethod

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="font-bold text-lg">{t('storeName')}</p>
            <p className="text-sm text-muted-foreground">
              {transaction.invoiceCode ?? `#${transaction.id.slice(0, 8).toUpperCase()}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(transaction.completedAt ?? transaction.createdAt ?? '').toLocaleString('lo-LA')}
            </p>
            <Badge>{paymentLabel}</Badge>
          </div>

          <Separator />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columnProduct')}</TableHead>
                <TableHead className="text-center">{t('columnQty')}</TableHead>
                <TableHead className="text-right">{t('columnTotal')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.productName}</TableCell>
                  <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">{formatKip(item.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between font-bold text-base pt-1">
              <span>{t('totalLabel')}</span>
              <span className="text-primary">{formatKip(transaction.totalAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            {t('printButton')}
          </Button>
          <Button onClick={onClose}>{t('closeButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
