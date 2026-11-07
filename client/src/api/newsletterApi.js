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
  uploadBanner: (file) => {
    const fd = new FormData();
    fd.append("banner", file);
    return api.post("/newsletter/admin/newsletter-banner/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
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
  // Paid subscription APIs
  subscriptionPlan: () => api.get("/newsletter/subscription/plan"),
  subscriptionMe: () => api.get("/newsletter/subscription/me"),
  subscriptionCheckout: () => api.post("/newsletter/subscription/checkout"),
  subscriptionConfirmPayment: (transactionId) => api.post("/newsletter/subscription/confirm-payment", { transactionId }),
  subscriptionCancel: () => api.post("/newsletter/subscription/cancel"),
  subscriptionPayments: () => api.get("/newsletter/subscription/payments"),
  // Admin subscription management
  adminSubscriptions: (params) => api.get("/newsletter/admin/subscriptions", { params }),
  adminSubscriptionStats: () => api.get("/newsletter/admin/subscriptions/stats"),
  adminPayments: (params) => api.get("/newsletter/admin/payments", { params }),
};
