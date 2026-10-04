import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const { cloudName, apiKey, apiSecret } = env.cloudinary;

// Teeno keys .env me hon to tasveerein Cloudinary par jayengi, warna local uploads folder me
export const cloudEnabled = Boolean(cloudName && apiKey && apiSecret);

if (cloudEnabled) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export { cloudinary };