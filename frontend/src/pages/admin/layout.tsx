import { useEffect, useState, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  Building2, 
  IndianRupee, 
  FileText, 
  Files, 
  Bell, 
  LogOut,
  Search,
  Sun,
  Check,
  X,
  Menu
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AdminLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || "");
      }
    });

    fetchPendingRequests();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPendingRequests = async () => {
    const { count } = await supabase.from('access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    setPendingCount(count || 0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const res = await fetch("/api/admin/pending-requests", {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setRecentRequests(data.slice(0, 5));
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
        fetchPendingRequests(); // Refresh the list
      } else {
        toast.error("Failed to process request");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: FolderOpen },
    { name: "Parties", href: "/admin/parties", icon: Building2 },
    { name: "Rates", href: "/admin/rates", icon: IndianRupee },
    { name: "Create Catalogue", href: "/admin/create-catalogue", icon: FileText },
    { name: "My Catalogues", href: "/admin/catalogues", icon: Files },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative selection:bg-primary/20">
      {/* Subtle Admin Background Mesh */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[50%] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside id="mobile-sidebar" className={`fixed lg:static inset-y-0 left-0 w-64 bg-sidebar/70 backdrop-blur-2xl border-r border-border/50 flex flex-col h-full pb-[env(safe-area-inset-bottom)] shadow-sm z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/admin/dashboard" className="block outline-none" onClick={() => setMobileSidebarOpen(false)}>
            <Logo />
          </Link>
          <button aria-label="Close Navigation Menu" className="lg:hidden text-muted-foreground" onClick={() => setMobileSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-3 mb-2">Navigation</p>
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-3xl text-sm transition-colors cursor-pointer ${
                    isActive 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-foreground font-medium hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-3 mb-2">Admin</p>
            <Link
              to="/admin/access-requests"
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-3xl text-sm transition-colors cursor-pointer w-full ${
                currentPath.startsWith("/admin/access-requests")
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-foreground font-medium hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 relative">
                   {pendingCount > 0 && (
                     <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full border border-background"></span>
                   )}
                </Bell>
                Access Requests
              </div>
              {pendingCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>
          </div>
        </nav>

        <div className="p-6 text-xs text-muted-foreground mt-auto">
          &copy; {new Date().getFullYear()} Padmavati Corp
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col h-full pb-[env(safe-area-inset-bottom)] overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 liquid-glass rounded-none border-t-0 border-l-0 border-r-0 border-b border-white/20 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileSidebarOpen}
              aria-controls="mobile-sidebar"
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:block flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="w-full pl-10 bg-background border-none rounded-full h-10 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-transparent outline-none shadow-none text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <ThemeToggle />
            
            <div className="hidden sm:block h-8 w-px bg-border"></div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-foreground">{userEmail.split('@')[0] || "Admin"}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Administrator</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm sm:text-lg uppercase">
                {userEmail ? userEmail[0] : 'A'}
              </div>
              <button onClick={handleLogout} className="ml-1 sm:ml-2 text-muted-foreground hover:text-destructive p-1 sm:p-2 transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-full" title="Logout">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10 min-h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
