import { SERVER_URL } from "../config/api.js";

// Backend se aane wala image path (/uploads/...) poore URL me badalta hai
export const imgUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_URL}${path}`;
};

export const formatPrice = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "-";

// <input type="date"> ki value (YYYY-MM-DD)
export const dateInput = (d = new Date()) => d.toLocaleDateString("en-CA");