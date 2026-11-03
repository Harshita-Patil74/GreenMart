import axios from "axios";
import { tokenStorage } from "../utils/tokenStorage";
const instance = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api", withCredentials: true });

let refreshing = false;
let queue = [];

function processQueue(error, token) {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
}

instance.interceptors.request.use((cfg) => {
  const t = tokenStorage.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

instance.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !original.url?.includes("/auth/refresh") && !original.url?.includes("/auth/login")) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve: (t) => { original.headers.Authorization = `Bearer ${t}`; resolve(instance(original)); }, reject });
        });
      }
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post((import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/auth/refresh", {}, { withCredentials: true });
        if (data?.token) { tokenStorage.set(data.token); processQueue(null, data.token); original.headers.Authorization = `Bearer ${data.token}`; return instance(original); }
        throw new Error("refresh failed");
      } catch (e) {
        processQueue(e, null);
        tokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }
    const normalized = {
      message: err.response?.data?.message || err.message || "Request failed",
      status: err.response?.status || 0,
      fieldErrors: err.response?.data?.errors || err.response?.data?.fieldErrors || {},
    };
    return Promise.reject(normalized);
  }
);
export default instance;
