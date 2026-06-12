"use client";

import { CancelInvoiceDialog } from "@/components/pos/CancelInvoiceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type PaymentMethodKey } from "@/lib/strategies/payment.strategy";
import type { Transaction } from "@/types/transaction";
import { CheckCircle2, Printer, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

function formatKip(amount: number) {
  return amount.toLocaleString("lo-LA") + " ₭";
}

interface ReceiptProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function Receipt({ open, transaction, onClose }: ReceiptProps) {
  const t = useTranslations("pos.receipt");
  const tMethods = useTranslations("pos.payment.methods");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  if (!transaction) return null;

  const methodKeyMap: Record<string, PaymentMethodKey> = {
    CASH: "cash",
    BANK: "bank-transfer",
    MIXED: "cash",
  };
  const rawKey = transaction.paymentMethod
    ? methodKeyMap[transaction.paymentMethod]
    : undefined;
  const paymentLabel = rawKey
    ? tMethods(rawKey)
    : (transaction.paymentMethod ?? "—");

  const isCompleted = !isCancelled && transaction.status === "Completed";

  const handleClose = () => {
    setIsCancelled(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="sm:max-w-2xl min-w-2xl"
          title={
            isCancelled ? (
              <span className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                {t("cancelledTitle")}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                {t("title")}
              </span>
            )
          }
          footer={
            <DialogFooter className="flex-1 items-center">
              {isCompleted && (
                <Button
                  variant="destructive"
                  className="mr-auto"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("cancelInvoiceButton")}
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                {t("printButton")}
              </Button>
              <Button onClick={handleClose}>{t("closeButton")}</Button>
            </DialogFooter>
          }
        >
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="font-bold text-lg">{t("storeName")}</p>
              <p className="text-sm text-muted-foreground">
                {transaction.invoiceCode ??
                  `#${transaction.id.slice(0, 8).toUpperCase()}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(transaction.transactedAt ?? "").toLocaleString(
                  "lo-LA",
                )}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Badge>{paymentLabel}</Badge>
                {isCancelled && (
                  <Badge variant="destructive">{t("cancelledBadge")}</Badge>
                )}
              </div>
            </div>

            <Separator />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnProduct")}</TableHead>
                  <TableHead className="text-center">
                    {t("columnQty")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("columnTotal")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {item.productSnapshotName}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatKip(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-bold text-base pt-1">
                <span>{t("totalLabel")}</span>
                <span className="text-primary">
                  {formatKip(transaction.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CancelInvoiceDialog
        open={cancelOpen}
        transactionId={transaction.id}
        invoiceCode={
          transaction.invoiceCode ?? transaction.id.slice(0, 8).toUpperCase()
        }
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          setCancelOpen(false);
          setIsCancelled(true);
        }}
      />
    </>
  );
}
