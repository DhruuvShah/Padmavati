import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { SearchableCombobox } from "@/components/SearchableCombobox";

type Variant = {
  id?: string;
  weightKg: string;
  rateCodeId: string;
  directRate: string;
  heightInches: string;
  lengthInches: string;
};

export default function NewProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reference Data
  const [categories, setCategories] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [rateCodes, setRateCodes] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [rateType, setRateType] = useState<"per_kg" | "per_piece">("per_kg");
  const [rateMode, setRateMode] = useState<"code" | "direct">("code"); // only for per_kg
  const [rateCodeId, setRateCodeId] = useState("");
  const [directRate, setDirectRate] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [lengthInches, setLengthInches] = useState("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [variants, setVariants] = useState<Variant[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReferenceData();
    if (isEditing) {
      loadProductData();
    }
  }, [id]);

  useEffect(() => {
    if (rateType === 'per_piece') {
      setRateMode('direct');
    }
  }, [rateType]);

  async function fetchReferenceData() {
    try {
      const [catRes, partyRes, ratesRes] = await Promise.all([
        supabase.from("categories").select("id, name, tags").order("name"),
        supabase.from("parties").select("id, code_name, actual_name").order("code_name"),
        supabase.from("rate_codes").select("id, code, rate_type").order("code"),
      ]);
      setCategories(catRes.data || []);
      setParties(partyRes.data || []);
      setRateCodes(ratesRes.data || []);
    } catch (err: any) {
      toast.error("Failed to load reference data");
    }
  }

  async function loadProductData() {
    setLoading(true);
    try {
      const { data: prod, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      setName(prod.name);
      setCategoryId(prod.category_id);
      setPartyId(prod.party_id || "");
      setWeightKg(prod.weight_kg || "");
      setRateType(prod.rate_type);
      if (prod.rate_type === "per_kg") {
        if (prod.rate_code_id) {
          setRateMode("code");
          setRateCodeId(prod.rate_code_id);
        } else {
          setRateMode("direct");
          setDirectRate(prod.direct_rate || "");
        }
      } else {
        setRateMode("direct");
        setDirectRate(prod.direct_rate || "");
      }
      setHeightInches(prod.height_inches || "");
      setLengthInches(prod.length_inches || "");
      if (prod.image_url) setImagePreview(prod.image_url);

      const { data: vars } = await supabase.from("product_variants").select("*").eq("product_id", id);
      if (vars) {
        setVariants(vars.map((v: any) => ({
          id: v.id,
          weightKg: v.weight_kg || "",
          rateCodeId: v.rate_code_id || "",
          directRate: v.direct_rate || "",
          heightInches: v.height_inches || "",
          lengthInches: v.length_inches || ""
        })));
      }
    } catch (err: any) {
      toast.error("Error loading product: " + err.message);
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          "Authorization": session ? `Bearer ${session.access_token}` : ""
        },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      return data.url;
    } catch (err: any) {
      toast.error("Image upload failed: " + err.message);
      return null;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Product Name is required");
    if (!categoryId) return toast.error("Category is required");
    if (!weightKg) return toast.error("Weight is required");
    
    if (rateType === 'per_kg') {
      if (rateMode === 'code' && !rateCodeId) return toast.error("Rate Code is required");
      if (rateMode === 'direct' && !directRate) return toast.error("Direct Rate is required");
    } else {
      if (!directRate) return toast.error("Direct Rate is required");
    }

    setSaving(true);
    try {
      let finalImageUrl = isEditing ? imagePreview : null;
      if (imageFile) {
        finalImageUrl = await uploadImage();
        if (!finalImageUrl) throw new Error("Could not process image");
      }

      const payload = {
        name,
        category_id: categoryId,
        party_id: partyId || null,
        weight_kg: weightKg || null,
        rate_type: rateType,
        rate_code_id: (rateType === 'per_kg' && rateMode === 'code') ? rateCodeId : null,
        direct_rate: (rateType === 'per_piece' || rateMode === 'direct') ? directRate || null : null,
        height_inches: heightInches || null,
        length_inches: lengthInches || null,
        image_url: finalImageUrl
      };

      let productId = id;

      if (isEditing) {
        await supabase.from("products").update(payload).eq("id", id);
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Handle variants (simple replace for now: delete all existing, insert new ones)
      if (isEditing) {
        await supabase.from("product_variants").delete().eq("product_id", id);
      }

      if (variants.length > 0 && productId) {
        const variantPayloads = variants.map(v => ({
          product_id: productId,
          weight_kg: v.weightKg || null,
          rate_code_id: (rateType === 'per_kg' && rateMode === 'code' && v.rateCodeId) ? v.rateCodeId : null,
          direct_rate: (!v.rateCodeId && v.directRate) ? v.directRate : null,
          height_inches: v.heightInches || null,
          length_inches: v.lengthInches || null,
        }));
        await supabase.from("product_variants").insert(variantPayloads);
      }

      toast.success(isEditing ? "Product updated successfully" : "Product added successfully");
      navigate("/admin/products");
    } catch (err: any) {
      toast.error("Error saving product: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async (catName: string) => {
    try {
      const { data, error } = await supabase.from("categories").insert({ name: catName }).select().single();
      if (error) throw error;
      setCategories([...categories, data]);
      setCategoryId(data.id);
      toast.success("Category created");
    } catch (err: any) {
      toast.error("Failed to create category: " + err.message);
    }
  };

  const createParty = async (partyName: string) => {
    try {
      const { data, error } = await supabase.from("parties").insert({ code_name: partyName }).select().single();
      if (error) throw error;
      setParties([...parties, data]);
      setPartyId(data.id);
      toast.success("Party created");
    } catch (err: any) {
      toast.error("Failed to create party: " + err.message);
    }
  };

  const handleDeleteProduct = async () => {
    toast('Confirm Deletion', {
      description: 'Are you sure you want to delete this product? All variants and catalogue entries will be removed.',
      action: {
        label: 'Delete',
        onClick: async () => {
          setSaving(true);
          try {
            const { error } = await supabase.from("products").delete().eq("id", id);
            if (error) throw error;
            toast.success("Product deleted successfully");
            navigate("/admin/products");
          } catch (err: any) {
            toast.error("Error deleting product: " + err.message);
            setSaving(false);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Back to Products" onClick={() => navigate("/admin/products")} className="h-8 w-8 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">{isEditing ? "Edit Product" : "Add Product"}</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">{isEditing ? "Update your product details and pricing" : "Add a new brass product to your inventory"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {isEditing && (
            <Button variant="outline" size="sm" onClick={handleDeleteProduct} disabled={saving} className="flex-1 sm:flex-none liquid-glass border-destructive/20 text-destructive hover:bg-destructive/10 rounded-full">
              <Trash2 className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")} className="flex-1 sm:flex-none">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
            {saving ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </div>

      <div className="liquid-glass overflow-hidden rounded-3xl">
        <div className="p-4 sm:p-8 space-y-8">
          
          {/* Image Upload */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="w-full sm:w-48 flex-shrink-0 space-y-3">
              <Label>Product Image</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload Photo"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                className="aspect-square liquid-glass border-transparent border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:liquid-glass hover:bg-white/40 transition active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50 outline-none relative overflow-hidden group"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain"  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23eee%22/><text x=%2250%22 y=%2250%22 font-family=%22sans-serif%22 font-size=%2214%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%23999%22>No Image</text></svg>'; }} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">Change</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground py-1 px-3 border border-transparent rounded-full liquid-glass">Upload Photo</span>
                  </>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageSelect}
                />
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Special Ambe maa"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label id="category-label">Category *</Label>
                  <SearchableCombobox 
                    ariaLabel="Select category"
                    options={categories.map(c => ({ id: c.id, label: c.name, tags: c.tags || [] }))}
                    value={categoryId}
                    onChange={setCategoryId}
                    onCreateNew={createCategory}
                    placeholder="Search category..."
                  />
                </div>
                <div className="space-y-2">
                  <Label id="party-label">Party (Optional)</Label>
                  <SearchableCombobox 
                    ariaLabel="Select party"
                    options={parties.map(p => ({ id: p.id, label: p.code_name }))}
                    value={partyId}
                    onChange={setPartyId}
                    onCreateNew={createParty}
                    placeholder="Search party..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="weightKg">Weight per piece (kg) *</Label>
              <Input 
                id="weightKg" 
                value={weightKg} 
                onChange={(e) => setWeightKg(e.target.value)}
                type="text"
                inputMode="decimal"
                pattern="^\d*\.?\d{0,3}$"
                placeholder="0.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightInches">Height (inches)</Label>
              <Input 
                id="heightInches" 
                value={heightInches} 
                onChange={(e) => setHeightInches(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lengthInches">Length (inches)</Label>
              <Input 
                id="lengthInches" 
                value={lengthInches} 
                onChange={(e) => setLengthInches(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Pricing */}
          <div className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-3">Rate Type *</legend>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rateType" 
                    value="per_kg" 
                    checked={rateType === "per_kg"}
                    onChange={() => setRateType("per_kg")}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Per Kg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rateType" 
                    value="per_piece" 
                    checked={rateType === "per_piece"}
                    onChange={() => setRateType("per_piece")}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Per Piece</span>
                </label>
              </div>
            </fieldset>

            <div className="p-6 liquid-glass border-transparent border border-border rounded-3xl">
              {rateType === 'per_kg' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-3xl max-w-sm">
                    <button 
                      onClick={() => setRateMode('code')}
                      className={`flex-1 py-1.5 text-xs font-semibold overflow-hidden transition relative ${rateMode === 'code' ? 'liquid-glass shadow-none border-transparent text-foreground' : 'text-muted-foreground'}`}
                    >
                      Rate Code
                    </button>
                    <button 
                      onClick={() => setRateMode('direct')}
                      className={`flex-1 py-1.5 text-xs font-semibold overflow-hidden transition relative ${rateMode === 'direct' ? 'liquid-glass shadow-none border-transparent text-foreground' : 'text-muted-foreground'}`}
                    >
                      Direct Rate
                    </button>
                  </div>
                  
                  {rateMode === 'code' ? (
                    <div className="max-w-sm space-y-2">
                      <Label id="select-rate-code-label">Select Rate Code *</Label>
                      <SearchableCombobox 
                        ariaLabel="Select rate code"
                        options={rateCodes.filter(r => r.rate_type === 'per_kg').map(r => ({ id: r.id, label: r.code }))}
                        value={rateCodeId}
                        onChange={setRateCodeId}
                        placeholder="Search code..."
                      />
                    </div>
                  ) : (
                    <div className="max-w-sm space-y-2">
                      <Label htmlFor="product-rate-kg-direct">Direct Rate (₹/kg) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input id="product-rate-kg-direct" 
                    value={directRate} 
                          onChange={(e) => setDirectRate(e.target.value)}
                          type="text"
                          inputMode="decimal"
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="product-rate-piece-direct">Direct Rate (₹/piece) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input id="product-rate-piece-direct" 
                    value={directRate} 
                      onChange={(e) => setDirectRate(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Size Variants</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setVariants([...variants, { weightKg: "", rateCodeId: "", directRate: "", heightInches: "", lengthInches: "" }])}
              >
                <Plus className="h-3 w-3 mr-2" /> Add Variant
              </Button>
            </div>

            {variants.length > 0 && (
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 liquid-glass border-transparent relative pr-12 rounded-3xl">
                    <button 
                      onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive p-2 rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-weight`} className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Weight (kg)</Label>
                        <Input id={`variant-${index}-weight`} type="number" step="any" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} 
                          placeholder="0.000" 
                          value={variant.weightKg}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[index].weightKg = e.target.value;
                            setVariants(newVars);
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Rate Mode</div>
                        {rateMode === 'code' ? (
                          <SearchableCombobox 
                            ariaLabel="Select rate code"
                            options={rateCodes.filter(r => r.rate_type === rateType).map(r => ({ id: r.id, label: r.code }))}
                            value={variant.rateCodeId}
                            onChange={(val) => {
                              const newVars = [...variants];
                              newVars[index].rateCodeId = val;
                              newVars[index].directRate = "";
                              setVariants(newVars);
                            }}
                          />
                        ) : (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input id={`variant-${index}-directRate`} aria-label={`Variant ${index} direct rate`} type="number" step="any" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} 
                              placeholder="0.00" 
                              className="pl-7"
                              value={variant.directRate}
                              onChange={(e) => {
                                const newVars = [...variants];
                                newVars[index].directRate = e.target.value;
                                newVars[index].rateCodeId = "";
                                setVariants(newVars);
                              }}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-height`} className="text-xs text-muted-foreground uppercase font-bold tracking-wider">H (in)</Label>
                        <Input id={`variant-${index}-height`} type="number" step="any" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} 
                          placeholder="-" 
                          value={variant.heightInches}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[index].heightInches = e.target.value;
                            setVariants(newVars);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-length`} className="text-xs text-muted-foreground uppercase font-bold tracking-wider">L (in)</Label>
                        <Input id={`variant-${index}-length`} type="number" step="any" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} 
                          placeholder="-" 
                          value={variant.lengthInches}
                          onChange={(e) => {
                            const newVars = [...variants];
                            newVars[index].lengthInches = e.target.value;
                            setVariants(newVars);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {variants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 border border-border rounded-3xl">
                No variants added. Add variants if this product comes in multiple sizes.
              </p>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
