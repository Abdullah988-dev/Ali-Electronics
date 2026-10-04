import api from "../config/api.js";

export const catalogApi = {
  home: () => api.get("/home").then((r) => r.data),
  categories: () => api.get("/categories").then((r) => r.data),
  brands: (params) => api.get("/brands", { params }).then((r) => r.data),
  products: (params) => api.get("/products", { params }).then((r) => r.data),
  product: (id) => api.get(`/products/${id}`).then((r) => r.data),
};