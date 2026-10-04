import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { cloudinary, cloudEnabled } from "../config/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../../uploads");

/**
 * Purani image hata do. Dono tarah ki images chalti hain:
 *  - Cloudinary:  https://res.cloudinary.com/.../ali-electronic/products/abc.jpg
 *  - Local:       /uploads/products/abc.jpg
 * Kabhi error nahi deta.
 */
export const removeUpload = async (url) => {
  try {
    if (!url) return;

    if (/^https?:\/\//i.test(url)) {
      const match = url.match(/(ali-electronic\/[^.]+)\.[a-z0-9]+$/i);
      if (match && cloudEnabled) {
        await cloudinary.uploader.destroy(match[1], { resource_type: "image", invalidate: true });
      }
      return;
    }

    if (!url.startsWith("/uploads/")) return;
    const full = path.resolve(__dirname, "../..", url.slice(1));
    if (!full.startsWith(uploadsRoot)) return; // safety: stay inside uploads
    await fs.unlink(full);
  } catch {
    /* ignore */
  }
};