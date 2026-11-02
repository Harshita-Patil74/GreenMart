import api from "./axiosInstance";
export default {
  list: (params = {}) => api.get("/notifications", { params }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  remove: (id) => api.delete(`/notifications/${id}`),
};
