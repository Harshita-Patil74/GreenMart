import api from "./axiosInstance";

export default {
  list: () => api.get("/farmers"),
  get: (id) => api.get(`/farmers/${id}`),
  updateLocation: (d) => api.put("/farmers/me/location", d),
  updateMe: (data) => api.put("/farmers/me", data),
  locations: () => api.get("/locations"),
};