import api from "../config/api.js";

export const orderApi = {
  place: (payload) => api.post("/orders", payload).then((r) => r.data),
  mine: () => api.get("/orders/mine").then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  cancel: (id) => api.put(`/orders/${id}/cancel`).then((r) => r.data),
};