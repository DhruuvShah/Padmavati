import { useState, useEffect } from "react";
import { Filter, Download, Weight, Ruler, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function CreateCataloguePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [weightRange, setWeightRange] = useState([0, 10000]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from('products').select(`
          id, name, image_url, weight_kg, height_inches, length_inches,
          rate_type, direct_rate, category_id,
          category:categories(name),
          rate_code:rate_codes(code, value)
        `),
        supabase.from('categories').select('id, name')
      ]);
      
      if (pRes.data) setProducts(pRes.data);
      if (cRes.data) setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  // Calculate display price for filtering
  const getProductPrice = (p: any) => {
    if (p.direct_rate) return Number(p.direct_rate);
    if (p.rate_code) return Number(p.rate_code.value);
    return 0;
  };
  
  const getProductWeightGrams = (p: any) => {
    return p.weight_kg ? Number(p.weight_kg) * 1000 : 0;
  };

  const filteredProducts = products.filter(p => {
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
  
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

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
        body: JSON.stringify({
          title: title.trim(),
          productIds: Array.from(selectedIds)
        })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      navigate('/admin/catalogues');
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar - Filters & Actions */}
        <div className="w-full lg:w-72 space-y-6 flex-shrink-0">
          <div className="liquid-glass p-6 rounded-3xl">
            <h2 className="font-heading font-semibold flex items-center gap-2 mb-5 text-card-foreground">
              <Filter className="h-4 w-4 text-primary" /> Filters
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-card-foreground">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="liquid-glass border-transparent shadow-sm rounded-3xl">
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

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <label className="font-medium text-card-foreground">Price Range (₹)</label>
                  <span className="text-muted-foreground text-xs">₹{priceRange[0]} - ₹{priceRange[1]}</span>
                </div>
                <Slider 
                  value={priceRange} 
                  min={0} 
                  max={100000} 
                  step={100} 
                  onValueChange={setPriceRange}
                  className="py-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹0</span>
                  <span>₹100000</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <label className="font-medium text-card-foreground">Weight Range (g)</label>
                  <span className="text-muted-foreground text-xs">{weightRange[0]}g - {weightRange[1]}g</span>
                </div>
                <Slider 
                  value={weightRange} 
                  min={0} 
                  max={10000} 
                  step={10} 
                  onValueChange={setWeightRange}
                  className="py-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0g</span>
                  <span>10000g</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 shadow-sm p-5 rounded-3xl">
            <h2 className="font-heading font-semibold flex items-center gap-2 mb-2 text-foreground">
               ✓ Selection
            </h2>
            <p className="text-2xl font-semibold text-primary mb-4">{selectedIds.size} products</p>
            <div className="flex gap-3">
              <Button onClick={selectAll} variant="outline" className="flex-1 bg-background border-border shadow-sm text-foreground hover:bg-muted">Select All</Button>
              <Button onClick={clearSelection} variant="outline" className="flex-1 bg-background border-border shadow-sm text-foreground hover:bg-muted">Clear</Button>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-3xl">
            <h2 className="font-heading font-semibold flex items-center gap-2 mb-4 text-card-foreground">
              <Files className="h-4 w-4 text-primary" /> Generate Catalogue
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Catalogue Title</label>
                <Input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Ganesh Collection 2024" 
                  className="bg-background"
                />
              </div>
              <Button 
                onClick={generatePDF}
                disabled={!title.trim() || selectedIds.size === 0 || generating} 
                className="w-full font-medium"
              >
                <Download className="h-4 w-4 mr-2" /> 
                {generating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Content - Product Grid */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-4">Showing {filteredProducts.length} products</p>
          
          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
               {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl"></div>)}
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                       <Checkbox 
                         checked={isSelected} 
                         className="bg-background/90 backdrop-blur border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                       />
                     </div>
                     
                     <div className="relative aspect-square bg-muted/20">
                       {product.image_url ? (
                         <img 
                           src={product.image_url} 
                           alt={product.name}
                           className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23eee%22/><text x=%2250%22 y=%2250%22 font-family=%22sans-serif%22 font-size=%2214%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%23999%22>No Image</text></svg>'; }} />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                       )}
                       <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-[10px] font-semibold px-2 py-1 rounded-full text-foreground">
                         {categoryName}
                       </div>
                     </div>
                     
                     <div className="p-4 flex-1 flex flex-col">
                       <h2 className="font-heading font-semibold text-base text-card-foreground line-clamp-1 mb-2">{product.name}</h2>
                       
                       <div className="space-y-1 mb-4">
                         <div className="flex items-center text-xs text-muted-foreground">
                           <Weight className="h-3 w-3 mr-2 opacity-70" />
                           {weightStr}
                         </div>
                         <div className="flex items-center text-xs text-muted-foreground">
                           <Ruler className="h-3 w-3 mr-2 opacity-70" />
                           {sizeStr}
                         </div>
                       </div>
                       
                       <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                         <span className="font-semibold text-card-foreground text-sm">{priceStr}</span>
                         {rateCodeStr && (
                           <span className="text-[9px] font-medium text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded-full">{rateCodeStr}</span>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
