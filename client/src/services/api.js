import axios from "axios";

// One axios instance used everywhere
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

// Before every request, attach the login token if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Pull a friendly message out of an error
export const getError = (err) => err.response?.data?.message || err.message || "Something went wrong";

export default api;
