import type { Request, Response, NextFunction } from "express";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabase";

export interface AuthedRequest extends Request {
  supabaseToken?: string;
  user?: { id: string; email?: string };
}

/**
 * Accepts either a Bearer token (used by the frontend's fetch calls) or a
 * Supabase auth cookie (used when the request originates from a browser
 * session without an explicit Authorization header).
 */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.supabaseToken = token;
        req.user = { id: user.id, email: user.email };
        return next();
      }
    }

    const supabaseServer = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const parsed = parseCookieHeader(req.headers.cookie ?? "");
          return parsed.map((c) => ({ name: c.name, value: c.value ?? "" }));
        },
        setAll() {},
      },
    });

    const { data: { user }, error } = await supabaseServer.auth.getUser();
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: { session } } = await supabaseServer.auth.getSession();
    req.supabaseToken = session?.access_token;
    req.user = { id: user.id, email: user.email };

    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
