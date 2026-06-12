"use client";

import { useMemo, useState } from "react";
import { useLogout } from "@/hooks/useAuth";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  Gem,
  LayoutDashboard,
  LogOut,
  Monitor,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PageTransition } from "@/components/shared/PageTransition";

function getInitials(name: string | undefined | null) {
  if (!name) return '?'
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
  const [openGroups, setOpenGroups] = useState<Set<number>>(() => new Set([0, 1, 2, 3, 4, 5]));

  const NAV_GROUPS = useMemo(
    () => [
      {
        label: null as string | null,
        items: [
          { href: "/admin/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
          { href: "/admin/orders", label: t("nav.orders"), icon: ClipboardList },
        ],
      },
      {
        label: t("nav.groupSystem"),
        items: [
          { href: "/admin/users", label: t("nav.users"), icon: UserCog },
          { href: "/admin/roles", label: t("nav.roles"), icon: ShieldCheck },
          { href: "/admin/branches", label: t("nav.branches"), icon: Building2 },
        ],
      },
      {
        label: t("nav.groupCatalog"),
        items: [
          { href: "/admin/products", label: t("nav.products"), icon: Package },
          { href: "/admin/customers", label: t("nav.customers"), icon: Users },
        ],
      },
      {
        label: t("nav.groupWarehouse"),
        items: [
          { href: "/admin/inventory", label: t("nav.inventory"), icon: Boxes },
          { href: "/admin/stock-in", label: t("nav.stockIn"), icon: ArrowDownToLine },
          { href: "/admin/stock-out", label: t("nav.stockOut"), icon: ArrowUpFromLine },
        ],
      },
      {
        label: t("nav.groupFinance"),
        items: [
          { href: "/admin/trade", label: t("nav.trade"), icon: ArrowLeftRight },
          { href: "/admin/cash-ledger", label: t("nav.cashLedger"), icon: Wallet },
          { href: "/admin/reports", label: t("nav.reports"), icon: BarChart3 },
        ],
      },
      {
        label: t("nav.groupConfig"),
        items: [
          { href: "/admin/config/prices", label: t("nav.prices"), icon: Tag },
          { href: "/admin/config/exchange-rates", label: t("nav.exchangeRates"), icon: RefreshCw },
          { href: "/admin/config/stone-prices", label: t("nav.stonePrices"), icon: Gem },
          { href: "/admin/config/weight-units", label: t("nav.weightUnits"), icon: Scale },
          { href: "/admin/config/gold-purities", label: t("nav.goldPurities"), icon: Sparkles },
        ],
      },
    ],
    [t],
  );

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return NAV_GROUPS;
    const q = search.toLowerCase();
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(q),
      ),
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
            "flex items-center h-14 border-b border-sidebar-border shrink-0 gap-1.5 px-3",
            collapsed && "justify-center",
          )}
        >
          <div className={cn(
            "h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0",
            !collapsed && "ml-0.5",
          )}>
            <Monitor className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-white truncate flex-1 min-w-0">
              {t("title")}
            </span>
          )}
          <button
            onClick={handleToggle}
            title={collapsed ? t("expand") : t("collapse")}
            className="h-7 w-7 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Search — only when expanded */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/50 pointer-events-none" />
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
                if (next.has(gi)) { next.delete(gi) } else { next.add(gi) }
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
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
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
                        {group.items.map(({ href, label, icon: Icon }) => {
                          const isActive = pathname === href || pathname.startsWith(href + "/");
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
                                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                />
                              )}
                              <Icon className="relative h-4 w-4 shrink-0" />
                              {!collapsed && <span className="relative">{label}</span>}
                            </Link>
                          );
                        })}
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
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <div className="px-3 py-2.5 border-b">
                    <p className="text-sm font-semibold truncate">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => router.push("/pos")}
                    className="cursor-pointer gap-2 mt-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("nav.backToPOS")}
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

        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
