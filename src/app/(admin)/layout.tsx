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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Boxes,
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
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function getInitials(name: string) {
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
        ],
      },
      {
        label: t("nav.groupCatalog"),
        items: [
          { href: "/admin/products", label: t("nav.products"), icon: Package },
          { href: "/admin/customers", label: t("nav.customers"), icon: Users },
          { href: "/admin/inventory", label: t("nav.inventory"), icon: Boxes },
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
          "relative flex flex-col border-r bg-muted/20 shrink-0 transition-[width] duration-200 overflow-hidden",
          collapsed ? "w-14" : "w-60",
        )}
      >
        {/* Sidebar header */}
        <div
          className={cn(
            "flex items-center h-14 border-b shrink-0 gap-1",
            collapsed ? "px-2 justify-center" : "px-2",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-2">
              <Monitor className="h-5 w-5 text-primary shrink-0" />
              <span className="font-bold text-sm truncate">{t("title")}</span>
            </div>
          )}
          {collapsed && <Monitor className="h-5 w-5 text-primary" />}
          <button
            onClick={handleToggle}
            title={collapsed ? t("expand") : t("collapse")}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0",
              collapsed && "mt-0",
            )}
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Search — only when expanded */}
        {!collapsed && (
          <div className="px-2 pt-3 pb-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-2">
          {filteredGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && !collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      pathname === href || pathname.startsWith(href + "/")
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {!collapsed && filteredGroups.length === 0 && (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">
              {t("noResults")}
            </p>
          )}
        </nav>

        {/* Gradient accent */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-linear-to-t from-primary/15 to-transparent" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-2 w-2 rounded-full bg-primary/50" />
        <div className="pointer-events-none absolute bottom-8 right-8 h-1.5 w-1.5 rounded-full bg-primary/30" />
        <div className="pointer-events-none absolute bottom-6 right-10 h-1 w-1 rounded-full bg-primary/20" />
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

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
