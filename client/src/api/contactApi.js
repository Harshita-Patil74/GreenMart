import api from "./axiosInstance";
export default { send: (d) => api.post("/contact", d) };
