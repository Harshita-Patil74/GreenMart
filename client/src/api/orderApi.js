import api from "./axiosInstance";

export default {
  create: (d) => api.post("/orders", d),
  mine: () => api.get("/orders/mine"),
  farmer: () => api.get("/orders/farmer"),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, d) => api.patch(`/orders/${id}/status`, d),
  updateLocation: (id, d) => api.patch(`/orders/${id}/location`, d),
  adminAll: () => api.get("/orders/admin/all"),
};