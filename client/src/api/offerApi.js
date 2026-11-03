import api from "./axiosInstance";

export default {
  list: () => api.get("/offers/customer"),
};
