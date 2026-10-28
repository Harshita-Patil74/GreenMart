import api from "./axiosInstance";
export default { get: () => api.get("/settings") };
