"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "padmavati-glass-enabled";

type GlassContextValue = {
  glassEnabled: boolean;
  setGlassEnabled: (enabled: boolean) => void;
};

const GlassContext = createContext<GlassContextValue | null>(null);

// Inline script injected before hydration (see GlassInitScript / app/layout.tsx)
// already applies/removes the "no-glass" class on <html> synchronously, so
// the very first paint already matches the stored preference. This reads
// that same class back out on mount instead of defaulting to "on" and then
// flipping, which is what would otherwise cause a one-frame flash for
// returning users who turned glass off.
function readInitialGlassEnabled(): boolean {
  if (typeof document === "undefined") return true;
  return !document.documentElement.classList.contains("no-glass");
}

export function GlassProvider({ children }: { children: ReactNode }) {
  const [glassEnabled, setGlassEnabledState] = useState<boolean>(readInitialGlassEnabled);

  useEffect(() => {
    document.documentElement.classList.toggle("no-glass", !glassEnabled);
  }, [glassEnabled]);

  const setGlassEnabled = (enabled: boolean) => {
    setGlassEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // localStorage unavailable (private mode etc.) — in-memory state still works for this session
    }
  };

  return <GlassContext.Provider value={{ glassEnabled, setGlassEnabled }}>{children}</GlassContext.Provider>;
}

export function useGlass() {
  const ctx = useContext(GlassContext);
  if (!ctx) throw new Error("useGlass must be used within a GlassProvider");
  return ctx;
}

// Blocking script string for next/script's beforeInteractive strategy — must
// run before React hydrates so the class is already correct on first paint.
export const GLASS_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})==='off'){document.documentElement.classList.add('no-glass');}}catch(e){}})();`;
