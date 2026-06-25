import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { supabase, adminSupabase } from "../lib/supabase";
import { requireAdmin } from "../middleware/requireAdmin";

const upload = multer({ storage: multer.memoryStorage() });

export const uploadImageRouter = Router();

uploadImageRouter.post(
  "/api/upload-image",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const processedBuffer = await sharp(req.file.buffer)
        .rotate() // Auto-orients based on EXIF and removes EXIF
        .toBuffer();

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { data: buckets } = await adminSupabase.storage.listBuckets();
      if (!buckets?.find((b) => b.name === "product-images")) {
        await adminSupabase.storage.createBucket("product-images", { public: true });
      }

      const { error } = await adminSupabase.storage
        .from("product-images")
        .upload(fileName, processedBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.error("Supabase Storage Error:", error);
        return res.status(500).json({ error: error.message });
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      res.json({ url: publicUrl, path: fileName });
    } catch (err: any) {
      console.error("Upload Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
);
