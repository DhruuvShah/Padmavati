import { Link, useNavigate } from "react-router-dom";
import { Search, Upload, Download, Plus, Weight, Ruler, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductController } from "@/hooks/useProductController";

export default function ProductsPage() {
  const navigate = useNavigate();
  const {
    products: filteredProducts,
    categories,
    loading,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter
  } = useProductController();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage your brass product inventory</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="font-medium liquid-glass border-transparent sm:h-auto sm:px-4 sm:py-2 rounded-3xl">
            <Upload className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="outline" size="sm" className="font-medium liquid-glass border-transparent sm:h-auto sm:px-4 sm:py-2 rounded-3xl">
            <Download className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Link to="/admin/products/new">
            <Button size="sm" className="font-medium sm:h-auto sm:px-4 sm:py-2">
              <Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 liquid-glass shadow-none border-transparent h-10 w-full rounded-3xl"
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="liquid-glass border-transparent rounded-3xl">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-72 bg-muted/20 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
              tabIndex={0}
              role="button"
              aria-label="Edit product"
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/products/${product.id}/edit`) }}
              className="liquid-glass overflow-hidden flex flex-col transition cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] focus-visible:ring-3 focus-visible:ring-ring/50 outline-none rounded-3xl active:scale-[0.98]"
            >
              <div className="relative aspect-square bg-muted/20">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23eee%22/><text x=%2250%22 y=%2250%22 font-family=%22sans-serif%22 font-size=%2214%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%23999%22>No Image</text></svg>'; }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-xs uppercase font-bold tracking-widest opacity-50">No Image</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-[10px] font-semibold px-2 py-1 rounded-full text-foreground shadow-sm">
                  {product.category?.name || "Uncategorized"}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h2 className="font-heading font-semibold text-lg text-card-foreground line-clamp-1 mb-3">{product.name}</h2>
                
                <div className="space-y-1.5 mb-6 mt-auto">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Weight className="h-3.5 w-3.5 mr-2 opacity-70" />
                    {product.weight_kg ? `${product.weight_kg}kg` : "-"}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Ruler className="h-3.5 w-3.5 mr-2 opacity-70" />
                    {(product.height_inches || product.length_inches) ? `H: ${product.height_inches || "-"} × L: ${product.length_inches || "-"}` : "-"}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-semibold text-card-foreground text-sm">
                    {product.direct_rate ? `₹${product.direct_rate}` : (product.rate_code ? `₹${product.rate_code.value}` : "-")}
                    <span className="text-xs font-normal text-muted-foreground">/{product.rate_type === 'per_kg' ? 'kg' : 'pc'}</span>
                  </span>
                  {product.rate_code && (
                    <span className="text-[10px] font-medium uppercase px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {product.rate_code.code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center liquid-glass border-transparent rounded-3xl flex flex-col items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-heading font-semibold text-foreground mb-1">No products found</h2>
              <p className="text-muted-foreground mb-6">Add a product to get started with your catalogue.</p>
              <Button onClick={() => navigate("/admin/products/new")}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
