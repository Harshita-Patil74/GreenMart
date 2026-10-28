import api from "./axiosInstance";
export default {
  send: (d) => api.post("/messages", d),
  list: () => api.get("/messages"),
};
