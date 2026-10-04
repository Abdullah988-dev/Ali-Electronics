import api from "../config/api.js";

export const mgmtApi = {
  meta: () => api.get("/management/meta").then((r) => r.data),
  summary: () => api.get("/management/summary").then((r) => r.data),
  inventory: (params) => api.get("/management/inventory", { params }).then((r) => r.data),

  stockIn: (params) => api.get("/management/stock-in", { params }).then((r) => r.data),
  addStockIn: (payload) => api.post("/management/stock-in", payload).then((r) => r.data),

  stockOut: (params) => api.get("/management/stock-out", { params }).then((r) => r.data),
  addStockOut: (payload) => api.post("/management/stock-out", payload).then((r) => r.data),

  suppliers: () => api.get("/management/suppliers").then((r) => r.data),
  saveSupplier: (id, payload) =>
    (id ? api.put(`/management/suppliers/${id}`, payload) : api.post("/management/suppliers", payload)).then(
      (r) => r.data
    ),
  deleteSupplier: (id) => api.delete(`/management/suppliers/${id}`).then((r) => r.data),

  report: (params) => api.get("/management/reports", { params }).then((r) => r.data),
};