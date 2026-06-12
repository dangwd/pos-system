/**
 * PosTopBar — Thanh tiêu đề tích hợp trên cùng màn hình POS
 *
 * Layout (trái → phải):
 *   Left   : ProductSearch (F3) + AI shortcut button
 *   Center : Invoice tab chips inline + [+] new tab
 *   Right  : Store/cashier info · Admin link
 *
 * Quản lý tab được tích hợp trực tiếp (CloseConfirmDialog dùng shadcn Dialog).
 *
 * NOTE: ProductSearch dùng controlled div autocomplete thay Popover.
 * Cài khi cần: `npx shadcn@latest add popover`
 */

"use client";

import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLogout } from "@/hooks/useAuth";
import { useProductsWithStock } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useInvoiceTabStore } from "@/stores/invoice-tab.store";
import type { InvoiceTab } from "@/types/invoice-tab";
import type { ProductWithStock } from "@/types/product";
import type { TransactionType } from "@/types/transaction";
import { Button } from "antd";
import {
  ArrowLeftRight,
  Banknote,
  ChevronDown,
  ChevronRight,
  Coins,
  Copy,
  Gem,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  PauseCircle,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── ProductSearch ────────────────────────────────────────────────────────────

interface ProductSearchProps {
  onSelect: (product: ProductWithStock) => void;
}

function ProductSearch({ onSelect }: ProductSearchProps) {
  const t = useTranslations("pos.topBar");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { user } = useAuthStore();
  const { data: searchResults = [], isFetching } = useProductsWithStock(
    debouncedSearch
      ? { search: debouncedSearch, counterId: user?.counterId ?? undefined }
      : undefined,
  );
  const results = debouncedSearch ? searchResults.slice(0, 8) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // F3 → focus product search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        document.getElementById("pos-product-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (product: ProductWithStock) => {
    onSelect(product);
    setSearch("");
    setDebouncedSearch("");
    setFocusedIndex(-1);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0 w-80 xl:w-96">
      <Input
        id="pos-product-search"
        placeholder={t("searchPlaceholder")}
        className="h-8 text-xs"
        prefix={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
        suffix={isFetching ? <Spinner className="h-3 w-3" /> : null}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setFocusedIndex(-1);
          setOpen(!!e.target.value);
        }}
        onFocus={() => search && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setSearch("");
            setFocusedIndex(-1);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
            if (!open && results.length > 0) setOpen(true);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex((prev) => Math.max(prev - 1, -1));
          }
          if (e.key === "Enter") {
            const target =
              focusedIndex >= 0 ? results[focusedIndex] : results[0];
            if (target) handleSelect(target);
          }
        }}
      />

      {open && (results.length > 0 || (debouncedSearch && !isFetching)) && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
          {results.length > 0 ? (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0",
                  focusedIndex === i && "bg-accent text-accent-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {p.productName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {p.categoryName} · {p.purity ?? "—"} · {p.productCode}
                    {p.stockQuantity === 0 && (
                      <span className="ml-1.5 text-destructive font-semibold">
                        (hết hàng)
                      </span>
                    )}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-5 text-center text-xs text-muted-foreground">
              {t("notFound", { query: search })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InlineTabChip ────────────────────────────────────────────────────────────

interface InlineTabChipProps {
  tab: InvoiceTab;
  isActive: boolean;
  showClose: boolean;
  onSwitch: () => void;
  onClose: () => void;
  onHold: () => void;
  onDuplicate: () => void;
}

function InlineTabChip({
  tab,
  isActive,
  showClose,
  onSwitch,
  onClose,
  onHold,
  onDuplicate,
}: InlineTabChipProps) {
  const t = useTranslations("pos.topBar");
  const tTxn = useTranslations("pos.txnTypes");
  const totalQty = tab.items.reduce((s, i) => s + i.qty, 0);
  const abbr = tTxn(`${tab.txnType}.abbr`);

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={onSwitch}
      className={cn(
        "group relative flex items-center gap-1.5 px-3 h-full cursor-pointer select-none shrink-0",
        "min-w-28 max-w-48 border-r border-primary/10 last:border-r-0",
        "transition-colors duration-150",
        isActive
          ? "bg-background text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-background/60",
      )}
    >
      {/* Indicator bottom — chỉ hiện khi active để "kết nối" với nội dung */}
      {isActive && (
        <motion.div
          layoutId="pos-tab-indicator"
          className="absolute bottom-0 inset-x-0 h-0.5 bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}

      {/* Chấm trạng thái */}
      {tab.status === "holding" && (
        <span
          className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
          title={t("holdingStatus")}
        />
      )}
      {tab.status === "paying" && (
        <span
          className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse"
          title={t("payingStatus")}
        />
      )}

      {/* Type abbr badge — luôn hiển thị rõ */}
      <span
        className={cn(
          "shrink-0 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded",
          isActive
            ? "bg-primary/10 text-primary"
            : "bg-primary/10 text-primary/70",
        )}
      >
        {abbr}
      </span>

      {/* Label */}
      <span
        className={cn(
          "truncate text-xs",
          isActive && "font-medium",
          tab.customerName ? "flex-none" : "flex-1",
        )}
      >
        {tab.label}
      </span>

      {/* Customer chip — khi có khách hàng */}
      {/* {tab.customerName && (
        <span
          className={cn(
            "flex items-center gap-0.5 shrink min-w-0 text-[10px] rounded px-1 py-0.5 truncate",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "bg-muted text-muted-foreground",
          )}
        >
          <User className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate max-w-16">{tab.customerName.split(" ").pop()}</span>
        </span>
      )} */}

      {/* Spacer khi không có customer */}
      {!tab.customerName && <span className="flex-1" />}

      {/* Badge số lượng — solid khi active */}
      {totalQty > 0 && (
        <span
          className={cn(
            "shrink-0 text-[10px] font-bold leading-none rounded px-1.5 py-0.5 tabular-nums",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-primary/15 text-primary/80",
          )}
        >
          {totalQty}
        </span>
      )}

      {/* Actions — hiện khi hover active */}
      {isActive && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHold();
            }}
            className="p-0.5 rounded hover:bg-amber-100 hover:text-amber-600 text-muted-foreground"
            title={t("holdTooltip")}
          >
            <PauseCircle className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
            title={t("duplicateTooltip")}
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Đóng tab */}
      {showClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "shrink-0 p-0.5 rounded transition-all hover:text-destructive hover:bg-destructive/10",
            isActive
              ? "opacity-0 group-hover:opacity-100 text-muted-foreground"
              : "opacity-0 group-hover:opacity-70 text-muted-foreground",
          )}
          title={t("closeTooltip")}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── TxnTypeSelectDialog ──────────────────────────────────────────────────────

const TXN_TYPE_OPTIONS: { type: TransactionType; Icon: React.ElementType }[] = [
  { type: "SellGold", Icon: Coins },
  { type: "SellSilver", Icon: Gem },
  { type: "BuyGold", Icon: PackagePlus },
  { type: "ExchangeGold", Icon: ArrowLeftRight },
  { type: "ExchangeCurrency", Icon: Banknote },
];

interface TxnTypeSelectProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: TransactionType) => void;
}

function TxnTypeSelectDialog({ open, onClose, onSelect }: TxnTypeSelectProps) {
  const t = useTranslations("pos.txnTypes");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("selectTitle")}>
        {TXN_TYPE_OPTIONS.map(({ type, Icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {t(`${type}.label`)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(`${type}.desc`)}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          </button>
        ))}
      </DialogContent>
    </Dialog>
  );
}

// ─── CloseConfirmDialog ───────────────────────────────────────────────────────

interface CloseConfirmProps {
  tab: InvoiceTab | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function CloseConfirmDialog({ tab, onConfirm, onCancel }: CloseConfirmProps) {
  const t = useTranslations("pos.topBar.closeDialog");
  const qty = tab?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  return (
    <Dialog open={!!tab} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-sm"
        title={t("title")}
        footer={
          <>
            <Button onClick={onCancel}>{t("keep")}</Button>
            <Button danger type="primary" onClick={onConfirm}>
              {t("close")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {t("body", { label: tab?.label ?? "", qty })}
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── PosTopBar Root ───────────────────────────────────────────────────────────

export interface PosTopBarProps {
  onAddProduct: (product: ProductWithStock) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PosTopBar({ onAddProduct }: PosTopBarProps) {
  const t = useTranslations("pos.topBar");
  const tAuth = useTranslations("auth.login");
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    tabs,
    activeTabId,
    openTabWithType,
    closeTab,
    switchTab,
    holdTab,
    duplicateTab,
  } = useInvoiceTabStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const [pendingClose, setPendingClose] = useState<InvoiceTab | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  const handleCloseRequest = (tab: InvoiceTab) => {
    if (tab.status === "paying") return;
    if (tab.items.length > 0) setPendingClose(tab);
    else closeTab(tab.id);
  };

  const handleTypeSelect = (type: TransactionType) => {
    openTabWithType(type);
    setTypeDialogOpen(false);
  };

  return (
    <>
      <header className="flex items-stretch h-11 border-b bg-card shrink-0">
        {/* ── Left: Search + AI ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 border-r">
          <ProductSearch onSelect={onAddProduct} />
          <button
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md border bg-muted/50 text-muted-foreground hover:text-primary hover:border-primary hover:bg-background transition-colors"
            title={t("aiTooltip")}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Center: Invoice tabs ────────────────────────────────────────── */}
        <div
          className="flex-1 flex items-stretch overflow-x-auto min-w-0 bg-primary/8"
          role="tablist"
          aria-label={t("tabListLabel")}
        >
          {tabs.map((tab) => (
            <InlineTabChip
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              showClose={tabs.length > 1}
              onSwitch={() => switchTab(tab.id)}
              onClose={() => handleCloseRequest(tab)}
              onHold={() => holdTab(tab.id)}
              onDuplicate={() => duplicateTab(tab.id)}
            />
          ))}

          <button
            onClick={() => setTypeDialogOpen(true)}
            title={t("newTabTooltip")}
            className="shrink-0 my-auto ml-2 h-7 w-7 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Right: Locale + User menu + Admin ──────────────────────────── */}
        <div className="flex items-center gap-2 px-3 border-l">
          <LocaleSwitcher />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden lg:flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-accent transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shrink-0">
                  {getInitials(user.fullName)}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-semibold text-foreground leading-tight max-w-24 truncate">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {user.role}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <div className="px-3 py-2.5 border-b">
                  <p className="text-xs font-semibold truncate">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {user.role}
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={() => router.push("/admin/dashboard")}
                  className="cursor-pointer gap-2 mt-1"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  {t("adminButton")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive cursor-pointer gap-2 mb-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {tAuth("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <TxnTypeSelectDialog
        open={typeDialogOpen}
        onClose={() => setTypeDialogOpen(false)}
        onSelect={handleTypeSelect}
      />

      <CloseConfirmDialog
        tab={pendingClose}
        onConfirm={() => {
          if (pendingClose) closeTab(pendingClose.id);
          setPendingClose(null);
        }}
        onCancel={() => setPendingClose(null)}
      />
    </>
  );
}
