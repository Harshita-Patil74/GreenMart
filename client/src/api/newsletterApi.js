import api from "./axiosInstance";

export default {
  preferences: () => api.get("/newsletter/preferences"),
  customerSubscribe: () => api.post("/newsletter/preferences/subscribe"),
  customerUnsubscribe: () => api.post("/newsletter/preferences/unsubscribe"),
  stats: () => api.get("/newsletter/admin/stats"),
  products: (params) => api.get("/newsletter/admin/products", { params }),
  offers: (params) => api.get("/newsletter/admin/offers", { params }),
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
  // Customer newsletter inbox (authenticated customers only)
  customerNewsletters: (params) => api.get("/newsletter/customer/newsletters", { params }),
  customerNewsletter: (id) => api.get(`/newsletter/customer/newsletters/${id}`),
  markNewsletterRead: (id) => api.patch(`/newsletter/customer/newsletters/${id}/read`),
  customerExclusiveOffers: () => api.get("/newsletter/customer/offers"),
};
