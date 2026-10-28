const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
export function getImageUrl(src) {
  if (!src) return "/images/placeholder.svg";
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/images/")) return src;
  const normalized = src.replace(/\\/g, "/").replace(/^\/?/, "/");
  if (normalized.startsWith("/uploads/")) return `${API_BASE}${normalized}`;
  return src;
}
export default getImageUrl;