/**
 * POS Page — Màn hình bán hàng chính
 *
 * Component này chỉ orchestrate — không chứa business logic.
 * Mọi state đến từ usePos() facade (R-ARCH-5).
 */

"use client";

import { PaymentPanel } from "@/components/pos/PaymentPanel";
import { PrintInvoiceModal } from "@/components/pos/PrintInvoiceModal";
import { PosTopBar } from "@/components/pos/PosTopBar";
import { Receipt } from "@/components/pos/Receipt";
import { TransactionTable } from "@/components/pos/TransactionTable";
import { usePos } from "@/hooks/usePos";
import type { Transaction } from "@/types/transaction";
import { Splitter } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/lib/toast";

export default function PosPage() {
  const t = useTranslations("pos.errors");
  const toast = useToast();
  const [receiptTransaction, setReceiptTransaction] =
    useState<Transaction | null>(null);
  const pos = usePos();

  const isFx = pos.txnType === "ExchangeCurrency";

  const handleCheckout = async (combined?: {
    cashAmount: number;
    bankAmount: number;
  }) => {
    if (!isFx && pos.cartItems.length === 0) {
      toast.error(t("emptyCart"));
      return;
    }
    pos.setTabPaying();
    try {
      const transaction = await pos.checkout({
        type: pos.txnType,
        customerId: pos.customerId ?? '',
        note: pos.note || undefined,
        cashAmount: combined?.cashAmount,
        bankAmount: combined?.bankAmount,
      });
      pos.resetTabStatus();
      if (transaction) setReceiptTransaction(transaction);
    } catch {
      pos.resetTabStatus();
    }
  };

  const handleDirectCheckout = async () => {
    pos.setTabPaying();
    try {
      const transaction = await pos.checkout({ type: "ExchangeCurrency", customerId: pos.customerId ?? '' });
      pos.resetTabStatus();
      if (transaction) setReceiptTransaction(transaction);
    } catch {
      pos.resetTabStatus();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PosTopBar onAddProduct={pos.addToCart} />

      <Splitter className="flex-1 min-h-0">
        <Splitter.Panel defaultSize="70%" min="40%" style={{ overflow: 'hidden' }}>
          <TransactionTable />
        </Splitter.Panel>
        <Splitter.Panel defaultSize="30%" min={300} style={{ overflow: 'hidden' }}>
          <PaymentPanel
            isCheckingOut={pos.isCheckingOut}
            paymentMethod={pos.paymentMethod}
            onPaymentMethodChange={pos.setPaymentMethod}
            onCheckout={handleCheckout}
            onDirectCheckout={handleDirectCheckout}
            onApplyDiscount={pos.applyDiscount}
            onClearDiscount={pos.clearDiscount}
          />
        </Splitter.Panel>
      </Splitter>

      <Receipt
        open={!!receiptTransaction}
        transaction={receiptTransaction}
        onClose={() => setReceiptTransaction(null)}
      />

      <PrintInvoiceModal />
    </div>
  );
}
