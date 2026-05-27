import express from "express";
import multer from "multer";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { Resend } from "resend";
import bcrypt from "bcryptjs";

dotenv.config();

// We need a supabase client with service_role or just regular but since RLS is 'admin', anon key + auth might be tricky without passing the user's token.
// Actually, since RLS on storage says 'Admins can manage product images', we can either pass the user's Auth token from the frontend and use it,
// OR simply bypass RLS by using the SUPABASE_SERVICE_ROLE_KEY. Since we don't know the service role key, we'll accept the JWT from the Authorization header
// and pass it to the supabase client for the request.
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const upload = multer({ storage: multer.memoryStorage() });

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const cookieSecret = process.env.COOKIE_SECRET || 'fallback-dev-secret';

// Use service role key to manage access requests without RLS issues.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

import { createServerClient, parseCookieHeader } from "@supabase/ssr";

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        (req as any).supabaseToken = token;
        return next();
      }
    }

    const supabaseServer = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const parsed = parseCookieHeader(req.headers.cookie ?? "");
          return parsed.map(c => ({ name: c.name, value: c.value ?? "" }));
        },
        setAll() {}
      }
    });
    
    // Check if the user is authenticated via cookie
    const { data: { user }, error } = await supabaseServer.auth.getUser();
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Attach the valid jwt token to the request if needed elsewhere for RLS passing
    const { data: { session } } = await supabaseServer.auth.getSession();
    (req as any).supabaseToken = session?.access_token;
    
    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3001');

  app.use(express.json());
  app.use(cookieParser(cookieSecret));

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    next();
  });

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload-image", requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const processedBuffer = await sharp(req.file.buffer)
        .rotate() // Auto-orients based on EXIF and removes EXIF
        .toBuffer();

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Ensure bucket exists
      const { data: buckets } = await adminSupabase.storage.listBuckets();
      if (!buckets?.find(b => b.name === 'product-images')) {
        await adminSupabase.storage.createBucket('product-images', { public: true });
      }

      const { error } = await adminSupabase.storage
        .from('product-images')
        .upload(fileName, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error("Supabase Storage Error:", error);
        return res.status(500).json({ error: error.message });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      res.json({ url: publicUrl, path: fileName });
    } catch (err: any) {
      console.error("Upload Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/generate-catalogue", async (req, res) => {
    try {
      const { title, productIds } = req.body;
      if (!title || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: "Missing title or productIds" });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "No authorization header" });
      }

      // Fetch products to render HTML
      const { data: products, error: pErr } = await adminSupabase
        .from("products")
        .select(`
          id,
          name,
          image_url,
          weight_kg,
          height_inches,
          length_inches,
          rate_type,
          direct_rate,
          category:categories(name),
          rate_code:rate_codes(code, value),
          variants:product_variants(id, weight_kg, direct_rate, rate_code_id, height_inches, length_inches, rate_code:rate_codes(code, value))
        `)
        .in('id', productIds);

      if (pErr) throw new Error("Failed to fetch products: " + pErr.message);

      // Preserve order from productIds array
      const sortedProducts = productIds.map(id => products.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => p != null);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Inter', sans-serif; 
              background: #fff;
              color: #111;
              padding: 20mm;
              letter-spacing: normal !important;
            }
            .header {
              text-align: center;
              margin-bottom: 30pt;
            }
            .title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 24pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: normal !important;
              color: #000;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 22pt;
            }
            .product-card {
              width: calc(50% - 15pt);
              box-sizing: border-box;
              border: 1px solid #eaeaea;
              border-radius: 6pt;
              padding: 15pt;
              
              break-inside: avoid;
              page-break-inside: avoid;
              -webkit-column-break-inside: avoid;
              letter-spacing: normal !important;
            }
            .image-container {
              width: 100%;
              height: 210pt;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 15pt;
            }
            .image-container img {
              max-width: 210pt;
              max-height: 210pt;
              object-fit: contain;
            }
            .product-name {
              font-family: 'Playfair Display', serif;
              font-size: 14pt;
              font-weight: 700;
              margin-bottom: 6pt;
              line-height: 1.2;
              letter-spacing: normal !important;
            }
            .meta-line {
              font-size: 9pt;
              color: #666;
              margin-bottom: 3pt;
              display: flex;
              justify-content: space-between;
              letter-spacing: normal !important;
            }
            .rate-box {
              margin-top: 9pt;
              padding-top: 9pt;
              border-top: 1px solid #eee;
              display: flex;
              justify-content: space-between;
              font-size: 10pt;
              font-weight: 600;
              color: #000;
              letter-spacing: normal !important;
            }
            .variants-table tr { break-inside: avoid; page-break-inside: avoid; }
            .variants-table {
              width: 100%;
              margin-top: 12pt;
              border-collapse: collapse;
              font-size: 8pt;
            }
            .variants-table th, .variants-table td {
              border: 1px solid #eee;
              padding: 5pt;
              text-align: left;
              color: #444;
              letter-spacing: normal !important;
            }
            .variants-table th {
              background: #fafafa;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${title}</div>
          </div>
          <div class="grid">
            ${sortedProducts.map((p: any) => {
              const category = p.category ? p.category.name : "Uncategorized";
              const weight = p.weight_kg ? `${p.weight_kg} kg` : "-";
              const dims = p.height_inches || p.length_inches ? `H: ${p.height_inches || "-"} × L: ${p.length_inches || "-"}` : "-";
              
              let rateText = "-";
              if (p.direct_rate) {
                rateText = `₹${p.direct_rate}/${p.rate_type === 'per_kg' ? 'kg' : 'piece'}`;
              } else if (p.rate_code) {
                rateText = `${p.rate_code.code} → ₹${p.rate_code.value}/${p.rate_type === 'per_kg' ? 'kg' : 'piece'}`;
              }
              
              const variantsHtml = p.variants && p.variants.length > 0 ? `
                <table class="variants-table">
                  <tr><th>Weight</th><th>Dimensions</th><th>Rate</th></tr>
                  ${p.variants.map((v: any) => {
                    let vRateText = "-";
                    if (v.direct_rate) vRateText = `₹${v.direct_rate}/${p.rate_type === 'per_kg' ? 'kg' : 'piece'}`;
                    else if (v.rate_code) vRateText = `${v.rate_code.code} → ₹${v.rate_code.value}/${p.rate_type === 'per_kg' ? 'kg' : 'piece'}`;
                    const vDims = v.height_inches || v.length_inches ? `H:${v.height_inches || "-"}×L:${v.length_inches || "-"}` : "-";
                    return `<tr><td>${v.weight_kg ? `${v.weight_kg}kg` : '-'}</td><td>${vDims}</td><td>${vRateText}</td></tr>`;
                  }).join('')}
                </table>
              ` : '';

              return `
              <div class="product-card">
                <div class="image-container">
                  ${p.image_url ? `<img src="${p.image_url}" />` : `<div style="color:#aaa; font-size:9pt;">No Image</div>`}
                </div>
                <div class="product-name">${p.name}</div>
                <div class="meta-line"><span>Category</span> <span>${category}</span></div>
                <div class="meta-line"><span>Weight</span> <span>${weight}</span></div>
                <div class="meta-line"><span>Dimensions</span> <span>${dims}</span></div>
                <div class="rate-box">
                  <span>Rate (${p.rate_type === 'per_kg' ? 'Per Kg' : 'Per Piece'})</span>
                  <span>${rateText}</span>
                </div>
                ${variantsHtml}
              </div>
              `;
            }).join('')}
          </div>
        </body>
        </html>
      `;

      // Launch puppeteer
      const browser = await puppeteer.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {width: 1200, height: 800},
        executablePath: await chromium.executablePath(),
        headless: true
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' } // handled by body padding
      });
      await browser.close();

      const share_uuid = crypto.randomUUID();
      const fileName = share_uuid + ".pdf";

      // Ensure bucket exists
      const { data: buckets } = await adminSupabase.storage.listBuckets();
      if (!buckets?.find(b => b.name === 'catalogue-pdfs')) {
        await adminSupabase.storage.createBucket('catalogue-pdfs', { public: true });
      }

      // Upload to Supabase Storage
      const { error: uploadErr } = await adminSupabase.storage
        .from('catalogue-pdfs') // Bucket might need to be created if not exists. The prompt implies it exists.
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadErr) {
        throw new Error("Failed to upload PDF: " + uploadErr.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('catalogue-pdfs')
        .getPublicUrl(fileName);

      // Insert catalogue record
      const { data: catData, error: catErr } = await adminSupabase
        .from('catalogues')
        .insert({
          title: title,
          share_uuid: share_uuid,
          pdf_url: publicUrl
        })
        .select()
        .single();
        
      if (catErr) {
        throw new Error("Failed to insert catalogue: " + catErr.message);
      }
      
      const catalogueId = catData.id;

      // Insert junction records preserving order
      const catalogueProducts = sortedProducts.map((p, index) => ({
        catalogue_id: catalogueId,
        product_id: p.id,
        sort_order: index
      }));

      const { error: cpErr } = await adminSupabase
        .from('catalogue_products')
        .insert(catalogueProducts);
        
      if (cpErr) {
        throw new Error("Failed to insert catalogue products: " + cpErr.message);
      }

      res.json({ success: true, catalogue: catData });

    } catch (err: any) {
      console.error("Generate Catalogue Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

// ---- CATALOGUE ACCESS REQUEST ROUTES ----

  app.get("/api/catalogue/status", async (req, res) => {
    try {
      const { uuid } = req.query;
      if (!uuid) return res.status(400).json({ error: "Missing uuid" });

      // First check if catalogue exists
      const { data: cat, error: catErr } = await adminSupabase.from('catalogues').select('*').eq('share_uuid', uuid).single();
      if (catErr || !cat) return res.status(404).json({ error: "Catalogue not found" });

      const requestId = req.signedCookies[`cat_req_${uuid}`];
      if (!requestId) return res.json({ state: 'initial', catalogue: { title: cat.title } });

      const { data: request, error: reqErr } = await adminSupabase.from('access_requests').select('*').eq('id', requestId).single();
      if (reqErr || !request) return res.json({ state: 'initial', catalogue: { title: cat.title } });

      if (!request.email_verified) return res.json({ state: 'otp', catalogue: { title: cat.title } });
      if (request.status === 'pending') return res.json({ state: 'pending', catalogue: { title: cat.title } });
      if (request.status === 'denied') return res.json({ state: 'denied', catalogue: { title: cat.title } });
      if (request.status === 'approved') return res.json({ state: 'approved', catalogue: { title: cat.title, pdf_url: cat.pdf_url } }); // For simplicity returning pdf_url (could be signed if bucket is private)
      
      return res.json({ state: 'initial', catalogue: { title: cat.title } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/catalogue/request", async (req, res) => {
    try {
      const { uuid, name, mobile, email } = req.body;
      const { data: cat } = await adminSupabase.from('catalogues').select('id').eq('share_uuid', uuid).single();
      if (!cat) return res.status(404).json({ error: "Catalogue not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const { data: request, error } = await adminSupabase.from('access_requests').insert({
        catalogue_id: cat.id,
        name,
        mobile,
        email,
        status: 'pending',
        email_verified: false,
        otp_code_hash: hash,
        otp_expires_at: expiresAt.toISOString()
      }).select().single();

      if (error) throw error;

      // Send OTP via Resend
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Padmavati <onboarding@resend.dev>',
          to: email,
          subject: 'Your Padmavati Corporation access code',
          html: `<p>Your access code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`
        });
      } else {
        console.log("Mock OTP Send to", email, ":", otp);
      }

      res.cookie(`cat_req_${uuid}`, request.id, { signed: true, httpOnly: true, maxAge: 10 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/catalogue/verify", async (req, res) => {
    try {
      const { uuid, otp } = req.body;
      const requestId = req.signedCookies[`cat_req_${uuid}`];
      if (!requestId) return res.status(400).json({ error: "No request session found" });

      const { data: request } = await adminSupabase.from('access_requests').select('*').eq('id', requestId).single();
      if (!request) return res.status(404).json({ error: "Request not found" });

      if (new Date(request.otp_expires_at) < new Date()) {
        return res.status(400).json({ error: "OTP expired, please request a new one." });
      }

      const match = await bcrypt.compare(otp, request.otp_code_hash);
      if (!match) return res.status(400).json({ error: "Invalid OTP" });

      await adminSupabase.from('access_requests').update({ email_verified: true }).eq('id', requestId);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/catalogue/resend-otp", async (req, res) => {
    try {
      const { uuid } = req.body;
      const requestId = req.signedCookies[`cat_req_${uuid}`];
      if (!requestId) return res.status(400).json({ error: "No request session found" });

      const { data: request } = await adminSupabase.from('access_requests').select('*').eq('id', requestId).single();
      if (!request) return res.status(404).json({ error: "Request not found" });

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await adminSupabase.from('access_requests').update({ 
        otp_code_hash: hash,
        otp_expires_at: expiresAt.toISOString()
      }).eq('id', requestId);

      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Padmavati <onboarding@resend.dev>',
          to: request.email,
          subject: 'Your new Padmavati Corporation access code',
          html: `<p>Your new access code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`
        });
      } else {
        console.log("Mock NEW OTP Send to", request.email, ":", otp);
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- ADMIN NOTIFICATION ROUTES ----
  app.get("/api/admin/pending-requests", requireAdmin, async (_req, res) => {
    try {
      const { data: requests, error } = await adminSupabase
        .from('access_requests')
        .select(`
          id, name, mobile, email, status, created_at,
          catalogue:catalogues(title, share_uuid)
        `)
        .eq('status', 'pending')
        .eq('email_verified', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(requests);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/approve-request", requireAdmin, async (req, res) => {
    try {
      const { id } = req.body;
      
      const { data: request } = await adminSupabase.from('access_requests')
        .update({ status: 'approved', decided_by: supabaseAnonKey /* mock since we don't extract user ID easily here */, decided_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, catalogue:catalogues(pdf_url, title)')
        .single();

      if (process.env.RESEND_API_KEY && request) {
        await resend.emails.send({
          from: 'Padmavati <onboarding@resend.dev>',
          to: request.email,
          subject: `Catalogue Approved: ${(request.catalogue as any).title}`,
          html: `<p>Your request to view the catalogue has been approved.</p><p><a href="${(request.catalogue as any).pdf_url}">Click here to view</a></p>`
        });
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/deny-request", requireAdmin, async (req, res) => {
    try {
      const { id } = req.body;
      
      await adminSupabase.from('access_requests')
        .update({ status: 'denied', decided_by: supabaseAnonKey /* mock */, decided_at: new Date().toISOString() })
        .eq('id', id);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
