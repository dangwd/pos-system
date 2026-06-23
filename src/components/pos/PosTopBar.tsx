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
import { useActiveTab } from "@/hooks/useActiveTab";
import { useLogout } from "@/hooks/useAuth";
import { useProductsWithStock } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useInvoiceTabStore } from "@/stores/invoice-tab.store";
import type { InvoiceTab } from "@/types/invoice-tab";
import type { ProductWithStock } from "@/types/product";
import type { TransactionType } from "@/types/transaction";
import {
  BankOutlined,
  CloseOutlined,
  DashboardOutlined,
  DownOutlined,
  GoldOutlined,
  LeftOutlined,
  LogoutOutlined,
  MoneyCollectOutlined,
  PlusOutlined,
  PlusSquareOutlined,
  RightOutlined,
  SearchOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
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

  const { tab } = useActiveTab();
  const txnType = tab?.txnType ?? "SellGold";
  const stockCheckEnabled =
    txnType === "SellGold" ||
    txnType === "SellSilver" ||
    txnType === "ExchangeGold";

  const categoryCode =
    txnType === "SellSilver" || txnType === "BuySilver"
      ? "Silver"
      : txnType === "ExchangeCurrency"
        ? undefined
        : "Gold";

  const { user } = useAuthStore();
  const { data: searchResults = [], isFetching } = useProductsWithStock(
    debouncedSearch
      ? {
          search: debouncedSearch,
          counterId: user?.counterId ?? undefined,
          categoryCode,
        }
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
        prefix={
          <SearchOutlined className="h-3.5 w-3.5 text-muted-foreground" />
        }
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
            if (target && !(stockCheckEnabled && target.stockQuantity === 0))
              handleSelect(target);
          }
        }}
      />

      {open && (results.length > 0 || (debouncedSearch && !isFetching)) && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
          {results.length > 0 ? (
            results.map((p, i) => {
              const outOfStock = stockCheckEnabled && p.stockQuantity === 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => !outOfStock && handleSelect(p)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b last:border-0",
                    outOfStock
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent hover:text-accent-foreground",
                    !outOfStock &&
                      focusedIndex === i &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {p.productName}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {p.categoryName} · {p.purity ?? "—"} · {p.productCode}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "ml-3 shrink-0 text-[10px] font-semibold font-mono",
                      p.stockQuantity === 0
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {p.stockQuantity === 0
                      ? t("outOfStock")
                      : t("stockCount", { qty: p.stockQuantity })}
                  </span>
                </button>
              );
            })
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

const TXN_TYPE_ICONS: Partial<Record<string, React.ElementType>> = {
  SellGold: MoneyCollectOutlined,
  SellSilver: GoldOutlined,
  BuyGold: PlusSquareOutlined,
  BuySilver: PlusSquareOutlined,
  ExchangeGold: SwapOutlined,
  ExchangeCurrency: BankOutlined,
};

interface InlineTabChipProps {
  tab: InvoiceTab;
  isActive: boolean;
  showClose: boolean;
  onSwitch: () => void;
  onClose: () => void;
}

function InlineTabChip({
  tab,
  isActive,
  showClose,
  onSwitch,
  onClose,
}: InlineTabChipProps) {
  const t = useTranslations("pos.txnTypes");
  const totalQty = tab.items.reduce((s, i) => s + i.qty, 0);
  const TabIcon = TXN_TYPE_ICONS[tab.txnType] ?? MoneyCollectOutlined;
  const txnLabel = t(`${tab.txnType}.label`);

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={onSwitch}
      className={cn(
        "group relative flex flex-col justify-center px-3 cursor-pointer select-none shrink-0",
        "min-w-44 max-w-60 transition-all duration-100 rounded-t-lg",
        isActive
          ? "z-10 bg-background text-foreground h-[calc(100%-2px)]"
          : "h-[calc(100%-6px)] hover:bg-white/10",
      )}
    >
      {/* Hàng 1: tên nghiệp vụ + nút đóng */}
      <div className="flex items-center gap-1.5">
        <TabIcon
          className={cn(
            "h-3 w-3 shrink-0",
            isActive ? "text-primary" : "text-white/55",
          )}
        />
        <span
          className={cn(
            "truncate text-[10px] font-medium flex-1 leading-none tracking-wide",
            isActive ? "text-primary" : "text-white/55",
          )}
        >
          {txnLabel}
        </span>
        {showClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "shrink-0 h-4 w-4 flex items-center justify-center rounded-sm transition-all opacity-0 group-hover:opacity-100",
              isActive
                ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : "text-white/70 hover:bg-white/15",
            )}
          >
            <CloseOutlined className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Hàng 2: label hoá đơn + badge số lượng */}
      <div className="flex items-center gap-2 mt-1">
        {tab.status === "paying" && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0 animate-pulse" />
        )}
        <span
          className={cn(
            "truncate text-[13px] font-semibold flex-1 leading-none",
            isActive ? "text-foreground" : "text-white/90",
          )}
        >
          {tab.label}
        </span>
        {totalQty > 0 && (
          <span
            className={cn(
              "shrink-0 min-w-5 px-1.5 h-4 rounded-full text-[10px] font-bold tabular-nums leading-none flex items-center justify-center",
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-white/15 text-white/80",
            )}
          >
            {totalQty}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── TxnTypeSelectDialog ──────────────────────────────────────────────────────

const TXN_TYPE_OPTIONS: { type: TransactionType; Icon: React.ElementType }[] = [
  { type: "SellGold", Icon: MoneyCollectOutlined },
  { type: "SellSilver", Icon: GoldOutlined },
  { type: "BuyGold", Icon: PlusSquareOutlined },
  { type: "BuySilver", Icon: PlusSquareOutlined },
  { type: "ExchangeGold", Icon: SwapOutlined },
  { type: "ExchangeCurrency", Icon: BankOutlined },
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
            <RightOutlined className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
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
  const { tabs, activeTabId, openTabWithType, closeTab, switchTab } =
    useInvoiceTabStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const [pendingClose, setPendingClose] = useState<InvoiceTab | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = tabsScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  // Cuộn tab đang active vào vùng nhìn thấy
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector(
      '[aria-selected="true"]',
    ) as HTMLElement | null;
    activeEl?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeTabId]);

  const scrollTabs = (dir: "left" | "right") => {
    tabsScrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

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
      <header className="flex items-stretch h-12 bg-primary shrink-0">
        {/* ── Left: Logo + Search + AI ───────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/logo_v%C3%A0ng-removebg-preview.png"
            alt="Phouvong"
            className="h-7 w-7 object-contain shrink-0"
          />
          <ProductSearch onSelect={onAddProduct} />
        </div>

        {/* ── Center: Invoice tabs (scrollable, hidden scrollbar) ─────── */}
        <div className="flex-1 h-full flex items-end min-w-0 relative">
          {/* Nút cuộn trái */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs("left")}
              className="absolute left-0 bottom-0 z-20 h-full px-1 flex items-center bg-linear-to-r from-primary via-primary/90 to-transparent text-white/60 hover:text-white transition-colors"
            >
              <LeftOutlined className="h-3.5 w-3.5" />
            </button>
          )}

          <div
            ref={tabsScrollRef}
            onScroll={checkScroll}
            className="h-full flex items-end pl-3.5 pr-3 gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
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
              />
            ))}

            <button
              onClick={() => setTypeDialogOpen(true)}
              title={t("newTabTooltip")}
              className="shrink-0 self-center ml-1 h-6 w-6 flex items-center justify-center rounded-full border border-dashed border-white/35 text-white/45 hover:border-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <PlusOutlined className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nút cuộn phải */}
          {canScrollRight && (
            <button
              onClick={() => scrollTabs("right")}
              className="absolute right-0 bottom-0 z-20 h-full px-1 flex items-center bg-linear-to-l from-primary via-primary/90 to-transparent text-white/60 hover:text-white transition-colors"
            >
              <RightOutlined className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Right: Locale + User menu ───────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3">
          {/* <ShiftStatusBadge /> */}
          <LocaleSwitcher />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden lg:flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-white/10 transition-colors focus:outline-none">
                <div className="h-5 w-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  {getInitials(user.fullName)}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-semibold text-white leading-tight max-w-24 truncate">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-white/60 leading-tight truncate max-w-24">
                    {user.counterName ?? user.role}
                  </span>
                </div>
                <DownOutlined className="h-3 w-3 text-white/60 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <div className="px-3 py-2.5 border-b">
                  <p className="text-xs font-semibold truncate">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {user.role}
                  </p>
                  {user.branchName && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {user.branchName}
                      {user.counterName && ` · ${user.counterName}`}
                    </p>
                  )}
                </div>
                <DropdownMenuItem
                  onClick={() => router.push("/admin/dashboard")}
                  className="cursor-pointer gap-2 mt-1"
                >
                  <DashboardOutlined className="h-3.5 w-3.5" />
                  {t("adminButton")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive cursor-pointer gap-2 mb-1"
                >
                  <LogoutOutlined className="h-3.5 w-3.5" />
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
