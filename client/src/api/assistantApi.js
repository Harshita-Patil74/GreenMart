import api from "./axiosInstance";
export default { chat: (d) => api.post("/assistant/chat", d) };
