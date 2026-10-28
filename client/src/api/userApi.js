import api from "./axiosInstance";
export default { updateMe: (data) => api.patch("/users/me", data) };
