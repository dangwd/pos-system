"use client";

import { createCustomerColumns } from "@/components/admin/columns/customer-columns";
import { CustomerCreateDialog } from "@/components/admin/customers/CustomerCreateDialog";
import { CustomerEditDialog } from "@/components/admin/customers/CustomerEditDialog";
import { DataTable } from "@/components/shared/DataTable";
import { TablePageSkeleton } from "@/components/shared/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerList } from "@/hooks/useCustomers";
import type { CustomerDetail } from "@/types/customer";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export default function CustomersPage() {
  const t = useTranslations("admin.customers");
  const tStatus = useTranslations("admin.users");

  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerDetail | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setFilterSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: customers = [], isLoading } = useCustomerList(
    filterSearch ? { q: filterSearch } : undefined,
  );

  const columns = useMemo(
    () =>
      createCustomerColumns(
        {
          name: t("columns.name"),
          phone: t("columns.phone"),
          email: t("columns.email"),
          loyalty: t("columns.loyalty"),
          points: t("columns.points"),
          status: t("columns.status"),
          openMenu: t("columns.openMenu"),
          viewDetail: t("columns.viewDetail"),
          edit: t("columns.edit"),
          active: tStatus("status.active"),
          inactive: tStatus("status.inactive"),
        },
        (customer) => setEditCustomer(customer as CustomerDetail),
      ),
    [t, tStatus],
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: customers.length })}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t("addButton")}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className=" w-64 text-sm"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className=" w-56 text-sm"
        />
      </div>

      {isLoading ? (
        <TablePageSkeleton />
      ) : (
        <DataTable columns={columns} data={customers} hideSearch />
      )}

      <CustomerCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <CustomerEditDialog
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
      />
    </div>
  );
}
