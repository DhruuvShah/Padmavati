"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Download, Weight, Ruler, Files, Search, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getProductPrice, getProductWeightGrams, computeRangeCeiling } from "@/lib/pricing";

const DEFAULT_MAX_PRICE = 100000;
const DEFAULT_MAX_WEIGHT_G = 10000;

interface CatalogueProduct {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  weight_kg: number | string | null;
  height_inches: string | null;
  length_inches: string | null;
  rate_type: "per_kg" | "per_piece";
  direct_rate: number | string | null;
  category_id: string | null;
  // Postgrest returns a single object for a to-one relation; supabase-js's
  // inferred type widens this to an array when no generated types are used,
  // so we assert the real shape explicitly via `.returns<>()` below.
  category: { name: string } | null;
  rate_code: { code: string; value: number | string } | null;
}

export default function CreateCataloguePage() {
  const router = useRouter();
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX_PRICE);
  const [maxWeight, setMaxWeight] = useState(DEFAULT_MAX_WEIGHT_G);
  const [priceRange, setPriceRange] = useState([0, DEFAULT_MAX_PRICE]);
  const [weightRange, setWeightRange] = useState([0, DEFAULT_MAX_WEIGHT_G]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from('products').select(`
          id, name, sku, image_url, weight_kg, height_inches, length_inches,
          rate_type, direct_rate, category_id,
          category:categories(name),
          rate_code:rate_codes(code, value)
        `).returns<CatalogueProduct[]>(),
        supabase.from('categories').select('id, name')
      ]);

      if (pRes.error) toast.error("Failed to load products: " + pRes.error.message);
      else if (pRes.data) {
        setProducts(pRes.data);
        // Size the filter sliders to the actual data so real products are never
        // silently hidden by a default range that's smaller than their values.
        if (pRes.data.length > 0) {
          const computedMaxPrice = computeRangeCeiling(pRes.data.map(getProductPrice), DEFAULT_MAX_PRICE);
          const computedMaxWeight = computeRangeCeiling(pRes.data.map(getProductWeightGrams), DEFAULT_MAX_WEIGHT_G);
          setMaxPrice(computedMaxPrice);
          setMaxWeight(computedMaxWeight);
          setPriceRange([0, computedMaxPrice]);
          setWeightRange([0, computedMaxWeight]);
        }
      }
      if (cRes.data) setCategories(cRes.data);
    } catch (err: any) {
      toast.error("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => {
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
    const price = getProductPrice(p);
    if (price < priceRange[0] || price > priceRange[1]) return false;
    const weightG = getProductWeightGrams(p);
    if (weightG < weightRange[0] || weightG > weightRange[1]) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const newSet = new Set(selectedIds);
    filteredProducts.forEach(p => newSet.add(p.id));
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const generatePDF = async () => {
    if (!title.trim() || selectedIds.size === 0) return;

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/generate-catalogue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: title.trim(), productIds: Array.from(selectedIds) })
      });

      if (!response.ok) throw new Error(await response.text());

      router.push('/admin/catalogues');
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">Create Catalogue</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Select products and generate a PDF catalogue</p>
        </div>
      </div>

      {/* Three control boxes in a horizontal row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Box 1: Filters */}
        <div className="liquid-glass p-6 rounded-3xl">
          <h2 className="font-heading font-semibold flex items-center gap-2 mb-5 text-card-foreground">
            <Filter className="h-4 w-4 text-primary" /> Filters
          </h2>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-card-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 liquid-glass shadow-none border-transparent rounded-3xl"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-card-foreground">Category</label>
              <SearchableCombobox
                options={[
                  { id: "all", label: "ALL CATEGORIES" },
                  ...categories.map(c => ({ id: c.id, label: c.name.toUpperCase() }))
                ]}
                value={categoryFilter}
                onChange={(v) => setCategoryFilter(v === "" ? "all" : v)}
                placeholder="Search category..."
                emptyText="No categories found."
                ariaLabel="Filter by category"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="font-medium text-card-foreground">Price Range (₹)</label>
                <span className="text-muted-foreground text-xs">₹{priceRange[0]} – ₹{priceRange[1]}</span>
              </div>
              <Slider value={priceRange} min={0} max={maxPrice} step={100} onValueChange={(v) => setPriceRange(v as number[])} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>₹0</span><span>₹{maxPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="font-medium text-card-foreground">Weight Range (g)</label>
                <span className="text-muted-foreground text-xs">{weightRange[0]}g – {weightRange[1]}g</span>
              </div>
              <Slider value={weightRange} min={0} max={maxWeight} step={10} onValueChange={(v) => setWeightRange(v as number[])} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0g</span><span>{maxWeight.toLocaleString('en-IN')}g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Box 2: Selection */}
        <div className="bg-primary/5 border border-primary/20 shadow-sm p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <h2 className="font-heading font-semibold flex items-center gap-2 mb-2 text-foreground">✓ Selection</h2>
            <p className="text-3xl font-semibold text-primary mb-1">{selectedIds.size}</p>
            <p className="text-sm text-muted-foreground mb-6">products selected</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={selectAll} variant="outline" className="flex-1">Select All</Button>
            <Button onClick={clearSelection} variant="outline" className="flex-1">Clear</Button>
          </div>
        </div>

        {/* Box 3: Generate Catalogue */}
        <div className="liquid-glass p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <h2 className="font-heading font-semibold flex items-center gap-2 mb-4 text-card-foreground">
              <Files className="h-4 w-4 text-primary" /> Generate Catalogue
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">Catalogue Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Ganesh Collection 2024" className="bg-background" />
            </div>
          </div>
          <Button onClick={generatePDF} disabled={!title.trim() || selectedIds.size === 0 || generating} className="w-full font-medium mt-4">
            <Download className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </div>

      {/* Products grid below */}
      <div>
        <p className="text-sm text-muted-foreground mb-4">Showing {filteredProducts.length} products</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,8].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.length === 0 && !loading && (
                <div className="col-span-full py-16 text-center liquid-glass border-transparent rounded-3xl flex flex-col items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h2 className="text-lg font-heading font-semibold text-foreground mb-1">
                    {products.length === 0 ? "No products yet" : "No products match your filters"}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {products.length === 0
                      ? "Add products first, then come back to build your catalogue."
                      : "Try adjusting your search or filters."}
                  </p>
                  {products.length === 0 && (
                    <Link href="/admin/products">
                      <Button><Plus className="h-4 w-4 mr-2" /> Add Products</Button>
                    </Link>
                  )}
                </div>
              )}
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                const categoryName = product.category ? product.category.name : "Uncategorized";
                const weightStr = product.weight_kg ? `${product.weight_kg}kg` : "-";
                const sizeStr = product.height_inches || product.length_inches ? `H: ${product.height_inches || "-"} × L: ${product.length_inches || "-"}` : "-";

                let priceStr = "-";
                let rateCodeStr = "";
                if (product.direct_rate) {
                  priceStr = `₹${product.direct_rate}/${product.rate_type === 'per_kg' ? 'kg' : 'piece'}`;
                } else if (product.rate_code) {
                  priceStr = `₹${product.rate_code.value}/${product.rate_type === 'per_kg' ? 'kg' : 'piece'}`;
                  rateCodeStr = product.rate_code.code;
                }

                return (
                  <div
                    key={product.id}
                    onClick={() => toggleSelect(product.id)}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={isSelected}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(product.id); } }}
                    className={`liquid-glass overflow-hidden flex flex-col transition cursor-pointer relative focus-visible:ring-3 focus-visible:ring-ring/50 outline-none active:scale-[0.98] ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:shadow-md'}`}
                  >
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox checked={isSelected} className="bg-background/90 backdrop-blur border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    </div>

                    <div className="relative aspect-square bg-muted/20">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23eee%22/><text x=%2250%22 y=%2250%22 font-family=%22sans-serif%22 font-size=%2214%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%23999%22>No Image</text></svg>'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-[10px] font-semibold px-2 py-1 rounded-full text-foreground">{categoryName}</div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h2 className="font-heading font-semibold text-base text-card-foreground line-clamp-1 mb-1">{product.name}</h2>
                      {product.sku && <p className="text-[10px] font-mono text-muted-foreground mb-2">{product.sku}</p>}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center text-xs text-muted-foreground"><Weight className="h-3 w-3 mr-2 opacity-70" />{weightStr}</div>
                        <div className="flex items-center text-xs text-muted-foreground"><Ruler className="h-3 w-3 mr-2 opacity-70" />{sizeStr}</div>
                      </div>
                      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                        <span className="font-semibold text-card-foreground text-sm">{priceStr}</span>
                        {rateCodeStr && <span className="text-[9px] font-medium text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded-full">{rateCodeStr}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
