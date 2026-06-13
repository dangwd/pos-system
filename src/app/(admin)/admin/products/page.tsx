"use client";

import { createProductColumns } from "@/components/admin/columns/product-columns";
import { ProductCreateDialog } from "@/components/admin/products/ProductCreateDialog";
import { ProductEditDialog } from "@/components/admin/products/ProductEditDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useActivateProduct,
  useCategories,
  useDeactivateProduct,
  useProductsPaged,
} from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import { Select, Table } from "antd";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const t = useTranslations("admin.products");

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "deactivate" | "activate";
    product: Product;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categories = [] } = useCategories();
  const { data, isLoading } = useProductsPaged({
    search: filterSearch || undefined,
    categoryCode: filterCategory ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { mutate: deactivate, isPending: deactivating } = useDeactivateProduct();
  const { mutate: activate, isPending: activating } = useActivateProduct();

  const products = data?.data ?? [];

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const opts = { onSuccess: () => setPendingAction(null) };
    if (pendingAction.type === "deactivate") {
      deactivate(pendingAction.product.id, opts);
    } else {
      activate(pendingAction.product.id, opts);
    }
  };

  const columns = useMemo(
    () =>
      createProductColumns(
        {
          product: t("columns.product"),
          productCode: t("columns.productCode"),
          category: t("columns.category"),
          purity: t("columns.purity"),
          productType: t("columns.productType"),
          status: t("columns.status"),
          active: t("columns.active"),
          inactive: t("columns.inactive"),
          openMenu: t("columns.openMenu"),
          edit: t("columns.edit"),
          deactivate: t("columns.deactivate"),
          activate: t("columns.activate"),
          actions: t("columns.actions"),
          productTypes: {
            NguyenKhoi: t("productTypes.NguyenKhoi"),
            CanThucTe: t("productTypes.CanThucTe"),
          },
        },
        (product) => setEditProduct(product),
        (product) => setPendingAction({ type: "deactivate", product }),
        (product) => setPendingAction({ type: "activate", product }),
      ),
    [t],
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: data?.total ?? 0 })}
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

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-56 text-sm"
        />
        <Select
          value={filterCategory || undefined}
          onChange={(v) => { setFilterCategory(v ?? null); setPage(1); }}
          placeholder={t("filterAll")}
          options={categories.map((c) => ({ value: c.code, label: c.name }))}
          showSearch
          allowClear
          filterOption={(input, opt) =>
            ((opt?.label as string) ?? "").toLowerCase().includes(input.toLowerCase())
          }
          notFoundContent="Không tìm thấy"
          className="min-w-44"
          popupMatchSelectWidth={false}
        />
      </div>

      <div className="rounded-lg border bg-background shadow-sm">
        <Table<Product>
          columns={columns}
          dataSource={products}
          rowKey="id"
          size="small"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total, range) =>
              `Hiển thị ${range[0]}–${range[1]} / ${total}`,
            className: "px-4",
          }}
        />
      </div>

      <ProductCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ProductEditDialog
        product={editProduct}
        onClose={() => setEditProduct(null)}
      />

      <ConfirmDialog
        open={!!pendingAction}
        title={
          pendingAction?.type === "activate"
            ? t("confirm.activateTitle")
            : t("confirm.deactivateTitle")
        }
        description={
          pendingAction?.type === "activate"
            ? t("confirm.activateDesc", {
                name: pendingAction.product.productName,
              })
            : pendingAction
              ? t("confirm.deactivateDesc", {
                  name: pendingAction.product.productName,
                })
              : undefined
        }
        confirmText={
          pendingAction?.type === "activate"
            ? t("columns.activate")
            : t("columns.deactivate")
        }
        cancelText={t("confirm.cancel")}
        variant={pendingAction?.type === "activate" ? "default" : "destructive"}
        loading={deactivating || activating}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
