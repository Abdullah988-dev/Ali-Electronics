import api from "../config/api.js";

// Object ko FormData me badalta hai (image upload ke liye).
// undefined = bhejna nahi, null = khali value, "image" = ek file, "images" = kai files, array = JSON.
const toFormData = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "image") {
      if (value) fd.append("image", value);
      return;
    }
    if (key === "images") {
      (value || []).forEach((file) => fd.append("images", file));
      return;
    }
    if (Array.isArray(value)) {
      fd.append(key, JSON.stringify(value));
      return;
    }
    fd.append(key, value === null ? "" : value);
  });
  return fd;
};

const save = (path, id, data) =>
  (id ? api.put(`${path}/${id}`, toFormData(data)) : api.post(path, toFormData(data))).then((r) => r.data);

export const adminApi = {
  // Dashboard
  summary: () => api.get("/admin/summary").then((r) => r.data),

  // Categories
  listCategories: () => api.get("/admin/categories").then((r) => r.data),
  saveCategory: (id, data) => save("/admin/categories", id, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`).then((r) => r.data),

  // Brands
  listBrands: (params) => api.get("/admin/brands", { params }).then((r) => r.data),
  saveBrand: (id, data) => save("/admin/brands", id, data),
  deleteBrand: (id) => api.delete(`/admin/brands/${id}`).then((r) => r.data),

  // Products
  listProducts: (params) => api.get("/admin/products", { params }).then((r) => r.data),
  getProduct: (id) => api.get(`/admin/products/${id}`).then((r) => r.data),
  saveProduct: (id, data) => save("/admin/products", id, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`).then((r) => r.data),

  // Orders
  listOrders: (params) => api.get("/admin/orders", { params }).then((r) => r.data),
  getOrder: (id) => api.get(`/admin/orders/${id}`).then((r) => r.data),
  setOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }).then((r) => r.data),

  // Users (customers, staff, admin)
  listUsers: (params) => api.get("/admin/users", { params }).then((r) => r.data),
  createUser: (payload) => api.post("/admin/users", payload).then((r) => r.data),
  updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload).then((r) => r.data),
};