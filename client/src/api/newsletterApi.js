import api from "./axiosInstance";

export default {
  subscribe: (email) => api.post("/newsletter/subscribe", { email }),
  unsubscribe: (email) => api.post("/newsletter/unsubscribe", { email }),
  unsubscribeByToken: (token) => api.get("/newsletter/unsubscribe/confirm", { params: { token } }),
  stats: () => api.get("/newsletter/admin/stats"),
  subscribers: (params) => api.get("/newsletter/admin/subscribers", { params }),
  unsubscribeSubscriber: (id) => api.post(`/newsletter/admin/subscribers/${id}/unsubscribe`),
  reactivateSubscriber: (id) => api.post(`/newsletter/admin/subscribers/${id}/reactivate`),
  campaigns: () => api.get("/newsletter/admin/campaigns"),
  campaign: (id) => api.get(`/newsletter/admin/campaigns/${id}`),
  createCampaign: (data) => api.post("/newsletter/admin/campaigns", data),
  updateCampaign: (id, data) => api.put(`/newsletter/admin/campaigns/${id}`, data),
  duplicateCampaign: (id) => api.post(`/newsletter/admin/campaigns/${id}/duplicate`),
  sendTest: (id, email) => api.post(`/newsletter/admin/campaigns/${id}/test`, { email }),
  sendCampaign: (id) => api.post(`/newsletter/admin/campaigns/${id}/send`),
  cancelCampaign: (id) => api.post(`/newsletter/admin/campaigns/${id}/cancel`),
  recipients: (id) => api.get(`/newsletter/admin/campaigns/${id}/recipients`),
};
