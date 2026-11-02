import api from "./axiosInstance";

export default {
  list: (params = {}) => api.get("/farmers/offers", { params }),
  stats: () => api.get("/farmers/offers/stats"),
  eligibleProducts: () => api.get("/farmers/offers/eligible-products"),
  get: (id) => api.get(`/farmers/offers/${id}`),
  create: (data) => api.post("/farmers/offers", data),
  update: (id, data) => api.patch(`/farmers/offers/${id}`, data),
  deactivate: (id) => api.patch(`/farmers/offers/${id}/deactivate`),
};
