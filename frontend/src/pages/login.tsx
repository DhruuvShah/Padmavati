import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log("Supabase URL in login:", (import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.NEXT_PUBLIC_SUPABASE_URL);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Verify user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      setError(`DB Error: ${userError.message}`);
      setLoading(false);
      return;
    }

    if (!userData || userData.role !== 'admin') {
      setError(`Role mismatch: Expected admin, got ${userData?.role || 'none'}. ID was ${data.user.id}`);
      setLoading(false);
      return;
    }

    // Success
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url(https://images.unsplash.com/photo-1601053075253-06d20392f4ac?q=80&w=2000&auto=format&fit=crop)] bg-cover bg-center opacity-[0.03] pointer-events-none" />
      <div className="relative w-full max-w-sm space-y-6 z-10">
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <Logo className="scale-110 mb-2" />
          <p className="text-sm text-foreground/60 font-medium">Admin Access</p>
        </div>
        
        <div className="liquid-glass p-6 rounded-3xl border border-transparent shadow-sm">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 text-sm text-destructive-foreground bg-destructive rounded-3xl border border-transparent shadow-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" autoComplete="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@padmavati.com" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" autoComplete="current-password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit"
              disabled={loading}
              type="submit"
              className="w-full"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
