import rateLimit from "express-rate-limit";

const base = { standardHeaders: true, legacyHeaders: false };

// Poori API par: bohat zyada requests rokne ke liye
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: { message: "Bohat zyada requests aa gayi hain, thori der baad try karein" },
});

// Login: password andaze se try karne walon ko rokne ke liye (sirf ghalat koshishein gini jati hain)
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: "Bohat zyada ghalat koshishein. 15 minute baad dobara try karein" },
});

// Naya account banana
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { message: "Bohat zyada accounts banaye ja rahe hain, baad me try karein" },
});

// Order dena: jhoote/spam orders rokne ke liye
export const orderLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 15,
  message: { message: "Ek ghante me bohat zyada orders ho gaye, thori der baad try karein" },
});