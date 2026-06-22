"use client";

import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  BarChartOutlined,
  ColumnWidthOutlined,
  DashboardOutlined,
  DownOutlined,
  ExportOutlined,
  GoldOutlined,
  ImportOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoneyCollectOutlined,
  OrderedListOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SwapOutlined,
  // ScheduleOutlined,
  TagOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function getInitials(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type NavChild = { href: string; label: string };
type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  children?: NavChild[];
};
type NavGroup = { label: string | null; items: NavItem[] };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.layout");
  const tAuth = useTranslations("auth.login");
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<number>>(
    () => new Set([0, 1, 2, 3, 4, 5]),
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(),
  );

  const NAV_GROUPS = useMemo<NavGroup[]>(
    () => [
      {
        label: null as string | null,
        items: [
          {
            href: "/admin/dashboard",
            label: t("nav.dashboard"),
            icon: DashboardOutlined,
          },
          {
            href: "/admin/orders",
            label: t("nav.transactionLog"),
            icon: OrderedListOutlined,
            children: [
              { href: "/admin/orders/SellGold", label: t("nav.orderSellGold") },
              {
                href: "/admin/orders/SellSilver",
                label: t("nav.orderSellSilver"),
              },
              { href: "/admin/orders/BuyGold", label: t("nav.orderBuyGold") },
              {
                href: "/admin/orders/ExchangeGold",
                label: t("nav.orderExchangeGold"),
              },
              {
                href: "/admin/orders/ExchangeCurrency",
                label: t("nav.orderExchangeCurrency"),
              },
            ],
          },
        ],
      },
      {
        label: t("nav.groupSystem"),
        items: [
          {
            href: "/admin/users",
            label: t("nav.users"),
            icon: UserSwitchOutlined,
          },
          {
            href: "/admin/roles",
            label: t("nav.roles"),
            icon: SafetyCertificateOutlined,
          },
          {
            href: "/admin/branches",
            label: t("nav.branches"),
            icon: BankOutlined,
          },
          // { href: "/admin/audit-logs", label: t("nav.auditLogs"), icon: AuditOutlined },
        ],
      },
      {
        label: t("nav.groupCatalog"),
        items: [
          {
            href: "/admin/products",
            label: t("nav.products"),
            icon: AppstoreOutlined,
          },
          {
            href: "/admin/customers",
            label: t("nav.customers"),
            icon: TeamOutlined,
          },
        ],
      },
      {
        label: t("nav.groupWarehouse"),
        items: [
          {
            href: "/admin/inventory/stock-in",
            label: t("nav.stockIn"),
            icon: ImportOutlined,
          },
          {
            href: "/admin/inventory/stock-out",
            label: t("nav.stockOut"),
            icon: ExportOutlined,
          },
        ],
      },
      {
        label: t("nav.groupFinance"),
        items: [
          // { href: "/admin/sales-shifts", label: t("nav.salesShifts"), icon: ScheduleOutlined },
          {
            href: "/admin/cash-ledger",
            label: t("nav.cashLedger"),
            icon: WalletOutlined,
          },
          {
            href: "/admin/reports",
            label: t("nav.reports"),
            icon: BarChartOutlined,
            children: [
              {
                href: "/admin/reports/inventory",
                label: t("nav.reportInventory"),
              },
              { href: "/admin/reports/revenue", label: t("nav.reportRevenue") },
              {
                href: "/admin/reports/currency-exchange",
                label: t("nav.reportCurrencyExchange"),
              },
            ],
          },
        ],
      },
      {
        label: t("nav.groupConfig"),
        items: [
          {
            href: "/admin/config/prices",
            label: t("nav.prices"),
            icon: TagOutlined,
          },
          {
            href: "/admin/config/exchange-rates",
            label: t("nav.exchangeRates"),
            icon: SwapOutlined,
          },
          // {
          //   href: "/admin/config/stone-prices",
          //   label: t("nav.stonePrices"),
          //   icon: CrownOutlined,
          // },
          {
            href: "/admin/config/weight-units",
            label: t("nav.weightUnits"),
            icon: ColumnWidthOutlined,
          },
          {
            href: "/admin/config/gold-purities",
            label: t("nav.goldPurities"),
            icon: GoldOutlined,
          },
          {
            href: "/admin/config/currencies",
            label: t("nav.currencies"),
            icon: MoneyCollectOutlined,
          },
        ],
      },
    ],
    [t],
  );

  // Tự mở mục cha khi điều hướng vào một mục con của nó (vẫn cho phép đóng tay).
  useEffect(() => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const g of NAV_GROUPS) {
        for (const it of g.items) {
          const inSection = it.children?.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
          );
          if (inSection && !next.has(it.href)) {
            next.add(it.href);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, NAV_GROUPS]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return NAV_GROUPS;
    const q = search.toLowerCase();
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [search, NAV_GROUPS]);

  const handleToggle = () => {
    setCollapsed((c) => !c);
    setSearch("");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "relative flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 transition-[width] duration-200 overflow-hidden",
          collapsed ? "w-14" : "w-64",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-sidebar-border shrink-0 px-3",
            collapsed ? "justify-center gap-0" : "gap-2.5",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/logo_v%C3%A0ng-removebg-preview.png"
            alt="Phouvong Jewelry"
            className={cn(
              "shrink-0 object-contain transition-all duration-200",
              collapsed ? "h-8 w-8" : "h-10 w-10",
            )}
          />
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold text-[13.5px] text-sidebar-foreground leading-snug truncate">
                ຮ້ານຄຳພູວົງ
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 leading-snug truncate tracking-wide">
                Phouvong Jewelry
              </span>
            </div>
          )}
          <button
            onClick={handleToggle}
            title={collapsed ? t("expand") : t("collapse")}
            className="h-7 w-7 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          >
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: "14px" }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: "14px" }} />
            )}
          </button>
        </div>

        {/* Search — only when expanded */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-sidebar-border">
            <div className="relative">
              <SearchOutlined
                style={{ fontSize: "13px" }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/50 pointer-events-none"
              />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 rounded-md border pl-8 pr-3 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-1 focus:ring-sidebar-primary/40 focus:border-sidebar-primary/40 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1">
          {filteredGroups.map((group, gi) => {
            const isOpen = openGroups.has(gi);
            const hasLabel = !!group.label;
            const toggleGroup = () => {
              if (!hasLabel) return;
              setOpenGroups((prev) => {
                const next = new Set(prev);
                if (next.has(gi)) {
                  next.delete(gi);
                } else {
                  next.add(gi);
                }
                return next;
              });
            };

            return (
              <div key={gi}>
                {hasLabel && !collapsed && (
                  <button
                    onClick={toggleGroup}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
                  >
                    <span>{group.label}</span>
                    <DownOutlined
                      style={{ fontSize: "11px" }}
                      className={cn(
                        "transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                )}

                <AnimatePresence initial={false}>
                  {(!hasLabel || isOpen || collapsed) && (
                    <motion.div
                      key="items"
                      initial={hasLabel ? { height: 0, opacity: 0 } : false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pt-0.5">
                        {group.items.map(
                          ({ href, label, icon: Icon, children }) => {
                            // ── Mục cha có submenu: chỉ toggle đóng/mở, KHÔNG điều hướng ──
                            if (children && children.length) {
                              const childActive = children.some(
                                (c) =>
                                  pathname === c.href ||
                                  pathname.startsWith(c.href + "/"),
                              );
                              const open = expandedItems.has(href);
                              return (
                                <div key={href}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedItems((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(href)) next.delete(href);
                                        else next.add(href);
                                        return next;
                                      })
                                    }
                                    title={collapsed ? label : undefined}
                                    className={cn(
                                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                                      collapsed && "justify-center px-2",
                                      childActive
                                        ? "text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    )}
                                  >
                                    <Icon
                                      style={{ fontSize: "14px" }}
                                      className="shrink-0"
                                    />
                                    {!collapsed && (
                                      <span className="flex-1 text-left">
                                        {label}
                                      </span>
                                    )}
                                    {!collapsed && (
                                      <DownOutlined
                                        style={{ fontSize: "11px" }}
                                        className={cn(
                                          "shrink-0 transition-transform duration-200",
                                          open && "rotate-180",
                                        )}
                                      />
                                    )}
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {open && !collapsed && (
                                      <motion.div
                                        key="subitems"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                          duration: 0.2,
                                          ease: "easeInOut",
                                        }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mt-0.5 ml-[1.35rem] pl-3 border-l border-sidebar-border space-y-0.5">
                                          {children.map((c) => {
                                            const cActive =
                                              pathname === c.href ||
                                              pathname.startsWith(c.href + "/");
                                            return (
                                              <Link
                                                key={c.href}
                                                href={c.href}
                                                className={cn(
                                                  "relative flex items-center px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                                                  cActive
                                                    ? "text-sidebar-primary-foreground"
                                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                )}
                                              >
                                                {cActive && (
                                                  <motion.div
                                                    layoutId="nav-highlight"
                                                    className="absolute inset-0 rounded-md bg-sidebar-primary pointer-events-none"
                                                    transition={{
                                                      type: "spring",
                                                      stiffness: 380,
                                                      damping: 32,
                                                    }}
                                                  />
                                                )}
                                                <span className="relative">
                                                  {c.label}
                                                </span>
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            }

                            // ── Mục thường: link điều hướng ──
                            const isActive =
                              pathname === href ||
                              pathname.startsWith(href + "/");
                            return (
                              <Link
                                key={href}
                                href={href}
                                title={collapsed ? label : undefined}
                                className={cn(
                                  "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                                  collapsed && "justify-center px-2",
                                  isActive
                                    ? "text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                )}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="nav-highlight"
                                    className="absolute inset-0 rounded-md bg-sidebar-primary pointer-events-none"
                                    transition={{
                                      type: "spring",
                                      stiffness: 380,
                                      damping: 32,
                                    }}
                                  />
                                )}
                                <Icon
                                  style={{ fontSize: "14px" }}
                                  className="relative shrink-0"
                                />
                                {!collapsed && (
                                  <span className="relative">{label}</span>
                                )}
                              </Link>
                            );
                          },
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {!collapsed && filteredGroups.length === 0 && (
            <p className="px-3 py-6 text-xs text-sidebar-foreground/50 text-center">
              {t("noResults")}
            </p>
          )}
        </nav>
      </aside>

      {/* ── Right column: topbar + content ───────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-6 border-b bg-card shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pos")}
              className="gap-1.5 text-xs h-8"
            >
              <ArrowLeftOutlined style={{ fontSize: "13px" }} />
              {t("nav.backToPOS")}
            </Button>
            <LocaleSwitcher />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-md hover:bg-accent transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
                    {getInitials(user.fullName)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-foreground leading-tight max-w-36 truncate">
                      {user.fullName}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">
                      {user.role}
                    </span>
                  </div>
                  <DownOutlined
                    style={{ fontSize: "11px" }}
                    className="text-muted-foreground ml-0.5"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <div className="px-3 py-2.5 border-b">
                    <p className="text-sm font-semibold truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                    className="text-destructive focus:text-destructive cursor-pointer gap-2 mb-1"
                  >
                    <LogoutOutlined style={{ fontSize: "13px" }} />
                    {tAuth("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
