import React, { useState, useEffect } from "react";
import { Plus, Folder, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) {
      toast.error("Failed to load categories: " + error.message);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value);
    const newTags = e.target.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setTags(newTags);
  };

  const openAddDialog = () => {
    setEditingId(null);
    setName("");
    setTagsInput("");
    setTags([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setTags(cat.tags || []);
    setTagsInput((cat.tags || []).join(", "));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("categories").update({ name, tags }).eq("id", editingId);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("categories").insert({ name, tags });
        if (error) throw error;
        toast.success("Category added");
      }
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error("Error saving category: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast('Confirm Deletion', {
      description: 'Are you sure you want to delete this category?',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const { error } = await supabase.from("categories").delete().eq("id", id);
            if (error) throw error;
            toast.success("Category deleted");
            fetchCategories();
          } catch (error: any) {
            toast.error("Error deleting category: " + error.message);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage product categories and god types</p>
        </div>
        <Button onClick={openAddDialog} className="font-medium w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="liquid-glass p-6 flex items-start gap-4 group rounded-3xl">
              <div className="h-10 w-10 bg-primary/10 rounded-3xl flex items-center justify-center flex-shrink-0 border border-primary/20">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading font-semibold text-lg text-card-foreground line-clamp-1">{cat.name}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(cat.tags || []).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-medium text-muted-foreground uppercase bg-muted px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditDialog(cat)} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-16 text-center liquid-glass border-transparent rounded-3xl flex flex-col items-center justify-center">
              <Folder className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-heading font-semibold text-foreground mb-1">No categories found</h2>
              <p className="text-muted-foreground mb-6">Create categories to organize your library.</p>
              <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Ambe maa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input 
                id="tags" 
                value={tagsInput} 
                onChange={handleTagsChange} 
                placeholder="e.g. ambemaa, durga"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-medium uppercase bg-muted px-2 py-1 rounded-full">
                      {tag}
                      <button 
                        onClick={() => {
                          const newTags = tags.filter(t => t !== tag);
                          setTags(newTags);
                          setTagsInput(newTags.join(", "));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
