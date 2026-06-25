import { Router } from "express";
import { Resend } from "resend";
import { adminSupabase, supabaseAnonKey } from "../lib/supabase";
import { requireAdmin } from "../middleware/requireAdmin";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export const adminRequestsRouter = Router();

adminRequestsRouter.get("/api/admin/pending-requests", requireAdmin, async (_req, res) => {
  try {
    const { data: requests, error } = await adminSupabase
      .from("access_requests")
      .select(`
        id, name, mobile, email, status, created_at,
        catalogue:catalogues(title, share_uuid)
      `)
      .eq("status", "pending")
      .eq("email_verified", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(requests);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRequestsRouter.post("/api/admin/approve-request", requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    const { data: request } = await adminSupabase
      .from("access_requests")
      .update({
        status: "approved",
        decided_by: supabaseAnonKey, // mock since we don't extract user ID easily here
        decided_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, catalogue:catalogues(pdf_url, title)")
      .single();

    if (process.env.RESEND_API_KEY && request) {
      await resend.emails.send({
        from: "Padmavati <onboarding@resend.dev>",
        to: request.email,
        subject: `Catalogue Approved: ${(request.catalogue as any).title}`,
        html: `<p>Your request to view the catalogue has been approved.</p><p><a href="${(request.catalogue as any).pdf_url}">Click here to view</a></p>`,
      });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRequestsRouter.post("/api/admin/deny-request", requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    await adminSupabase
      .from("access_requests")
      .update({
        status: "denied",
        decided_by: supabaseAnonKey, // mock
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
