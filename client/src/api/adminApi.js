import api from "./axiosInstance";

export default {
  stats: (p) => api.get("/admin/stats", { params: p }),
  users: () => api.get("/admin/users"),
  lowStock: () => api.get("/admin/low-stock"),
  sales: () => api.get("/admin/sales"),
  categoriesShare: () => api.get("/admin/categories-share"),
  reports: () => api.get("/admin/reports"),
  reportPdf: (params) => api.get("/admin/reports/pdf", { params, responseType: "blob" }),
  updateUser: (id, d) => api.patch(`/admin/users/${id}`, d),
  verifyFarmer: (id) => api.patch(`/admin/farmers/${id}/verify`),
  rejectFarmer: (id, reason) => api.patch(`/admin/farmers/${id}/reject`, { reason }),
  updateSettings: (data) => api.put("/settings", data),
};