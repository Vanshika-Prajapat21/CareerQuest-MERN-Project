// Decides whether an application link is safe and real enough to open.
// Keep this file in sync with client/src/utils/url.js (same rules on both sides).

// Domains reserved for documentation/testing: they can never be a real application page
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
  if (url.protocol !== "http:" && url.protocol !== "https:") return null; // blocks javascript:, data:, file:, ftp: ...
  if (url.username || url.password) return null;                          // blocks https://trusted.com@evil.com tricks
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host.includes(".") && host !== "localhost") return null;           // "http://apply" is not a real site
  return url;
};

const isPlaceholderHost = (host) =>
  PLACEHOLDER_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) ||
  PLACEHOLDER_SUFFIXES.some((s) => host.endsWith(s)) ||
  /^(127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(host); // private / local addresses

// "valid" | "placeholder" | "invalid" | "missing"
const getLinkStatus = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return "missing";
  const url = parseHttpUrl(value);
  if (!url) return "invalid";
  if (isPlaceholderHost(url.hostname.replace(/\.$/, "").toLowerCase())) return "placeholder";
  return "valid";
};

// The URL to open, or "" when there is no safe link
const getSafeApplyUrl = (value) => (getLinkStatus(value) === "valid" ? parseHttpUrl(value).href : "");

// Used on API output so even old bad records in the database can never reach the Apply button
const withSafeLink = (opp) => {
  const safe = getSafeApplyUrl(opp.applicationLink);
  return { ...opp, applicationLink: safe, hasApplyLink: Boolean(safe) };
};

module.exports = { getLinkStatus, getSafeApplyUrl, withSafeLink };
