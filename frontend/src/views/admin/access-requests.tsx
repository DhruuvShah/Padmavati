import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Check, X, Bell } from "lucide-react";

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch("/api/admin/pending-requests", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const endpoint = action === 'approve' ? "/api/admin/approve-request" : "/api/admin/deny-request";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id })
      });
      
      if (res.ok) {
        toast.success(`Request ${action}d successfully`);
        setRequests(requests.filter(r => r.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to process request");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" /> Access Requests
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Review and manage private catalogue access requests ({requests.length} pending)</p>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-3xl"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(req => (
            <div key={req.id} className="liquid-glass p-6 flex flex-col rounded-3xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-semibold text-lg text-card-foreground">{req.name}</h2>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(req.created_at))} ago</p>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase">Pending</span>
              </div>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="text-sm"><span className="text-muted-foreground">Email:</span> {req.email}</div>
                <div className="text-sm"><span className="text-muted-foreground">Mobile:</span> {req.mobile}</div>
                <div className="mt-4 p-3 liquid-glass border-transparent hover:bg-white/40 rounded-3xl border">
                  <span className="text-xs text-muted-foreground block mb-1">Requested Catalogue</span>
                  <span className="font-medium text-sm">{req.catalogue?.title || 'Unknown Catalogue'}</span>
                </div>
              </div>
              
              <div className="flex gap-3 mt-auto">
                <Button 
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => handleAction(req.id, 'deny')}
                >
                  <X className="w-4 h-4 mr-2" /> Deny
                </Button>
                <Button 
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => handleAction(req.id, 'approve')}
                >
                  <Check className="w-4 h-4 mr-2" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
