"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { PrintInvoice, PrintItem } from "@/stores/print.store";
import { INVOICE_TITLE, usePrintStore } from "@/stores/print.store";
import { Printer, X } from "lucide-react";

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
}: {
  item: PrintItem;
  amber?: boolean;
}) {
  return (
    <tr className={amber ? "bg-amber-50" : undefined}>
      <td className="border border-gray-400 px-1 py-[2px] text-center">
        {item.stt}
      </td>
      <td className="border border-gray-400 px-2 py-[2px]">
        {item.productName}
      </td>
      <td className="border border-gray-400 px-1 py-[2px] text-center">
        {item.unitName || "—"}
      </td>
      <td className="border border-gray-400 px-1 py-[2px] text-center">
        {item.quantity}
      </td>
      <td className="border border-gray-400 px-2 py-[2px] text-right tabular-nums">
        {item.unitPriceLak > 0
          ? item.unitPriceLak.toLocaleString("lo-LA")
          : "—"}
      </td>
      <td className="border border-gray-400 px-2 py-[2px] text-right tabular-nums">
        {item.laborFee > 0 ? item.laborFee.toLocaleString("lo-LA") : "—"}
      </td>
      <td className="border border-gray-400 px-2 py-[2px] text-right tabular-nums">
        {item.stoneFee > 0 ? item.stoneFee.toLocaleString("lo-LA") : "—"}
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
        <div className="space-y-[2px]">
          <Row label="Số HĐ / ເລກທີ" value={inv.invoiceCode} />
          <Row label="Ngày / ວັນທີ" value={fmtDate(inv.transactedAt)} />
          <Row label="Giờ / ເວລາ" value={fmtTime(inv.transactedAt)} />
          {inv.referenceInvoiceCode && (
            <Row label="HĐ gốc / ໃບບິນເດີມ" value={inv.referenceInvoiceCode} />
          )}
        </div>
        <div className="space-y-[2px]">
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
      {isFx && (
        <div className="border border-gray-400 rounded p-3 mb-3 text-center space-y-1">
          <div className="flex justify-center items-center gap-6">
            <div>
              <p className="text-[10px] text-gray-500">
                Ngoại tệ / ເງິນຕ່າງປະເທດ
              </p>
              <p className="font-black text-base tabular-nums">
                {(inv.cashAmount ?? 0).toLocaleString("lo-LA")} {inv.currency}
              </p>
            </div>
            <p className="text-xl font-bold">→</p>
            <div>
              <p className="text-[10px] text-gray-500">Tiền LAK / ເງິນກີບ</p>
              <p className="font-black text-base tabular-nums">
                {kip(inv.totalAmount)}
              </p>
            </div>
          </div>
          {inv.exchangeRate && inv.currency && (
            <p className="text-[10px] text-gray-500">
              Tỷ giá: 1 {inv.currency} ={" "}
              {inv.exchangeRate.toLocaleString("lo-LA")} ₭
            </p>
          )}
        </div>
      )}

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
              <th className="border border-gray-400 px-1 py-1 text-center w-12">
                ĐVT
              </th>
              <th className="border border-gray-400 px-1 py-1 text-center w-8">
                SL
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-24">
                Đơn giá ₭
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-20">
                T. công ₭
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-16">
                Đá ₭
              </th>
              <th className="border border-gray-400 px-2 py-1 text-right w-24">
                Thành tiền ₭
              </th>
            </tr>
          </thead>
          <tbody>
            {inv.normalItems.map((item) => (
              <InvoiceRow key={item.stt} item={item} />
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
                  <InvoiceRow key={`ex-${item.stt}`} item={item} amber />
                ))}
              </>
            )}
          </tbody>
        </table>
      )}

      {/* ── Totals ────────────────────────────────────────── */}
      <div className="flex justify-end mb-3">
        <div className="w-72 text-[11px] space-y-[2px]">
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
      <div className="border border-gray-400 p-2 mb-3 text-[11px] space-y-[2px]">
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
                <Printer className="h-4 w-4" />
                {INVOICE_TITLE[invoice.txnType].vi}
              </span>
            ) : undefined
          }
          footer={
            <DialogFooter>
              <Button variant="outline" onClick={closePrint}>
                <X className="h-4 w-4 mr-2" />
                Đóng
              </Button>
              <Button onClick={triggerPrint}>
                <Printer className="h-4 w-4 mr-2" />
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
