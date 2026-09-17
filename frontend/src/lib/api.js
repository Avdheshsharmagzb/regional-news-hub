import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("gt_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const mediaUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("/api")) return `${BACKEND_URL}${u}`;
  return u;
};

export const formatApiError = (detail) => {
  if (detail == null) return "कुछ गड़बड़ हुई, कृपया पुनः प्रयास करें।";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
};
