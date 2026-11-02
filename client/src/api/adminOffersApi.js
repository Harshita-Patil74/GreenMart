import api from "./axiosInstance";

export default {
  options: () => api.get("/admin/offers/options"),
  farmers: () => api.get("/admin/offers/farmers"),
  eligibleProducts: (farmerId) => api.get("/admin/offers/eligible-products", { params: { farmerId } }),
  list: (params = {}) => api.get("/admin/offers", { params }),
  get: (id) => api.get(`/admin/offers/${id}`),
  create: (data) => api.post("/admin/offers", data),
  update: (id, data) => api.patch(`/admin/offers/${id}`, data),
  approve: (id) => api.patch(`/admin/offers/${id}/approve`),
  reject: (id, reason) => api.patch(`/admin/offers/${id}/reject`, { reason }),
  deactivate: (id) => api.patch(`/admin/offers/${id}/deactivate`),
};
