"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Check,
  X,
  Menu,
  ScanLine
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlassToggle } from "@/components/ui/glass-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || data?.role !== 'admin') {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email || "");
      setIsAuthenticated(true);
      setAuthLoading(false);
      // Access Requests is disabled (Phase 0) — no need to poll for it.
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [router]);

  const fetchPendingRequests = async (token?: string) => {
    const accessToken = token || (await supabase.auth.getSession()).data.session?.access_token;
    if (!accessToken) return;

    const res = await fetch("/api/admin/pending-requests", {
      headers: { 'Authorization': `Bearer ${accessToken}` }
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
        fetchPendingRequests();
      } else {
        toast.error("Failed to process request");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Scan", href: "/admin/scan", icon: ScanLine },
    { name: "Categories", href: "/admin/categories", icon: FolderOpen },
    { name: "Rates", href: "/admin/rates", icon: IndianRupee },
    { name: "Create Catalogue", href: "/admin/create-catalogue", icon: FileText },
    { name: "My Catalogues", href: "/admin/catalogues", icon: Files },
  ];

  // Built, but outside the scope of what's been quoted/paid for so far.
  // Kept disabled rather than removed — re-enabling later is a one-line flip.
  const disabledNavItems = [
    { name: "Parties", icon: Building2, comingSoonText: "Available in a later phase" },
    { name: "Access Requests", icon: Bell, comingSoonText: "Coming in a future update" },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative selection:bg-primary/20">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[50%] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside id="mobile-sidebar" className={`fixed lg:static inset-y-0 left-0 w-64 bg-sidebar/70 backdrop-blur-2xl border-r border-border/50 flex flex-col h-full pb-[env(safe-area-inset-bottom)] shadow-sm z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between">
          <Link href="/admin/dashboard" className="block outline-none" onClick={() => setMobileSidebarOpen(false)}>
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
                  href={item.href}
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
            <TooltipProvider>
              {disabledNavItems.map((item) => (
                <Tooltip key={item.name}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-3xl text-sm w-full text-left text-muted-foreground/60 cursor-not-allowed"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </button>
                    }
                  />
                  <TooltipContent>{item.comingSoonText}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </nav>

        <div className="p-6 text-xs text-muted-foreground mt-auto">
          &copy; {new Date().getFullYear()} Padmavati Corp
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col h-full pb-[env(safe-area-inset-bottom)] overflow-hidden w-full">
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
            <GlassToggle />

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

        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-400 mx-auto p-4 sm:p-6 lg:p-10 min-h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
