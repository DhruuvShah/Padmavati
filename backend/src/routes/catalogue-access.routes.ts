import { Router } from "express";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { adminSupabase } from "../lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
const OTP_TTL_MINUTES = 10;
const REQUEST_COOKIE_MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(to: string, otp: string, subject: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("Mock OTP Send to", to, ":", otp);
    return;
  }
  await resend.emails.send({
    from: "Padmavati <onboarding@resend.dev>",
    to,
    subject,
    html: `<p>Your access code is <strong>${otp}</strong>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
  });
}

export const catalogueAccessRouter = Router();

catalogueAccessRouter.get("/api/catalogue/status", async (req, res) => {
  try {
    const { uuid } = req.query;
    if (!uuid) return res.status(400).json({ error: "Missing uuid" });

    const { data: cat, error: catErr } = await adminSupabase
      .from("catalogues")
      .select("*")
      .eq("share_uuid", uuid)
      .single();
    if (catErr || !cat) return res.status(404).json({ error: "Catalogue not found" });

    const requestId = req.signedCookies[`cat_req_${uuid}`];
    if (!requestId) return res.json({ state: "initial", catalogue: { title: cat.title } });

    const { data: request, error: reqErr } = await adminSupabase
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (reqErr || !request) return res.json({ state: "initial", catalogue: { title: cat.title } });

    if (!request.email_verified) return res.json({ state: "otp", catalogue: { title: cat.title } });
    if (request.status === "pending") return res.json({ state: "pending", catalogue: { title: cat.title } });
    if (request.status === "denied") return res.json({ state: "denied", catalogue: { title: cat.title } });
    if (request.status === "approved") {
      return res.json({ state: "approved", catalogue: { title: cat.title, pdf_url: cat.pdf_url } });
    }

    return res.json({ state: "initial", catalogue: { title: cat.title } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

catalogueAccessRouter.post("/api/catalogue/request", async (req, res) => {
  try {
    const { uuid, name, mobile, email } = req.body;
    const { data: cat } = await adminSupabase.from("catalogues").select("id").eq("share_uuid", uuid).single();
    if (!cat) return res.status(404).json({ error: "Catalogue not found" });

    const otp = generateOtp();
    const hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);

    const { data: request, error } = await adminSupabase
      .from("access_requests")
      .insert({
        catalogue_id: cat.id,
        name,
        mobile,
        email,
        status: "pending",
        email_verified: false,
        otp_code_hash: hash,
        otp_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await sendOtpEmail(email, otp, "Your Padmavati Corporation access code");

    res.cookie(`cat_req_${uuid}`, request.id, {
      signed: true,
      httpOnly: true,
      maxAge: REQUEST_COOKIE_MAX_AGE_MS,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

catalogueAccessRouter.post("/api/catalogue/verify", async (req, res) => {
  try {
    const { uuid, otp } = req.body;
    const requestId = req.signedCookies[`cat_req_${uuid}`];
    if (!requestId) return res.status(400).json({ error: "No request session found" });

    const { data: request } = await adminSupabase.from("access_requests").select("*").eq("id", requestId).single();
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (new Date(request.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: "OTP expired, please request a new one." });
    }

    const match = await bcrypt.compare(otp, request.otp_code_hash);
    if (!match) return res.status(400).json({ error: "Invalid OTP" });

    await adminSupabase.from("access_requests").update({ email_verified: true }).eq("id", requestId);

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

catalogueAccessRouter.post("/api/catalogue/resend-otp", async (req, res) => {
  try {
    const { uuid } = req.body;
    const requestId = req.signedCookies[`cat_req_${uuid}`];
    if (!requestId) return res.status(400).json({ error: "No request session found" });

    const { data: request } = await adminSupabase.from("access_requests").select("*").eq("id", requestId).single();
    if (!request) return res.status(404).json({ error: "Request not found" });

    const otp = generateOtp();
    const hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);

    await adminSupabase
      .from("access_requests")
      .update({ otp_code_hash: hash, otp_expires_at: expiresAt.toISOString() })
      .eq("id", requestId);

    await sendOtpEmail(request.email, otp, "Your new Padmavati Corporation access code");

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
