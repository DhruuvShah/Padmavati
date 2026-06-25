"use client";

import { Package, FolderOpen, Files, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useDashboardController } from "@/hooks/useDashboardController";

export default function DashboardPage() {
  const { counts, recentProducts, isLoading } = useDashboardController();

  const kpis = [
    {
      title: "Products",
      value: counts.products.toString(),
      icon: Package,
      bgColor: "bg-primary/20",
      textColor: "text-primary",
    },
    {
      title: "Categories",
      value: counts.categories.toString(),
      icon: FolderOpen,
      bgColor: "bg-primary/20 relative",
      textColor: "text-primary",
    },
    {
      title: "Catalogues",
      value: counts.catalogues.toString(),
      icon: Files,
      bgColor: "bg-primary/20",
      textColor: "text-primary",
    },
    {
      title: "Pending Shares",
      value: counts.pendingShares.toString(),
      icon: Users,
      bgColor: "bg-destructive/20",
      textColor: "text-destructive",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Overview of your brass product catalogue
          </p>
        </div>
        <Link href="/admin/products" className="w-full sm:w-auto">
          <Button className="font-medium px-6 w-full sm:w-auto">
            <Package className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="liquid-glass p-6 flex flex-col sm:flex-row items-center gap-4 rounded-3xl"
          >
            <div
              className={`h-12 w-12 rounded-3xl flex items-center justify-center shrink-0 ${kpi.bgColor} ${kpi.textColor}`}
            >
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground leading-none mb-1">
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {kpi.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="liquid-glass p-6 sm:p-8 h-full rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-card-foreground">
                Recent Products
              </h2>
              <Link
                href="/admin/products"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-2">
              {recentProducts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center liquid-glass rounded-3xl border mt-4">
                  No products found. Start by adding a product.
                </div>
              ) : (
                recentProducts.map((prod, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 py-4 px-3 -mx-2 rounded-3xl hover:bg-white/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-3xl bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-card-foreground truncate">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                          {prod.category?.name || "Uncategorized"}
                        </p>
                      </div>
                    </div>
                    <div className="font-semibold text-card-foreground text-sm shrink-0 whitespace-nowrap">
                      {prod.direct_rate != null || prod.rate_code ? (
                        <>
                          ₹{prod.direct_rate ?? prod.rate_code?.value}
                          <span className="text-xs font-normal text-muted-foreground">
                            /{prod.rate_type === "per_kg" ? "kg" : "pc"}
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="liquid-glass p-6 sm:p-8 h-full rounded-3xl">
            <h2 className="text-xl font-heading font-bold text-card-foreground mb-6">
              Quick Actions
            </h2>
            <div className="space-y-4">
              <Link
                href="/admin/products"
                className="flex items-center gap-4 p-6 liquid-glass hover:-translate-y-1 transition cursor-pointer group rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 outline-none active:scale-[0.98]"
              >
                <div className="h-10 w-10 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">
                    Add New Product
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create a new brass product entry
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center gap-4 p-6 liquid-glass hover:-translate-y-1 transition cursor-pointer group rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 outline-none active:scale-[0.98]"
              >
                <div className="h-10 w-10 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">
                    Manage Categories
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add or edit product categories
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/create-catalogue"
                className="flex items-center gap-4 p-6 liquid-glass hover:-translate-y-1 transition cursor-pointer group rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 outline-none active:scale-[0.98]"
              >
                <div className="h-10 w-10 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Files className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">
                    Create Catalogue
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate a new PDF catalogue
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
