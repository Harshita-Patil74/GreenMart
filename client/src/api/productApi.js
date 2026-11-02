import api from "./axiosInstance";

export default {
  list: (p = {}) => api.get("/products", { params: p }),
  storefront: (p = {}) => api.get("/products/storefront", { params: p }),
  storefrontOffers: () => api.get("/products/storefront/offers"),
  storefrontGet: (id) => api.get(`/products/storefront/${id}`),
  mine: (p = {}) => api.get("/products/mine", { params: p }),
  get: (id) => api.get(`/products/${id}`),
  create: (fd) => api.post("/products", fd),
  update: (id, fd) => api.put(`/products/${id}`, fd),
  remove: (id) => api.delete(`/products/${id}`),
};