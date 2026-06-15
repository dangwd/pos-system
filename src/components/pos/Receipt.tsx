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
import { usePrintStore } from "@/stores/print.store";
import type { Transaction } from "@/types/transaction";
import { CheckCircle2, Printer, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

function formatKip(amount: number) {
  return amount.toLocaleString("lo-LA") + " ₭";
}

function parseFxNote(note: string | null) {
  if (!note) return null;
  const m = note.match(/FX:\s*([\d,\.]+)\s+(\w+)\s+→\s+([\d,\.]+)\s+(\w+)/);
  if (!m) return null;
  return { fromAmt: m[1], fromCurr: m[2], toAmt: m[3], toCurr: m[4] };
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
  const openPrint = usePrintStore((s) => s.openPrint);

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
  const isFx = transaction.type === "ExchangeCurrency";
  const fxParsed = isFx ? parseFxNote(transaction.note) : null;

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
              <Button variant="outline" onClick={() => openPrint(transaction)}>
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

            {isFx ? (
              <div className="space-y-4">
                {/* FX: hiển thị chiều đổi */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-5 text-center space-y-1">
                  {fxParsed ? (
                    <>
                      <p className="text-2xl font-black tabular-nums tracking-tight">
                        {fxParsed.fromAmt}{" "}
                        <span className="text-primary">{fxParsed.fromCurr}</span>
                      </p>
                      <p className="text-muted-foreground text-sm">↓</p>
                      <p className="text-2xl font-black tabular-nums tracking-tight">
                        {fxParsed.toCurr === "LAK"
                          ? transaction.totalAmount.toLocaleString("lo-LA") + " ₭"
                          : fxParsed.toAmt + " " + fxParsed.toCurr}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {transaction.note}
                    </p>
                  )}
                </div>

                {/* Tỷ giá */}
                {transaction.exchangeRate && transaction.currency && (
                  <p className="text-xs text-center text-muted-foreground">
                    1{" "}
                    <span className="font-semibold text-foreground">
                      {transaction.currency}
                    </span>{" "}
                    ={" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {transaction.exchangeRate.toLocaleString("lo-LA")}
                    </span>{" "}
                    ₭
                  </p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnProduct")}</TableHead>
                    <TableHead className="text-center">
                      {t("columnQty")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("columnLaborFee")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("columnStoneFee")}
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
                        {item.laborFee > 0 ? formatKip(item.laborFee) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.stoneFee > 0 ? formatKip(item.stoneFee) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatKip(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Separator />

            <div className="space-y-1 text-sm">
              {!isFx && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("subtotalLabel")}</span>
                    <span>{formatKip(transaction.subtotalAmount)}</span>
                  </div>
                  {transaction.laborFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("columnLaborFee")}</span>
                      <span>{formatKip(transaction.laborFee)}</span>
                    </div>
                  )}
                  {transaction.stoneFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("columnStoneFee")}</span>
                      <span>{formatKip(transaction.stoneFee)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>
                  {isFx ? "TỔNG QUY ĐỔI TIỀN TỆ LAK" : t("totalLabel")}
                </span>
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
