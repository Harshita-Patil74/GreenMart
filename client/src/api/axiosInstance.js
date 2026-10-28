import axios from "axios";
import { tokenStorage } from "../utils/tokenStorage";
const instance = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api" });
instance.interceptors.request.use((cfg) => {
  const t = tokenStorage.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
instance.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) { tokenStorage.clear(); window.location.href = "/login"; }
    const normalized = {
      message: err.response?.data?.message || err.message || "Request failed",
      status: err.response?.status || 0,
      fieldErrors: err.response?.data?.errors || err.response?.data?.fieldErrors || {},
    };
    return Promise.reject(normalized);
  }
);
export default instance;
