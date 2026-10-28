import api from "./axiosInstance";
export default {
  list: (id) => api.get(`/products/${id}/reviews`),
  eligibility: (id) => api.get(`/products/${id}/review-eligibility`),
  create: (id, d) => api.post(`/products/${id}/reviews`, d),
};
