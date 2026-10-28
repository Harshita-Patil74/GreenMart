import api from "./axiosInstance";
export const authApi = {
  register: (d) => api.post("/auth/register", d),
  login: (d) => api.post("/auth/login", d),
  me: () => api.get("/auth/me"),
  forgotPassword: (d) => api.post("/auth/forgot-password", d),
  resetPassword: (d) => api.post("/auth/reset-password", d),
};
export default authApi;
