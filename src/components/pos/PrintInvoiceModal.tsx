"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { PrintInvoice, PrintItem } from "@/stores/print.store";
import { INVOICE_TITLE, usePrintStore } from "@/stores/print.store";
import { PrinterOutlined, CloseOutlined } from "@ant-design/icons";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kip(amount: number) {
  return amount.toLocaleString("lo-LA") + " ₭";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InvoiceRow({
  item,
  amber = false,
  isBuyType = false,
}: {
  item: PrintItem;
  amber?: boolean;
  isBuyType?: boolean;
}) {
  const col6 = isBuyType
    ? (item.damageFee > 0 ? item.damageFee.toLocaleString("lo-LA") : "—")
    : (item.laborFee > 0 ? item.laborFee.toLocaleString("lo-LA") : "—")
  const col7 = isBuyType
    ? (item.wearValue > 0 ? item.wearValue.toLocaleString("lo-LA") : "—")
    : (item.stoneFee > 0 ? item.stoneFee.toLocaleString("lo-LA") : "—")

  return (
    <tr className={amber ? "bg-amber-50" : undefined}>
      <td className="border border-gray-400 px-1 py-[2px] text-center">
        {item.stt}
      </td>
      <td className="border border-gray-400 px-2 py-[2px]">
        {item.productName}
      </td>
      <td className="border border-gray-400 px-1 py-[2px] text-center">
        {item.quantity}
      </td>
      <td className="border border-gray-400 px-1 py-[2px] text-center">
        {item.unitName || "—"}
      </td>
      <td className="border border-gray-400 px-2 py-[2px] text-right tabular-nums">
        {item.unitPriceLak > 0
          ? item.unitPriceLak.toLocaleString("lo-LA")
          : "—"}
      </td>
      <td className="border border-gray-400 px-2 py-[2px] text-right tabular-nums">
        {col6}
      </td>
      <td className="border border-gray-400 px-2 py-[2px] text-right tabular-nums">
        {col7}
      </td>
      <td
        className={`border border-gray-400 px-2 py-[2px] text-right font-semibold tabular-nums ${amber ? "text-amber-700" : ""}`}
      >
        {amber
          ? `(${item.lineTotal.toLocaleString("lo-LA")})`
          : item.lineTotal.toLocaleString("lo-LA")}
      </td>
    </tr>
  );
}

// ─── Print template ──────────────────────────────────────────────────────────

const EXCHANGE_TYPES = ["ExchangeGold", "ExchangeFree", "BuyMoreGold", "ExchangeToMoney"];

function InvoiceTemplate({ inv }: { inv: PrintInvoice }) {
  const title = INVOICE_TITLE[inv.txnType];
  const isFx = inv.txnType === "ExchangeCurrency";
  const isExchange = EXCHANGE_TYPES.includes(inv.txnType);
  const isBuyGold = inv.txnType === "BuyGold" || inv.txnType === "BuySilver";
  // totalAmount = A - B (có thể âm với ExchangeGold). totalB = tổng vàng cũ cấn trừ.
  const totalB = inv.exchangeInItems.reduce((s, i) => s + i.lineTotal, 0);
  const totalA = inv.totalAmount + totalB;

  return (
    <div
      className="pos-print-invoice bg-white text-black text-[12px] leading-snug font-sans"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      {/* ── Store header ─────────────────────────────────── */}
      <div className="text-center mb-3">
        <p className="font-black text-base uppercase tracking-wide">
          ຮ້ານຄຳຂາມພຸວົງ · Khamphouvong Jewelry
        </p>
        <p className="text-[11px]">
          ບ. ດົງໂດກ, ເມືອງໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ · (021) 000-000
        </p>
      </div>

      {/* ── Invoice title ─────────────────────────────────── */}
      <div className="text-center border-y-2 border-black py-2 mb-3">
        <p className="font-black text-lg tracking-widest uppercase">
          {title.vi}
        </p>
        <p className="text-[13px]">{title.lo}</p>
      </div>

      {/* ── Metadata ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-6 mb-3 text-[11px]">
        <div className="space-y-0.5">
          <Row label="Số HĐ / ເລກທີ" value={inv.invoiceCode} />
          <Row label="Ngày / ວັນທີ" value={fmtDate(inv.transactedAt)} />
          <Row label="Giờ / ເວລາ" value={fmtTime(inv.transactedAt)} />
          {inv.referenceInvoiceCode && (
            <Row label="HĐ gốc / ໃບບິນເດີມ" value={inv.referenceInvoiceCode} />
          )}
        </div>
        <div className="space-y-0.5">
          <Row label="Chi nhánh / ສາຂາ" value={inv.branchName} />
          <Row label="Quầy / ຕູ້" value={inv.counterName} />
          <Row label="Thu ngân / NV" value={inv.cashierName} />
        </div>
      </div>

      {/* ── Customer ──────────────────────────────────────── */}
      {(inv.customerName || inv.customerPhone) && (
        <div className="border border-gray-400 px-3 py-1 mb-3 text-[11px] flex gap-8">
          <Row label="Khách hàng / ລູກຄ້າ" value={inv.customerName ?? "—"} />
          {inv.customerPhone && (
            <Row label="ĐT / ໂທ" value={inv.customerPhone} />
          )}
        </div>
      )}

      {/* ── FX section ────────────────────────────────────── */}
      {isFx && (() => {
        type FxLine = { fromCurrency: string; fromAmount: number; fromRateToLak: number; toCurrency: string; toRateToLak: number; toAmount?: number };

        function computeToAmt(line: FxLine): number {
          if (line.toAmount != null) return line.toAmount;
          const lak = Math.round(line.fromAmount * line.fromRateToLak);
          return line.toRateToLak > 0 ? Math.round((lak / line.toRateToLak) * 10000) / 10000 : 0;
        }

        // Mode A từ backend; nếu rỗng thì synthesize từ scalar fields
        const rawLines: FxLine[] = inv.exchangeLines ?? [];
        const isFxToNonLak = !!inv.targetCurrency && inv.targetCurrency !== "LAK";
        const lines: FxLine[] = rawLines.length > 0
          ? rawLines
          : inv.foreignAmount != null && inv.currency
            ? [{
                fromCurrency: inv.currency,
                fromAmount: inv.foreignAmount,
                fromRateToLak: inv.exchangeRate ?? 0,
                toCurrency: inv.targetCurrency ?? "LAK",
                toRateToLak: isFxToNonLak ? (inv.targetRateToLak ?? 1) : 1,
                toAmount: isFxToNonLak ? (inv.targetAmount ?? undefined) : inv.totalAmount,
              }]
            : [];

        return (
          <table className="w-full text-[11px] border-collapse mb-3">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-1 py-1 text-center w-6">#</th>
                <th className="border border-gray-400 px-2 py-1 text-center">
                  Ngoại tệ nhận / ເງິນຕ່າງປະເທດ
                </th>
                <th className="border border-gray-400 px-1 py-1 text-center w-6">→</th>
                <th className="border border-gray-400 px-2 py-1 text-center">
                  Tiền nhận ra / ເງິນຮັບ
                </th>
                <th className="border border-gray-400 px-2 py-1 text-center">
                  Tỷ giá / ອັດຕາແລກປ່ຽນ
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-400 px-2 py-2 text-center text-gray-400">
                    {inv.note ?? "—"}
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const toAmt = computeToAmt(line);
                  const isFromLak = line.fromCurrency === "LAK";
                  const rateDisplayCurr = isFromLak ? line.toCurrency : line.fromCurrency;
                  const rateDisplayVal = isFromLak ? line.toRateToLak : line.fromRateToLak;
                  const showBothRates = !isFromLak && line.toCurrency !== "LAK" && line.toRateToLak > 0;
                  return (
                    <tr key={idx}>
                      <td className="border border-gray-400 px-1 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-center font-semibold tabular-nums">
                        {line.fromAmount.toLocaleString("en", { maximumFractionDigits: 2 })} {line.fromCurrency}
                      </td>
                      <td className="border border-gray-400 px-1 py-1.5 text-center font-bold">→</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-center font-semibold tabular-nums">
                        {line.toCurrency === "LAK"
                          ? kip(Math.round(toAmt))
                          : `${toAmt.toLocaleString("en", { maximumFractionDigits: 4 })} ${line.toCurrency}`}
                      </td>
                      <td className="border border-gray-400 px-2 py-1.5 text-center text-[10px] text-gray-600">
                        {rateDisplayVal > 0 ? (
                          <>
                            1 {rateDisplayCurr} = {rateDisplayVal.toLocaleString("lo-LA")} ₭
                            {showBothRates && <><br />1 {line.toCurrency} = {line.toRateToLak.toLocaleString("lo-LA")} ₭</>}
                          </>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        );

      })()}

      {/* ── Items table ───────────────────────────────────── */}
      {!isFx && inv.items.length > 0 && (
        <table className="w-full text-[11px] border-collapse mb-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-1 py-1 text-center w-7">
                STT
              </th>
              <th className="border border-gray-400 px-2 py-1 text-left">
                Tên hàng / ຊື່ສິນຄ້າ
              </th>
              <th className="border border-gray-400 px-1 py-1 text-center w-8">
                SL
              </th>
              <th className="border border-gray-400 px-1 py-1 text-center w-12">
                ĐVT
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-24">
                Đơn giá ₭
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-20">
                {isBuyGold ? "Lỗi/hỏng ₭" : "T. công ₭"}
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-16">
                {isBuyGold ? "Hao mòn ₭" : "Đá ₭"}
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-24">
                Thành tiền ₭
              </th>
            </tr>
          </thead>
          <tbody>
            {inv.normalItems.map((item) => (
              <InvoiceRow key={item.stt} item={item} isBuyType={isBuyGold} />
            ))}

            {inv.exchangeInItems.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-gray-400 px-2 py-1 text-center font-semibold bg-amber-50 text-[10px] tracking-wide"
                  >
                    ─── Vàng cũ thu vào / ຄຳເກົ່ານຳເຂົ້າ ───
                  </td>
                </tr>
                {inv.exchangeInItems.map((item) => (
                  <InvoiceRow key={`ex-${item.stt}`} item={item} amber isBuyType />
                ))}
              </>
            )}
          </tbody>
        </table>
      )}

      {/* ── Totals ────────────────────────────────────────── */}
      <div className="flex justify-end mb-3">
        <div className="w-72 text-[11px] space-y-0.5">
          {isExchange ? (
            <>
              <div className="flex justify-between">
                <span>(A) Hàng bán ra mới / ສິນຄ້າໃໝ່:</span>
                <span className="tabular-nums">{kip(totalA)}</span>
              </div>
              <div className="flex justify-between">
                <span>(B) Vàng cũ cấn trừ / ຄຳເກົ່າຫັກລົບ:</span>
                <span className="tabular-nums">−{kip(totalB)}</span>
              </div>
              <div className="flex justify-between font-black text-[13px] border-t-2 border-black pt-1">
                <span>
                  {inv.totalAmount > 0
                    ? "KHÁCH TRẢ THÊM / ລູກຄ້າຈ່າຍເພີ່ມ:"
                    : inv.totalAmount < 0
                      ? "TIỆM TRẢ LẠI / ຮ້ານຄືນ:"
                      : "HOÀ VỐN / ສົມດຸນ:"}
                </span>
                <span className="tabular-nums">{kip(Math.abs(inv.totalAmount))}</span>
              </div>
            </>
          ) : isBuyGold ? (
            <>
              {(() => {
                // Primary: dùng phí đã được parseItemFees giải mã
                const totalDamage = inv.normalItems.reduce((s, i) => s + i.damageFee, 0)
                const totalWear = inv.normalItems.reduce((s, i) => s + i.wearValue, 0)
                // Fallback: tính từ chênh lệch qty×unitPriceLak − lineTotal khi parseItemFees không giải mã được
                const fallbackDeductions = totalDamage === 0 && totalWear === 0
                  ? inv.normalItems.reduce(
                      (s, i) => s + Math.max(0, i.quantity * i.unitPriceLak - i.lineTotal),
                      0,
                    )
                  : 0
                const hasDeductions = totalDamage > 0 || totalWear > 0 || fallbackDeductions > 0
                // Giá thu vào: subtotalAmount từ backend, fallback: tổng + khấu trừ
                const giaThúVao = inv.subtotalAmount > 0
                  ? inv.subtotalAmount
                  : inv.totalAmount + totalDamage + totalWear + fallbackDeductions
                return hasDeductions ? (
                  <>
                    <div className="flex justify-between">
                      <span>Giá thu vào / ລາຄາຊື້:</span>
                      <span className="tabular-nums">{kip(giaThúVao)}</span>
                    </div>
                    {totalDamage > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Phí lỗi/hỏng / ຄ່າເສຍຫາຍ:</span>
                        <span className="tabular-nums">−{kip(totalDamage)}</span>
                      </div>
                    )}
                    {totalWear > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Hao mòn / ການສຶກຫໍໍ:</span>
                        <span className="tabular-nums">−{kip(totalWear)}</span>
                      </div>
                    )}
                    {fallbackDeductions > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Khấu trừ / ຫັກລົບ:</span>
                        <span className="tabular-nums">−{kip(fallbackDeductions)}</span>
                      </div>
                    )}
                  </>
                ) : null
              })()}
              <div className="flex justify-between font-black text-[13px] border-t-2 border-black pt-1">
                <span>TIỆM CHI RA / ຮ້ານຈ່າຍ:</span>
                <span className="tabular-nums">{kip(inv.totalAmount)}</span>
              </div>
            </>
          ) : isFx ? (
            <>
              {/* FX: hiển thị số tiền khách nhận theo từng ngoại tệ */}
              {(() => {
                const fxL = inv.exchangeLines ?? [];
                const totals: Record<string, number> = {};
                if (fxL.length > 0) {
                  for (const l of fxL) {
                    const toAmt = l.toAmount != null ? l.toAmount
                      : l.toRateToLak > 0
                        ? Math.round((Math.round(l.fromAmount * l.fromRateToLak) / l.toRateToLak) * 10000) / 10000
                        : 0;
                    if (toAmt > 0) totals[l.toCurrency] = (totals[l.toCurrency] ?? 0) + toAmt;
                  }
                } else if (inv.targetCurrency && inv.targetCurrency !== "LAK" && inv.targetAmount) {
                  totals[inv.targetCurrency] = inv.targetAmount;
                }
                return Object.entries(totals).map(([cur, amt]) => (
                  <div key={cur} className="flex justify-between">
                    <span>Khách nhận ({cur}) / ລູກຄ້າຮັບ:</span>
                    <span className="tabular-nums font-semibold">
                      {cur === "LAK"
                        ? kip(Math.round(amt))
                        : `${amt.toLocaleString("en", { maximumFractionDigits: 4 })} ${cur}`}
                    </span>
                  </div>
                ));
              })()}
              <div className="flex justify-between font-black text-[13px] border-t-2 border-black pt-1">
                <span>TỔNG / ລວມ:</span>
                <span className="tabular-nums">{kip(inv.totalAmount)}</span>
              </div>
            </>
          ) : (
            <>
              {(inv.laborFee > 0 || inv.stoneFee > 0) && (
                <>
                  <div className="flex justify-between">
                    <span>Tiền hàng / ລາຄາສິນຄ້າ:</span>
                    <span className="tabular-nums">{kip(inv.subtotalAmount)}</span>
                  </div>
                  {inv.laborFee > 0 && (
                    <div className="flex justify-between">
                      <span>Tiền công / ຄ່າແຮງງານ:</span>
                      <span className="tabular-nums">{kip(inv.laborFee)}</span>
                    </div>
                  )}
                  {inv.stoneFee > 0 && (
                    <div className="flex justify-between">
                      <span>Phí đá / ຄ່າຫີນ:</span>
                      <span className="tabular-nums">{kip(inv.stoneFee)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between font-black text-[13px] border-t-2 border-black pt-1">
                <span>TỔNG / ລວມ:</span>
                <span className="tabular-nums">{kip(inv.totalAmount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Amount in words ───────────────────────────────── */}
      <div className="border border-gray-400 p-2 mb-3 text-[11px] space-y-0.5">
        <p>
          <span className="font-semibold">Số tiền bằng chữ (VN): </span>
          {inv.totalInWordsVi}
        </p>
        <p>
          <span className="font-semibold">ຈໍານວນເງິນເປັນຕົວໜັງສື (ລາວ): </span>
          {inv.totalInWordsLo}
        </p>
      </div>

      {/* ── Payment ───────────────────────────────────────── */}
      <div className="text-[11px] mb-3">
        <span className="font-semibold">Phương thức / ວິທີຊໍາລະ: </span>
        {inv.paymentMethod === "CASH" && "Tiền mặt / ເງິນສົດ"}
        {inv.paymentMethod === "BANK" && "Chuyển khoản / ໂອນເງິນ"}
        {inv.paymentMethod === "COMBINED" && (
          <>
            Tiền mặt / ເງິນສົດ:{" "}
            <span className="tabular-nums">{kip(inv.cashAmount ?? 0)}</span>
            {"  +  "}
            Chuyển khoản / ໂອນ:{" "}
            <span className="tabular-nums">{kip(inv.bankAmount ?? 0)}</span>
          </>
        )}
      </div>

      {/* ── Note ──────────────────────────────────────────── */}
      {inv.note && inv.txnType !== "ExchangeCurrency" && (
        <div className="text-[11px] mb-3">
          <span className="font-semibold">Ghi chú / ໝາຍເຫດ: </span>
          {inv.note}
        </div>
      )}

      {/* ── Signatures ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 text-[11px] text-center mt-8">
        {(
          ["Khách hàng", "Thu ngân / NV bán", "Quản lý / ຜູ້ຈັດການ"] as const
        ).map((role, i) => (
          <div key={role}>
            <p className="font-semibold">{role}</p>
            <div className="h-14 border-b border-black mt-8" />
            <p className="mt-1">
              {i === 0
                ? (inv.customerName ?? "...............................")
                : i === 1
                  ? inv.cashierName
                  : "..............................."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="font-semibold w-40 shrink-0">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function PrintInvoiceModal() {
  const { isOpen, invoice, closePrint, triggerPrint } = usePrintStore();

  return (
    <>
      {/* Print-only CSS — makes .pos-print-invoice the sole visible element */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .pos-print-invoice,
          .pos-print-invoice * { visibility: visible !important; }
          .pos-print-invoice {
            position: fixed !important;
            inset: 0 !important;
            padding: 24px !important;
            background: white !important;
            z-index: 99999 !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={closePrint}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh]"
          title={
            invoice ? (
              <span className="flex items-center gap-2">
                <PrinterOutlined className="h-4 w-4" />
                {INVOICE_TITLE[invoice.txnType].vi}
              </span>
            ) : undefined
          }
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={closePrint}>
                <CloseOutlined className="h-4 w-4 mr-2" />
                Đóng
              </Button>
              <Button onClick={triggerPrint}>
                <PrinterOutlined className="h-4 w-4 mr-2" />
                In hóa đơn
              </Button>
            </DialogFooter>
          }
        >
          <div
            className="overflow-y-auto pr-1"
            style={{ maxHeight: "calc(90vh - 130px)" }}
          >
            {invoice && <InvoiceTemplate inv={invoice} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
