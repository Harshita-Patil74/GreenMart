import api from "./axiosInstance";

export default {
  list: () => api.get("/addresses"),
  create: (d) => api.post("/addresses", d),
  update: (id, d) => api.put(`/addresses/${id}`, d),
  patch: (id, d) => api.patch(`/addresses/${id}`, d),
  setDefault: (id) => api.patch(`/addresses/${id}/default`),
  remove: (id) => api.delete(`/addresses/${id}`),
};