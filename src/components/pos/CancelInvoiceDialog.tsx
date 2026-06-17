"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCancelTransaction } from "@/hooks/useTransactions";
import { WarningOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CancelInvoiceDialogProps {
  open: boolean;
  transactionId: string;
  invoiceCode: string;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelInvoiceDialog({
  open,
  transactionId,
  invoiceCode,
  onClose,
  onCancelled,
}: CancelInvoiceDialogProps) {
  const t = useTranslations("pos.cancelInvoice");
  const [reason, setReason] = useState("");
  const { mutate: cancelTxn, isPending } = useCancelTransaction();

  const handleConfirm = () => {
    cancelTxn(
      {
        id: transactionId,
        dto: reason.trim() ? { reason: reason.trim() } : undefined,
      },
      {
        onSuccess: () => {
          setReason("");
          onCancelled();
        },
      },
    );
  };

  const handleClose = () => {
    if (isPending) return;
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-sm"
        title={
          <span className="flex items-center gap-2 text-destructive">
            <WarningOutlined className="h-5 w-5" />
            {t("title")}
          </span>
        }
        footer={
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              {t("backButton")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? t("cancellingButton") : t("confirmButton")}
            </Button>
          </DialogFooter>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("description", { code: invoiceCode })}
          </p>
          <p className="text-sm font-medium text-destructive">{t("warning")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-sm">
              {t("reasonLabel")}
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
              className="resize-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
