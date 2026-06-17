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
import { useAuthStore } from "@/stores/auth.store";
import type { Transaction } from "@/types/transaction";
import { VerticalAlignBottomOutlined, VerticalAlignTopOutlined, CheckCircleOutlined, PrinterOutlined, CloseCircleOutlined } from "@ant-design/icons";
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
  const { user } = useAuthStore();

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
  const isBuy = transaction.type === "BuyGold";
  const isFx = transaction.type === "ExchangeCurrency";
  const isFxToNonLak = isFx && !!transaction.targetCurrency && transaction.targetCurrency !== "LAK";
  // Dùng foreignAmount từ DB (v2026-06-16+). Fallback sang note parsing cho GD cũ.
  const fxHasDirect = isFx && transaction.foreignAmount != null;
  const fxParsed = isFx && !fxHasDirect ? parseFxNote(transaction.note) : null;

  // ExchangeGold / ExchangeFree / BuyMoreGold / ExchangeToMoney: chia 2 panel
  const isExchange = ["ExchangeGold", "ExchangeFree", "BuyMoreGold", "ExchangeToMoney"].includes(transaction.type);
  const exchangeInItems = isExchange ? transaction.items.filter((i) => i.itemRole === "ExchangeIn") : [];
  const normalItems = isExchange ? transaction.items.filter((i) => i.itemRole === "Normal") : transaction.items;
  // totalB = tổng giá trị vàng cũ thu vào; totalA = tổng hàng bán ra (= totalAmount + totalB)
  const totalB = exchangeInItems.reduce((s, i) => s + i.lineTotal, 0);
  const totalA = transaction.totalAmount + totalB;

  const handleClose = () => {
    setIsCancelled(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={isExchange ? "sm:max-w-5xl min-w-5xl" : "sm:max-w-3xl min-w-3xl"}
          title={
            isCancelled ? (
              <span className="flex items-center gap-2 text-destructive">
                <CloseCircleOutlined className="h-5 w-5" />
                {t("cancelledTitle")}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircleOutlined className="h-5 w-5" />
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
                  <CloseCircleOutlined className="h-4 w-4 mr-2" />
                  {t("cancelInvoiceButton")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  openPrint(transaction, {
                    branchName: user?.branchName ?? undefined,
                    counterName: user?.counterName ?? undefined,
                    cashierName: user?.fullName ?? undefined,
                  })
                }
              >
                <PrinterOutlined className="h-4 w-4 mr-2" />
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
              {transaction.customer?.name && (
                <p className="text-sm font-semibold">{transaction.customer.name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {new Date(transaction.transactedAt ?? "").toLocaleString(
                  "lo-LA",
                )}
              </p>
              {transaction.cashierName && (
                <p className="text-xs text-muted-foreground">
                  {transaction.cashierName}
                  {transaction.counterName ? ` · ${transaction.counterName}` : ""}
                </p>
              )}
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
                  {fxHasDirect ? (
                    <>
                      <p className="text-2xl font-black tabular-nums tracking-tight">
                        {transaction.foreignAmount!.toLocaleString("en", { maximumFractionDigits: 4 })}{" "}
                        <span className="text-primary">{transaction.currency}</span>
                      </p>
                      <p className="text-muted-foreground text-sm">↓</p>
                      <p className="text-2xl font-black tabular-nums tracking-tight">
                        {isFxToNonLak && transaction.targetAmount != null
                          ? `${transaction.targetAmount.toLocaleString("en", { maximumFractionDigits: 4 })} ${transaction.targetCurrency}`
                          : transaction.totalAmount.toLocaleString("lo-LA") + " ₭"}
                      </p>
                    </>
                  ) : fxParsed ? (
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
                {isFxToNonLak && transaction.targetRateToLak ? (
                  <p className="text-xs text-center text-muted-foreground">
                    1{" "}
                    <span className="font-semibold text-foreground">
                      {transaction.targetCurrency}
                    </span>{" "}
                    ={" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {transaction.targetRateToLak.toLocaleString("lo-LA")}
                    </span>{" "}
                    ₭
                  </p>
                ) : (
                  transaction.exchangeRate && transaction.currency && (
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
                  )
                )}
              </div>
            ) : isExchange ? (
              <div className="space-y-3">
                {/* PANEL B — Vàng cũ thu vào */}
                {exchangeInItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <VerticalAlignBottomOutlined className="h-3 w-3 shrink-0" />
                      Vàng cũ thu vào (B)
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("columnProduct")}</TableHead>
                          <TableHead className="text-center">{t("columnQty")}</TableHead>
                          <TableHead className="text-center">Đơn vị</TableHead>
                          <TableHead className="text-right">Giá đơn vị</TableHead>
                          <TableHead className="text-right text-amber-600">Giá trị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exchangeInItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.productSnapshotName}</TableCell>
                            <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {item.weightUnitName || "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatKip(item.tableUnitPriceLak || item.unitPriceLak)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-amber-700 dark:text-amber-400">
                              {formatKip(item.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 px-1 pt-1.5 border-t border-amber-200 dark:border-amber-900">
                      <span>Tổng cấn trừ (B)</span>
                      <span>{formatKip(totalB)}</span>
                    </div>
                  </div>
                )}

                {/* PANEL A — Hàng bán ra mới */}
                {normalItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest mb-1">
                      <VerticalAlignTopOutlined className="h-3 w-3 shrink-0" />
                      Hàng bán ra mới (A)
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("columnProduct")}</TableHead>
                          <TableHead className="text-center">{t("columnQty")}</TableHead>
                          <TableHead className="text-center">Đơn vị</TableHead>
                          <TableHead className="text-right">Giá đơn vị</TableHead>
                          <TableHead className="text-right">{t("columnLaborFee")}</TableHead>
                          <TableHead className="text-right">{t("columnStoneFee")}</TableHead>
                          <TableHead className="text-right">{t("columnTotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {normalItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.productSnapshotName}</TableCell>
                            <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {item.weightUnitName || "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatKip(item.tableUnitPriceLak || item.unitPriceLak)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item.laborFee > 0 ? formatKip(item.laborFee) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item.stoneFee > 0 ? formatKip(item.stoneFee) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                              {formatKip(item.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-between text-xs font-semibold px-1 pt-1.5 border-t">
                      <span>Tổng bán ra (A)</span>
                      <span>{formatKip(totalA)}</span>
                    </div>
                  </div>
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
                    <TableHead className="text-center">Đơn vị</TableHead>
                    <TableHead className="text-right">
                      {isBuy ? "Giá mua" : "Giá đơn vị"}
                    </TableHead>
                    {!isBuy && (
                      <TableHead className="text-right">
                        {t("columnLaborFee")}
                      </TableHead>
                    )}
                    {!isBuy && (
                      <TableHead className="text-right">
                        {t("columnStoneFee")}
                      </TableHead>
                    )}
                    <TableHead className="text-right">
                      {isBuy ? "Tiệm chi" : t("columnTotal")}
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
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {item.weightUnitName || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatKip(item.tableUnitPriceLak || item.unitPriceLak)}
                      </TableCell>
                      {!isBuy && (
                        <TableCell className="text-right text-sm">
                          {item.laborFee > 0 ? formatKip(item.laborFee) : "—"}
                        </TableCell>
                      )}
                      {!isBuy && (
                        <TableCell className="text-right text-sm">
                          {item.stoneFee > 0 ? formatKip(item.stoneFee) : "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-sm font-semibold">
                        {formatKip(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Separator />

            <div className="space-y-1 text-sm">
              {isExchange ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>(A) Hàng bán ra mới</span>
                    <span>{formatKip(totalA)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>(B) Vàng cũ cấn trừ</span>
                    <span>−{formatKip(totalB)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>
                      {transaction.totalAmount > 0
                        ? "Khách trả thêm"
                        : transaction.totalAmount < 0
                          ? "Tiệm trả lại khách"
                          : "Hoà vốn"}
                    </span>
                    <span
                      className={
                        transaction.totalAmount > 0
                          ? "text-green-600 dark:text-green-400"
                          : transaction.totalAmount < 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground"
                      }
                    >
                      {formatKip(Math.abs(transaction.totalAmount))}
                    </span>
                  </div>
                </>
              ) : !isFx ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("subtotalLabel")}</span>
                    <span>{formatKip(transaction.subtotalAmount)}</span>
                  </div>
                  {!isBuy && transaction.laborFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("columnLaborFee")}</span>
                      <span>{formatKip(transaction.laborFee)}</span>
                    </div>
                  )}
                  {!isBuy && transaction.stoneFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("columnStoneFee")}</span>
                      <span>{formatKip(transaction.stoneFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>{t("totalLabel")}</span>
                    <span className="text-primary">
                      {formatKip(transaction.totalAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>
                    {isFxToNonLak
                      ? `TỔNG QUY ĐỔI (${transaction.targetCurrency})`
                      : "TỔNG QUY ĐỔI (LAK)"}
                  </span>
                  <span className="text-primary">
                    {isFxToNonLak
                      ? `${(transaction.targetAmount ?? 0).toLocaleString("en")} ${transaction.targetCurrency}`
                      : formatKip(transaction.totalAmount)}
                  </span>
                </div>
              )}
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
