import api from "./axiosInstance";

export default {
  get: () => api.get("/cart"),
  add: (d) => api.post("/cart/items", d),
  update: (id, d) => api.put(`/cart/items/${id}`, d),
  remove: (id) => api.delete(`/cart/items/${id}`),
  clear: () => api.delete("/cart"),
};