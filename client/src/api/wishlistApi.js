import api from "./axiosInstance";
export default { get: () => api.get("/wishlist"), toggle: (d) => api.post("/wishlist/toggle", d) };
