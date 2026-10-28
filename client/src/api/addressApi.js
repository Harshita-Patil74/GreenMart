import api from "./axiosInstance";

export default {
  list: () => api.get("/addresses"),
  create: (d) => api.post("/addresses", d),
  update: (id, d) => api.put(`/addresses/${id}`, d),
  remove: (id) => api.delete(`/addresses/${id}`),
};