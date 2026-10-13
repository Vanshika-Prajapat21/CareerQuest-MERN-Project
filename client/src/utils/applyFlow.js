import { getSafeApplyUrl } from "./url.js";

// Decides what the "Apply Now" button does. Pure function: no React, no network.
export const getApplyAction = ({ opp, user }) => {
  if (opp.application?.type === "Internal") return { kind: "applied", applicationId: opp.application._id };
  if (opp.status === "expired" || new Date(opp.deadline) < new Date()) return { kind: "closed" };
  if (!user) return { kind: "login" };
  if (user.role !== "student") return { kind: "not-student" };

  const url = getSafeApplyUrl(opp.applicationLink);
  if (url) return { kind: "external", url, host: new URL(url).hostname };
  return { kind: "internal" }; // no valid official link -> CareerQuest form
};

// Opens the official website in a NEW tab, only if the link is a real http(s) link.
// `win` is injectable so this can be tested without a browser.
export const openOfficialSite = (rawUrl, win = window) => {
  const url = getSafeApplyUrl(rawUrl);
  if (!url) return false;
  win.open(url, "_blank", "noopener,noreferrer");
  return true;
};
