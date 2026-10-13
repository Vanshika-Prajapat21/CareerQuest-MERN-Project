import api from "./api";

export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const opportunityApi = {
  list: (params) => api.get("/opportunities", { params }),
  get: (id) => api.get(`/opportunities/${id}`),
  meta: () => api.get("/opportunities/meta/filters"),
  create: (data) => api.post("/opportunities", data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  remove: (id) => api.delete(`/opportunities/${id}`),
  expire: (id) => api.put(`/opportunities/${id}/expire`),
  report: (id, reason) => api.post(`/opportunities/${id}/report`, { reason }),
};

export const userApi = {
  profile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
  changePassword: (data) => api.put("/users/password", data),
  dashboard: () => api.get("/users/dashboard"),
};

export const savedApi = {
  list: () => api.get("/saved"),
  save: (id) => api.post(`/saved/${id}`),
  unsave: (id) => api.delete(`/saved/${id}`),
};

export const applicationApi = {
  list: () => api.get("/applications"),
  get: (id) => api.get(`/applications/${id}`),
  // tracking an application made on an official website (never "submits" anything)
  apply: (opportunityId, status, keepExisting = false) => api.post(`/applications/${opportunityId}`, { status, keepExisting }),
  // internal CareerQuest form (multipart: fields + resume PDF)
  submitInternal: (opportunityId, formData) => api.post(`/applications/${opportunityId}/internal`, formData),
  resume: (id) => api.get(`/applications/${id}/resume`, { responseType: "blob" }),
  update: (id, status) => api.put(`/applications/${id}`, { status }),
  remove: (id) => api.delete(`/applications/${id}`),
};

export const recommendationApi = { list: (params) => api.get("/recommendations", { params }) };

export const notificationApi = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
};

export const categoryApi = {
  list: () => api.get("/categories"),
  create: (data) => api.post("/categories", data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const adminApi = {
  stats: () => api.get("/admin/stats"),
  users: () => api.get("/admin/users"),
  updateRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  reports: () => api.get("/admin/reports"),
  resolveReport: (id) => api.put(`/admin/reports/${id}`),
  deleteReport: (id) => api.delete(`/admin/reports/${id}`),
  applications: (params) => api.get("/admin/applications", { params }),
  application: (id) => api.get(`/admin/applications/${id}`),
  updateApplicationStatus: (id, status) => api.put(`/admin/applications/${id}/status`, { status }),
  applicationResume: (id) => api.get(`/admin/applications/${id}/resume`, { responseType: "blob" }),
};
