import { useState, useEffect } from "react";
import { Search, FileText, Link as LinkIcon, Copy, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function CataloguesPage() {
  const [catalogues, setCatalogues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCatalogues();
  }, []);

  async function fetchCatalogues() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogues')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setCatalogues(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const deleteCatalogue = async (id: string, share_uuid: string) => {
    toast('Confirm Deletion', {
      description: 'Are you sure you want to delete this catalogue?',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            // Delete the PDF from storage
            const fileName = `${share_uuid}.pdf`;
            const { error: storageError } = await supabase.storage.from('catalogue-pdfs').remove([fileName]);
            if (storageError) console.error("Could not delete from storage:", storageError.message);

            // Clean up junction table first to avoid FK constraint errors
            await supabase.from('catalogue_products').delete().eq('catalogue_id', id);

            const { error } = await supabase.from('catalogues').delete().eq('id', id);
            if (error) throw error;
            setCatalogues(catalogues.filter(c => c.id !== id));
            toast.success("Catalogue deleted successfully");
          } catch (err) {
            console.error(err);
            toast.error("Failed to delete catalogue.");
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  const copyLink = (uuid: string) => {
    // using window.location.origin instead of hardcoded domain for testing
    const url = `${window.location.origin}/catalogue/${uuid}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Copied to clipboard!"))
      .catch((e) => {
        console.error("Clipboard API failed:", e);
        toast.error("Failed to copy link. Please manually copy the link from the text box below.");
      });
  };

  const openAppletLink = (url: string) => {
    window.open(url, '_blank');
    toast.info("Opening link (if nothing happens, please allow popups)", { duration: 3000 });
  };

  const filteredCatalogues = catalogues.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">My Catalogues</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage your generated catalogues and share links</p>
        </div>
      </div>

      <div className="max-w-4xl">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search catalogues..." 
            className="pl-9 liquid-glass shadow-none border-transparent h-10 w-full rounded-3xl"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : filteredCatalogues.length === 0 ? (
          <div className="text-muted-foreground p-12 text-center liquid-glass border-transparent rounded-3xl">No catalogues found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCatalogues.map((cat) => (
              <div key={cat.id} className="liquid-glass p-6 rounded-3xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="font-heading font-semibold text-lg text-card-foreground ">{cat.title}</h2>
                  </div>
                  <span className="text-[10px] font-medium text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-full">
                    Private
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Created {new Date(cat.created_at).toLocaleDateString()}
                </p>
                
                <div className="liquid-glass border-transparent hover:bg-white/40 p-3 rounded-3xl border border-border mb-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                    <LinkIcon className="h-3 w-3" /> Share Link
                  </div>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {`https://padmavaticorporation.com/catalogue/${cat.share_uuid}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={() => copyLink(cat.share_uuid)} variant="outline" size="sm" className="h-8 text-xs font-medium">
                    <Copy className="h-3 w-3 mr-1.5" /> Copy Link
                  </Button>
                  <Button onClick={() => openAppletLink(`/catalogue/${cat.share_uuid}`)} variant="outline" size="sm" className="h-8 text-xs font-medium">
                    <ExternalLink className="h-3 w-3 mr-1.5" /> Open
                  </Button>
                  {cat.pdf_url && (
                    <Button onClick={() => openAppletLink(cat.pdf_url!)} variant="outline" size="sm" className="h-8 text-xs font-medium">
                      <ExternalLink className="h-3 w-3 mr-1.5" /> View PDF
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button onClick={() => deleteCatalogue(cat.id, cat.share_uuid)} variant="destructive" size="sm" aria-label="Delete Catalogue" className="h-8 w-8 p-0 shadow-none">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
