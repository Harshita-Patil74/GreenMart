import api from "./axiosInstance";

export default {
  distance: (d) => api.post("/delivery/distance", d),
};
