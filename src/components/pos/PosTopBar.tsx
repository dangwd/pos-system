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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useInvoiceTabStore } from "@/stores/invoice-tab.store";
import type { InvoiceTab } from "@/types/invoice-tab";
import type { Product } from "@/types/product";
import type { TransactionType } from "@/types/transaction";
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
  onSelect: (product: Product) => void;
}

function ProductSearch({ onSelect }: ProductSearchProps) {
  const t = useTranslations("pos.topBar");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: searchResults = [], isFetching } = useProducts(
    debouncedSearch ? { search: debouncedSearch } : undefined,
  );
  const results = debouncedSearch ? searchResults.slice(0, 8) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setSearch("");
    setDebouncedSearch("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0 w-80 xl:w-96">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id="pos-product-search"
          placeholder={t("searchPlaceholder")}
          className="pl-8 pr-8 h-8 text-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(!!e.target.value);
          }}
          onFocus={() => search && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setSearch("");
            }
            if (e.key === "Enter" && results[0]) handleSelect(results[0]);
          }}
        />
        {isFetching && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Spinner className="h-3 w-3" />
          </div>
        )}
      </div>

      {open && (results.length > 0 || (debouncedSearch && !isFetching)) && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
          {results.length > 0 ? (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {p.productName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {p.category.name} · {p.purity} · {p.productCode}
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
        "group relative flex items-center gap-2 px-3.5 h-full cursor-pointer select-none shrink-0",
        "min-w-24 max-w-44 border-r border-border/40 last:border-r-0",
        "transition-colors duration-150",
        isActive
          ? "bg-background text-foreground font-medium"
          : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50",
      )}
    >
      {/* Indicator trượt bottom — layoutId animate khi chuyển tab */}
      <motion.div
        layoutId="pos-tab-indicator"
        className={cn(
          "absolute bottom-0 inset-x-0 h-0.5 transition-colors",
          isActive ? "bg-primary" : "bg-transparent",
        )}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
      />

      {/* Chấm trạng thái */}
      {tab.status === "holding" && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
          title={t("holdingStatus")}
        />
      )}
      {tab.status === "paying" && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse"
          title={t("payingStatus")}
        />
      )}

      {/* Label */}
      <span className="truncate flex-1 text-xs">{tab.label}</span>

      {/* Type abbr badge */}
      <span
        className={cn(
          "shrink-0 text-[9px] font-semibold leading-none px-1 py-0.5 rounded-sm",
          isActive
            ? "bg-primary/8 text-primary/70"
            : "text-muted-foreground/40",
        )}
      >
        {abbr}
      </span>

      {/* Badge số lượng */}
      {totalQty > 0 && (
        <span
          className={cn(
            "shrink-0 text-[10px] font-semibold leading-none rounded-sm px-1.5 py-0.5 tabular-nums",
            isActive
              ? "bg-primary/12 text-primary"
              : "bg-muted text-muted-foreground/70",
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
            className="p-0.5 rounded hover:bg-amber-50 hover:text-amber-500 text-muted-foreground/60"
            title={t("holdTooltip")}
          >
            <PauseCircle className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground/60"
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
            "shrink-0 p-0.5 rounded transition-all text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8",
            isActive
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-0 group-hover:opacity-60",
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
      <DialogContent className="sm:max-w-xs min-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold">
            {t("selectTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="p-1.5">
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
        </div>
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("body", { label: tab?.label ?? "", qty })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("keep")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PosTopBar Root ───────────────────────────────────────────────────────────

export interface PosTopBarProps {
  onAddProduct: (product: Product) => void;
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
          className="flex-1 flex items-stretch overflow-x-auto min-w-0 bg-muted/40"
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
