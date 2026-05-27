import React, { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function RatesPage() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [code, setCode] = useState("");
  const [rateType, setRateType] = useState<"per_kg" | "per_piece">("per_kg");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [incrementValue, setIncrementValue] = useState("");
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    setLoading(true);
    const { data, error } = await supabase.from("rate_codes").select("*").order("code");
    if (error) {
      toast.error("Failed to load rates: " + error.message);
    } else {
      setRates(data || []);
    }
    setLoading(false);
  }

  const openAddDialog = () => {
    setEditingId(null);
    setCode("");
    setRateType("per_kg");
    setValue("");
    setLabel("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (rate: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(rate.id);
    setCode(rate.code);
    setRateType(rate.rate_type);
    setValue(rate.value.toString());
    setLabel(rate.label || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim() || !value.trim()) {
      toast.error("Code and Value are required");
      return;
    }
    if (isNaN(parseFloat(value))) {
      toast.error("Value must be a number");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        code,
        rate_type: rateType,
        value: parseFloat(value),
        label: label.trim() || null
      };

      if (editingId) {
        const { error } = await supabase.from("rate_codes").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Rate updated");
      } else {
        const { error } = await supabase.from("rate_codes").insert(payload);
        if (error) throw error;
        toast.success("Rate added");
      }
      setIsDialogOpen(false);
      fetchRates();
    } catch (error: any) {
      toast.error("Error saving rate: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast('Confirm Deletion', {
      description: 'Are you sure you want to delete this rate?',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const { error } = await supabase.from("rate_codes").delete().eq("id", id);
            if (error) throw error;
            toast.success("Rate deleted");
            setSelectedIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            fetchRates();
          } catch (error: any) {
            toast.error("Error deleting rate: " + error.message);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkIncrement = async () => {
    const inc = parseFloat(incrementValue);
    if (isNaN(inc)) {
      toast.error("Please enter a valid amount to increase by.");
      return;
    }
    
    setIsBulkApplying(true);
    try {
      // Drizzle/Supabase bulk update requires multiple calls or RPC, 
      // we'll just loop for simplicity as rate count is usually small.
      const selectedRates = rates.filter(r => selectedIds.has(r.id));
      for (const rate of selectedRates) {
        const newValue = parseFloat(rate.value) + inc;
        const { error } = await supabase
          .from("rate_codes")
          .update({ value: newValue })
          .eq("id", rate.id);
        if (error) throw error;
      }
      toast.success(`Successfully updated ${selectedRates.length} rates`);
      setIncrementValue("");
      setSelectedIds(new Set());
      fetchRates();
    } catch (error: any) {
      toast.error("Error updating rates: " + error.message);
    } finally {
      setIsBulkApplying(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">Rates</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage rate shortcuts for quick pricing</p>
        </div>
        <Button onClick={openAddDialog} className="font-medium">
          <Plus className="h-4 w-4 mr-2" /> Add Rate
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary">{selectedIds.size} rates selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-8 px-2 text-muted-foreground hover:text-foreground">
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Increase by:</span>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input 
                value={incrementValue}
                onChange={e => setIncrementValue(e.target.value)}
                placeholder="0.00"
                className="pl-7 h-9"
              />
            </div>
            <Button onClick={handleBulkIncrement} disabled={isBulkApplying || !incrementValue} size="sm">
              {isBulkApplying ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rates.map((rate) => (
            <div 
              key={rate.id} 
              className={`liquid-glass p-6 transition relative group cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50 outline-none active:scale-[0.98] ${
                selectedIds.has(rate.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
              }`}
              onClick={() => toggleSelection(rate.id)} tabIndex={0} role="button" aria-pressed={selectedIds.has(rate.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelection(rate.id); } }}
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Checkbox 
                  checked={selectedIds.has(rate.id)}
                  onCheckedChange={() => toggleSelection(rate.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => openEditDialog(rate, e)} className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={(e) => handleDelete(rate.id, e)} className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-full inline-block mb-3">
                {rate.code}
              </span>
              <div className="text-xl font-semibold mb-1 text-card-foreground">
                ₹{rate.value} <span className="text-sm font-normal text-muted-foreground">/{rate.rate_type === 'per_kg' ? 'kg' : 'piece'}</span>
              </div>
              <div className="text-sm text-muted-foreground">{rate.label || "No Label"}</div>
            </div>
          ))}
          {rates.length === 0 && (
            <div className="col-span-full py-16 text-center liquid-glass border-transparent rounded-3xl flex flex-col items-center justify-center">
              <Plus className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-heading font-semibold text-foreground mb-1">No rates defined</h2>
              <p className="text-muted-foreground mb-6">Add rate codes for quick calculations.</p>
              <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Rate</Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Rate" : "Add Rate"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input 
                  id="code" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  placeholder="e.g. L-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value (₹) *</Label>
                <Input 
                  id="value" 
                  type="text"
                  inputMode="decimal"
                  value={value} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*/.test(val)) setValue(val);
                  }} 
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Rate Type *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rateType" 
                    value="per_kg" 
                    checked={rateType === "per_kg"}
                    onChange={() => setRateType("per_kg")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Per Kg</span>
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
                  <span className="text-sm">Per Piece</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label (Optional)</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                placeholder="e.g. Brass Rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
