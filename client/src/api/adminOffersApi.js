import api from "./axiosInstance";

export default {
  options: () => api.get("/admin/offers/options"),
  list: (params = {}) => api.get("/admin/offers", { params }),
  get: (id) => api.get(`/admin/offers/${id}`),
  approve: (id) => api.patch(`/admin/offers/${id}/approve`),
  reject: (id, reason) => api.patch(`/admin/offers/${id}/reject`, { reason }),
  deactivate: (id) => api.patch(`/admin/offers/${id}/deactivate`),
};
