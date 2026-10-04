import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

const api = axios.create({ baseURL: API_URL });

// login token (baad me auth banne par) har request ke saath jaye ga
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ae_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errorMessage = (err) => err?.response?.data?.message || err?.message || "Something went wrong";

export default api;
