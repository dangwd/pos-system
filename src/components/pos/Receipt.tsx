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
    MIXED: "combined",
    COMBINED: "combined",
  };
  const rawKey = transaction.paymentMethod
    ? methodKeyMap[transaction.paymentMethod]
    : undefined;
  const paymentLabel = rawKey
    ? tMethods(rawKey)
    : (transaction.paymentMethod ?? "—");

  const isCompleted = !isCancelled && transaction.status === "Completed";
  const isBuy = transaction.type === "BuyGold" || transaction.type === "BuySilver";
  const isSilverBuy = transaction.type === "BuySilver";
  const isFx = transaction.type === "ExchangeCurrency";
  const isFxToNonLak = isFx && !!transaction.targetCurrency && transaction.targetCurrency !== "LAK";
  // Dùng foreignAmount từ DB (v2026-06-16+). Fallback sang note parsing cho GD cũ.
  const fxHasDirect = isFx && transaction.foreignAmount != null;
  const fxParsed = isFx && !fxHasDirect ? parseFxNote(transaction.note) : null;

  // Resolved exchange lines — Mode A từ backend, hoặc synthesize từ scalar fields
  const rawFxLines = isFx ? (transaction.exchangeLines ?? []) : [];
  const resolvedFxLines = rawFxLines.length > 0
    ? rawFxLines
    : isFx && fxHasDirect && transaction.currency
      ? [{
          fromCurrency: transaction.currency,
          fromAmount: transaction.foreignAmount!,
          fromRateToLak: transaction.exchangeRate ?? 0,
          toCurrency: transaction.targetCurrency ?? "LAK",
          toRateToLak: transaction.targetCurrency && transaction.targetCurrency !== "LAK"
            ? (transaction.targetRateToLak ?? 1)
            : 1,
          toAmount: isFxToNonLak
            ? (transaction.targetAmount ?? undefined)
            : transaction.totalAmount,
        }]
      : isFx && fxParsed
        ? [{
            fromCurrency: fxParsed.fromCurr,
            fromAmount: parseFloat(fxParsed.fromAmt.replace(/,/g, "")),
            fromRateToLak: 0,
            toCurrency: fxParsed.toCurr,
            toRateToLak: 0,
            toAmount: fxParsed.toCurr === "LAK"
              ? transaction.totalAmount
              : parseFloat(fxParsed.toAmt.replace(/,/g, "")),
          }]
        : [];

  function fxComputeToAmount(line: { fromAmount: number; fromRateToLak: number; toRateToLak: number; toAmount?: number }) {
    if (line.toAmount != null) return line.toAmount;
    const lak = Math.round(line.fromAmount * line.fromRateToLak);
    return line.toRateToLak > 0 ? Math.round((lak / line.toRateToLak) * 10000) / 10000 : 0;
  }

  const fxTotalsMap: Record<string, number> = {};
  for (const line of resolvedFxLines) {
    const toAmt = fxComputeToAmount(line);
    if (toAmt > 0) fxTotalsMap[line.toCurrency] = (fxTotalsMap[line.toCurrency] ?? 0) + toAmt;
  }
  const fxTotalEntries = Object.entries(fxTotalsMap);

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
          className={isExchange ? "sm:max-w-6xl min-w-6xl" : "sm:max-w-3xl min-w-3xl"}
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
              resolvedFxLines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>{t("fxColFrom")}</TableHead>
                      <TableHead className="text-center">{t("fxColRate")}</TableHead>
                      <TableHead className="text-right">{t("fxColTo")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedFxLines.map((line, idx) => {
                      const toAmt = fxComputeToAmount(line);
                      const isFromLak = line.fromCurrency === "LAK";
                      const rateDisplayCurr = isFromLak ? line.toCurrency : line.fromCurrency;
                      const rateDisplayVal = isFromLak ? line.toRateToLak : line.fromRateToLak;
                      const showBothRates = !isFromLak && line.toCurrency !== "LAK" && line.toRateToLak > 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <span className="font-semibold tabular-nums">
                              {line.fromAmount.toLocaleString("en", { maximumFractionDigits: 2 })}
                            </span>{" "}
                            <span className="font-bold text-primary">{line.fromCurrency}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {rateDisplayVal > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                {"1 "}
                                <span className="font-semibold text-foreground">{rateDisplayCurr}</span>
                                {" = "}
                                <span className="font-semibold text-foreground tabular-nums">
                                  {rateDisplayVal.toLocaleString("lo-LA")}
                                </span>
                                {" ₭"}
                                {showBothRates && (
                                  <>
                                    {" · 1 "}
                                    <span className="font-semibold text-foreground">{line.toCurrency}</span>
                                    {" = "}
                                    <span className="font-semibold text-foreground tabular-nums">
                                      {line.toRateToLak.toLocaleString("lo-LA")}
                                    </span>
                                    {" ₭"}
                                  </>
                                )}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-black tabular-nums text-base">
                              {line.toCurrency === "LAK"
                                ? Math.round(toAmt).toLocaleString("lo-LA") + " ₭"
                                : `${toAmt.toLocaleString("en", { maximumFractionDigits: 4 })} ${line.toCurrency}`}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center">{transaction.note ?? "—"}</p>
              )
            ) : isExchange ? (
              <div className="space-y-3">
                {/* PANEL B — Vàng cũ thu vào */}
                {exchangeInItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <VerticalAlignBottomOutlined className="h-3 w-3 shrink-0" />
                      {t("panelExchangeIn")}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("columnProduct")}</TableHead>
                          <TableHead className="text-center">{t("columnQty")}</TableHead>
                          <TableHead className="text-center">{t("columnUnit")}</TableHead>
                          <TableHead className="text-right">{t("columnUnitPrice")}</TableHead>
                          <TableHead className="text-right text-orange-600">{t("columnDamageFee")}</TableHead>
                          <TableHead className="text-right text-orange-600">{t("columnWear")}</TableHead>
                          <TableHead className="text-right text-orange-600">{t("columnWearValue")}</TableHead>
                          <TableHead className="text-right text-amber-600">{t("columnTotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exchangeInItems.map((item) => {
                          const pricePerGram = item.weightGram > 0 ? item.unitPriceLak / item.weightGram : 0;
                          const haoHutGram = item.haoHutGram ?? 0;
                          const phiHuHai = item.phiHuHai ?? 0;
                          // Giá gốc/đơn vị = giá hiệu lực × (effectiveGram + haoMòn) / effectiveGram
                          const grossPricePerUnit = item.weightGram > 0
                            ? Math.round(item.unitPriceLak * (item.weightGram + haoHutGram) / item.weightGram)
                            : item.unitPriceLak;
                          const haoHutChi = haoHutGram / 3.75;
                          const haoMonValue = Math.round(haoHutGram * pricePerGram);
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{item.productSnapshotName}</TableCell>
                              <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {item.weightUnitName || "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatKip(grossPricePerUnit)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-orange-600">
                                {phiHuHai > 0 ? formatKip(phiHuHai) : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm text-orange-600">
                                {haoHutChi > 0 ? `${haoHutChi.toLocaleString("lo-LA")} ${t("weightUnit")}` : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm text-orange-600">
                                {haoMonValue > 0 ? formatKip(haoMonValue) : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm font-semibold text-amber-700 dark:text-amber-400">
                                {formatKip(item.lineTotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="flex justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 px-1 pt-1.5 border-t border-amber-200 dark:border-amber-900">
                      <span>{t("panelExchangeInTotal")}</span>
                      <span>{formatKip(totalB)}</span>
                    </div>
                  </div>
                )}

                {/* PANEL A — Hàng bán ra mới */}
                {normalItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest mb-1">
                      <VerticalAlignTopOutlined className="h-3 w-3 shrink-0" />
                      {t("panelNew")}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("columnProduct")}</TableHead>
                          <TableHead className="text-center">{t("columnQty")}</TableHead>
                          <TableHead className="text-center">{t("columnUnit")}</TableHead>
                          <TableHead className="text-right">{t("columnUnitPrice")}</TableHead>
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
                              {formatKip(item.unitPriceLak)}
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
                      <span>{t("panelNewTotal")}</span>
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
                    <TableHead className="text-center">{t("columnUnit")}</TableHead>
                    <TableHead className="text-right">
                      {isBuy ? t("columnBuyPrice") : t("columnUnitPrice")}
                    </TableHead>
                    {isBuy && (
                      <TableHead className="text-right">{t("columnDamageFee")}</TableHead>
                    )}
                    {isBuy && (
                      <TableHead className="text-right">{t("columnWear")}</TableHead>
                    )}
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
                      {isBuy ? t("columnShopPays") : t("columnTotal")}
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
                        {formatKip(item.unitPriceLak)}
                      </TableCell>
                      {isBuy && (
                        <TableCell className="text-right text-sm">
                          {(item.phiHuHai ?? 0) > 0 ? formatKip(item.phiHuHai!) : "—"}
                        </TableCell>
                      )}
                      {isBuy && (
                        <TableCell className="text-right text-sm">
                          {(item.haoHutGram ?? 0) > 0
                            ? isSilverBuy
                              ? `${(item.haoHutGram ?? 0).toLocaleString("lo-LA")} ${t("weightUnitGram")}`
                              : `${((item.haoHutGram ?? 0) / 3.75).toLocaleString("lo-LA")} ${t("weightUnit")}`
                            : "—"}
                        </TableCell>
                      )}
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

            {(!isFx || resolvedFxLines.length === 0 || fxTotalEntries.length < resolvedFxLines.length) && (
              <Separator />
            )}

            <div className="space-y-1 text-sm">
              {isExchange ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("summaryExchangeA")}</span>
                    <span>{formatKip(totalA)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>{t("summaryExchangeB")}</span>
                    <span>−{formatKip(totalB)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>
                      {transaction.totalAmount > 0
                        ? t("customerPaysExtra")
                        : transaction.totalAmount < 0
                          ? t("shopReturns")
                          : t("breakEven")}
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
                  {isBuy ? (
                    (() => {
                      // Hao mòn (₭): dùng haoHutGram × pricePerGram nếu backend trả về.
                      // pricePerGram = unitPriceLak / weightGram (vì backend đã điều chỉnh
                      // unitPriceLak = effectiveGram × pricePerGram, weightGram = effectiveGram).
                      const totalWear = transaction.items.reduce((s, i) => {
                        if (!i.haoHutGram || i.haoHutGram <= 0 || !i.weightGram) return s;
                        return s + Math.round(i.haoHutGram * (i.unitPriceLak / i.weightGram));
                      }, 0);

                      // Phí lỗi/hỏng: dùng phiHuHai nếu có, fallback: unitPriceLak × qty − lineTotal.
                      const totalDamage = transaction.items.reduce((s, i) => {
                        if (i.phiHuHai !== undefined) return s + i.phiHuHai;
                        return s + Math.max(0, i.quantity * i.unitPriceLak - i.lineTotal);
                      }, 0);

                      // Giá mua gốc = effective + hao mòn (phục hồi giá ban đầu nếu biết haoHutGram).
                      const buyGross = transaction.items.reduce((s, i) => {
                        const effectiveValue = i.quantity * i.unitPriceLak;
                        if (i.haoHutGram && i.haoHutGram > 0 && i.weightGram > 0) {
                          return s + effectiveValue + Math.round(i.haoHutGram * (i.unitPriceLak / i.weightGram));
                        }
                        return s + effectiveValue;
                      }, 0);

                      return (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{t("buyGrossLabel")}</span>
                            <span>{formatKip(buyGross)}</span>
                          </div>
                          {totalWear > 0 && (
                            <div className="flex justify-between text-orange-600 dark:text-orange-400">
                              <span>{t("buyWearLabel")}</span>
                              <span>{formatKip(totalWear)}</span>
                            </div>
                          )}
                          {totalDamage > 0 && (
                            <div className="flex justify-between text-orange-600 dark:text-orange-400">
                              <span>{t("buyDamageLabel")}</span>
                              <span>{formatKip(totalDamage)}</span>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
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
                    <span>{isBuy ? t("shopPaysTotalLabel") : t("totalLabel")}</span>
                    <span className={isBuy ? "text-blue-600 dark:text-blue-400" : "text-primary"}>
                      {formatKip(transaction.totalAmount)}
                    </span>
                  </div>
                </>
              ) : resolvedFxLines.length > 0 && fxTotalEntries.length > 0 && fxTotalEntries.length < resolvedFxLines.length ? (
                <div className="space-y-1.5 pt-1 border-t">
                  {fxTotalEntries.map(([currency, amount]) => (
                    <div key={currency} className="flex justify-between font-bold text-base">
                      <span>
                        {t("fxTotal", { currency })}
                      </span>
                      <span className="text-primary tabular-nums">
                        {currency === "LAK"
                          ? formatKip(Math.round(amount))
                          : `${amount.toLocaleString("en", { maximumFractionDigits: 4 })} ${currency}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : resolvedFxLines.length > 0 ? (
                null
              ) : (
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>
                    {isFxToNonLak
                      ? t("fxTotal", { currency: transaction.targetCurrency ?? "" })
                      : t("fxTotalLak")}
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
