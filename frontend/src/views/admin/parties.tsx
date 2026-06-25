import React, { useState, useEffect } from "react";
import { Plus, Building2, Edit2, Trash2, Search, ChevronRight, ChevronDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function PartiesPage() {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [codeName, setCodeName] = useState("");
  const [actualName, setActualName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [partyProducts, setPartyProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    fetchParties();
  }, []);

  async function fetchParties() {
    setLoading(true);
    const { data, error } = await supabase.from("parties").select("*").order("code_name");
    if (error) {
      toast.error("Failed to load parties: " + error.message);
    } else {
      setParties(data || []);
    }
    setLoading(false);
  }

  const handleExpand = async (partyId: string) => {
    if (expandedId === partyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(partyId);
    setLoadingProducts(true);
    const { data, error } = await supabase.from("products").select("id, name, direct_rate, rate_type").eq("party_id", partyId);
    if (!error && data) {
      setPartyProducts(data);
    }
    setLoadingProducts(false);
  };

  const openAddDialog = () => {
    setEditingId(null);
    setCodeName("");
    setActualName("");
    setNotes("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (party: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(party.id);
    setCodeName(party.code_name);
    setActualName(party.actual_name || "");
    setNotes(party.notes || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!codeName.trim()) {
      toast.error("Code Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("parties").update({
          code_name: codeName, actual_name: actualName, notes
        }).eq("id", editingId);
        if (error) throw error;
        toast.success("Party updated");
      } else {
        const { error } = await supabase.from("parties").insert({
          code_name: codeName, actual_name: actualName, notes
        });
        if (error) throw error;
        toast.success("Party added");
      }
      setIsDialogOpen(false);
      fetchParties();
    } catch (error: any) {
      toast.error("Error saving party: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast('Confirm Deletion', {
      description: 'Are you sure you want to delete this party?',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const { error } = await supabase.from("parties").delete().eq("id", id);
            if (error) throw error;
            toast.success("Party deleted");
            fetchParties();
          } catch (error: any) {
            toast.error("Error deleting party: " + error.message);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

  const filteredParties = parties.filter(p => 
    p.code_name.toLowerCase().includes(search.toLowerCase()) || 
    p.actual_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">Parties</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage your purchase parties/suppliers</p>
        </div>
        <Button onClick={openAddDialog} className="font-medium">
          <Plus className="h-4 w-4 mr-2" /> Add Party
        </Button>
      </div>

      <div className="max-w-3xl">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search parties..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 liquid-glass shadow-none border-transparent h-10 w-full rounded-3xl"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParties.map((party) => (
              <div key={party.id} className="liquid-glass overflow-hidden transition-colors hover:shadow-md rounded-3xl">
                <div 
                  onClick={() => handleExpand(party.id)}
                  className="p-4 hover:border-primary/30 flex items-center justify-between group cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50 outline-none active:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {expandedId === party.id ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <div className="h-10 w-10 bg-primary/10 rounded-3xl flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-heading font-semibold text-card-foreground line-clamp-1">{party.code_name}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{party.actual_name || "No actual name"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditDialog(party, e)} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => handleDelete(party.id, e)} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedId === party.id && (
                  <div className="border-t px-14 py-4 liquid-glass border-transparent rounded-3xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Products from {party.code_name}</h3>
                    {loadingProducts ? (
                      <div className="text-sm text-muted-foreground py-2 text-center">Loading products...</div>
                    ) : partyProducts.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2 text-center liquid-glass border-transparent rounded-3xl">No products found for this party.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {partyProducts.map(prod => (
                          <div key={prod.id} className="flex items-center gap-3 liquid-glass p-2 rounded-3xl">
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground truncate">{prod.name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{prod.rate_type.replace('_', ' ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredParties.length === 0 && (
              <div className="py-12 text-center text-muted-foreground liquid-glass border-transparent rounded-3xl">
                No parties found.
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Party" : "Add Party"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="codeName">Code Name * (Primary Display)</Label>
              <Input 
                id="codeName" 
                value={codeName} 
                onChange={(e) => setCodeName(e.target.value)} 
                placeholder="e.g. Bro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualName">Actual Name (Optional)</Label>
              <Input 
                id="actualName" 
                value={actualName} 
                onChange={(e) => setActualName(e.target.value)} 
                placeholder="e.g. Brother Brass Works"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Any special terms..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
