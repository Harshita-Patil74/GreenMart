import api from "./axiosInstance";

export default {
  quote: () => api.post("/orders/quote"),
  create: (d) => api.post("/orders", d),
  mine: (p = {}) => api.get("/orders/mine", { params: p }),
  farmer: (p = {}) => api.get("/orders/farmer", { params: p }),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, d) => api.patch(`/orders/${id}/status`, d),
  updateLocation: (id, d) => api.patch(`/orders/${id}/location`, d),
  adminAll: (p = {}) => api.get("/orders/admin/all", { params: p }),
  downloadInvoice: (id) => api.get(`/orders/${id}/invoice/download`, { responseType: "blob" }),
};