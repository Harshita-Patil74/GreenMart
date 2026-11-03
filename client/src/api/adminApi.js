import api from "./axiosInstance";

export default {
  stats: (p) => api.get("/admin/stats", { params: p }),
  users: (params = {}) => api.get("/admin/users", { params }),
  lowStock: () => api.get("/admin/low-stock"),
  sales: () => api.get("/admin/sales"),
  categoriesShare: () => api.get("/admin/categories-share"),
  reports: () => api.get("/admin/reports"),
  reportPdf: (params) => api.get("/admin/reports/pdf", { params, responseType: "blob" }),
  farmers: () => api.get("/admin/farmers"),
  createFarmer: (data) => api.post("/admin/farmers", data),
  resendFarmerActivation: (id) => api.post(`/admin/farmers/${id}/activation`),
  verifyFarmer: (id) => api.patch(`/admin/farmers/${id}/verify`),
  rejectFarmer: (id, reason) => api.patch(`/admin/farmers/${id}/reject`, { reason }),
  requestFarmerChanges: (id, instructions) => api.patch(`/admin/farmers/${id}/request-changes`, { instructions }),
  updateSettings: (data) => api.put("/settings", data),
};