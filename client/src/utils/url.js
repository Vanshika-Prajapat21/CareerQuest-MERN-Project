// Same rules as server/utils/url.js. The button checks the link again right before opening it.
const PLACEHOLDER_DOMAINS = [
  "example.com", "example.org", "example.net", "example.edu",
  "yourdomain.com", "yourwebsite.com", "domain.com", "website.com", "test.com", "localhost",
];
const PLACEHOLDER_SUFFIXES = [".example", ".test", ".invalid", ".localhost"];

const parseHttpUrl = (value) => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || /\s/.test(text)) return null;
  let url;
  try { url = new URL(text); } catch (e) { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null; // only http/https
  if (url.username || url.password) return null;
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host.includes(".") && host !== "localhost") return null;
  return url;
};

const isPlaceholderHost = (host) =>
  PLACEHOLDER_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) ||
  PLACEHOLDER_SUFFIXES.some((s) => host.endsWith(s)) ||
  /^(127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(host);

// "valid" | "placeholder" | "invalid" | "missing"
export const getLinkStatus = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return "missing";
  const url = parseHttpUrl(value);
  if (!url) return "invalid";
  if (isPlaceholderHost(url.hostname.replace(/\.$/, "").toLowerCase())) return "placeholder";
  return "valid";
};

// The URL that is safe to open, or "" when there is none
export const getSafeApplyUrl = (value) => (getLinkStatus(value) === "valid" ? parseHttpUrl(value).href : "");
