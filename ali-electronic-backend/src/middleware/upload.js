import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { ApiError } from "../utils/apiError.js";
import { removeUpload } from "../utils/files.js";
import { cloudinary, cloudEnabled } from "../config/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../../uploads");

// Extension file ke naam se nahi, sirf image ki kisam se lagti hai (.php, .html wagera nahi chal sakte)
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

// File ke asli shuru ke bytes dekh kar pehchanta hai ke wo sach me image hai
const looksLikeImage = (buf) => {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = buf.subarray(0, 4).toString("ascii") === "GIF8";
  const isWebp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return isJpeg || isPng || isGif || isWebp;
};

const fileFilter = (req, file, cb) => {
  if (EXT[file.mimetype]) cb(null, true);
  else cb(new ApiError(400, "Sirf JPG, PNG, WEBP ya GIF images allowed hain"));
};

const sendToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `ali-electronic/${folder}`, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// Ek file ko check karke Cloudinary (ya local folder) me rakhta hai, file.storedUrl me final link/path
const processFile = async (file, folder) => {
  if (!looksLikeImage(file.buffer)) throw new ApiError(400, "Ye file asli image nahi hai");

  if (cloudEnabled) {
    const result = await sendToCloudinary(file.buffer, folder);
    // f_auto,q_auto: chhoti file aur behtar format (Cloudinary ke credits bhi kam lagte hain)
    file.storedUrl = result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
  } else {
    const dir = path.join(uploadsRoot, folder);
    await fs.promises.mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${EXT[file.mimetype]}`;
    await fs.promises.writeFile(path.join(dir, name), file.buffer);
    file.storedUrl = `/uploads/${folder}/${name}`;
  }
  file.buffer = undefined; // memory khali karo
};

const limits = (maxFiles) => ({ fileSize: 5 * 1024 * 1024, files: maxFiles });

/** Ek image (form field name: "image"). Categories aur brands ke liye. */
export const uploadImage = (folder) => {
  const single = multer({ storage: multer.memoryStorage(), fileFilter, limits: limits(1) }).single("image");

  return (req, res, next) => {
    single(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (req.file) await processFile(req.file, folder);
        next();
      } catch (e) {
        next(e);
      }
    });
  };
};

/** Kai images (form field name: "images"). Products ke liye. */
export const uploadImages = (folder, maxCount = 6) => {
  const many = multer({ storage: multer.memoryStorage(), fileFilter, limits: limits(maxCount) }).array("images", maxCount);

  return (req, res, next) => {
    many(req, res, async (err) => {
      if (err) return next(err);

      const done = [];
      try {
        for (const file of req.files || []) {
          await processFile(file, folder);
          done.push(file.storedUrl);
        }
        next();
      } catch (e) {
        await Promise.all(done.map((url) => removeUpload(url))); // adhoori upload hata do
        next(e);
      }
    });
  };
};

export const uploadedPath = (folder, file) => (file ? file.storedUrl : undefined);