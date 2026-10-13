// Tests the REAL client modules (the same files the React pages import) in plain Node.
// It cannot click buttons in a browser; it tests the decisions behind the buttons.
const { test } = require("node:test");
const assert = require("node:assert");
const serverForm = require("../utils/applicationValidation");

const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
const student = { _id: "s1", role: "student" };
const opp = (o = {}) => ({ _id: "o1", title: "T", status: "active", deadline: day(10), applicationLink: "", application: null, ...o });

test("Apply Now: which action each situation triggers", async () => {
  const { getApplyAction } = await import("../../client/src/utils/applyFlow.js");
  const A = (o, user = student) => getApplyAction({ opp: opp(o), user });

  // Case A: valid official URL -> external (new tab after confirmation)
  const ext = A({ applicationLink: "https://careers.somecompany.com/jobs/1" });
  assert.strictEqual(ext.kind, "external");
  assert.strictEqual(ext.host, "careers.somecompany.com");
  assert.strictEqual(ext.url, "https://careers.somecompany.com/jobs/1");

  // Case B: no usable URL -> internal CareerQuest form (button stays active, never "not available")
  for (const link of ["", "   ", undefined, null, "https://example.com/apply/x", "https://www.example.org", "http://localhost:3000/a", "javascript:alert(1)", "ftp://files.x.com/a", "not a url", "https://user@evil.com"]) {
    assert.strictEqual(A({ applicationLink: link }).kind, "internal", `link=${link}`);
  }

  // other states
  assert.strictEqual(A({}, null).kind, "login", "visitor must log in");
  assert.strictEqual(A({}, { _id: "a", role: "admin" }).kind, "not-student");
  assert.deepStrictEqual(A({ application: { _id: "app9", type: "Internal", status: "Applied" } }), { kind: "applied", applicationId: "app9" }, "Already Applied");
  assert.strictEqual(A({ application: { _id: "app9", type: "External", status: "Interested" }, applicationLink: "https://careers.somecompany.com/j" }).kind, "external", "external tracking record does not block applying");
  assert.strictEqual(A({ status: "expired" }).kind, "closed");
  assert.strictEqual(A({ deadline: day(-1) }).kind, "closed");
});

test("official website opens in a NEW tab, only for valid http/https links", async () => {
  const { openOfficialSite } = await import("../../client/src/utils/applyFlow.js");
  const calls = [];
  const win = { open: (...a) => calls.push(a) };

  assert.strictEqual(openOfficialSite("https://careers.somecompany.com/jobs/1", win), true);
  assert.deepStrictEqual(calls[0], ["https://careers.somecompany.com/jobs/1", "_blank", "noopener,noreferrer"]);

  calls.length = 0;
  for (const bad of ["https://example.com/apply", "https://sub.example.org/x", "javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "ftp://x.com/a", "", undefined, "garbage", "http://192.168.0.4/a"]) {
    assert.strictEqual(openOfficialSite(bad, win), false, `blocked: ${bad}`);
  }
  assert.strictEqual(calls.length, 0, "window.open was never called for an invalid link");
});

test("client and server validation agree on the application form", async () => {
  const client = await import("../../client/src/utils/applicationForm.js");
  const ok = { fullName: "Asha Verma", email: "asha@college.edu", phone: "+91 98765 43210", college: "Sample City College", education: "MCA", yearSemester: "Sem 3", city: "Indore", state: "MP", skills: "React, Node.js", linkedin: "", portfolio: "", whyApply: "I want to learn from real projects and grow.", experience: "" };
  const cases = {
    "valid form": ok,
    "empty form": {},
    "bad email": { ...ok, email: "asha@" },
    "short phone": { ...ok, phone: "12345" },
    "letters in phone": { ...ok, phone: "98765abc10" },
    "why too short": { ...ok, whyApply: "too short" },
    "no skills": { ...ok, skills: " , ," },
    "linkedin javascript": { ...ok, linkedin: "javascript:alert(1)" },
    "linkedin wrong site": { ...ok, linkedin: "https://github.com/asha" },
    "linkedin ok": { ...ok, linkedin: "https://www.linkedin.com/in/asha" },
    "portfolio placeholder": { ...ok, portfolio: "https://example.com/me" },
    "portfolio ok": { ...ok, portfolio: "https://github.com/asha" },
    "name too short": { ...ok, fullName: "A" },
    "experience too long": { ...ok, experience: "x".repeat(2001) },
  };
  for (const [name, form] of Object.entries(cases)) {
    const c = Object.keys(client.validateApplicationForm(form)).sort();
    const s = Object.keys(serverForm.validateApplicationForm(form).errors).sort();
    assert.deepStrictEqual(c, s, `client and server disagree for: ${name}`);
  }
  assert.deepStrictEqual(client.validateApplicationForm(ok), {});
  assert.ok(client.validateApplicationForm(cases["linkedin javascript"]).linkedin);
  assert.ok(Object.keys(client.validateApplicationForm({})).length >= 10, "all required fields flagged");
});

test("client-side resume validation (size, type, real PDF bytes)", async () => {
  const { validateResumeFile } = await import("../../client/src/utils/applicationForm.js");
  const pdfBytes = Buffer.from("%PDF-1.4\n" + "x".repeat(900) + "\n%%EOF\n");
  const file = (bytes, name = "cv.pdf", type = "application/pdf") => new File([bytes], name, { type });

  assert.strictEqual(await validateResumeFile(file(pdfBytes)), "", "valid pdf accepted");
  assert.match(await validateResumeFile(null), /required/);
  assert.match(await validateResumeFile(file(Buffer.alloc(0))), /empty/);
  assert.match(await validateResumeFile(file(Buffer.alloc(3 * 1024 * 1024, "a"))), /2 MB/);
  assert.match(await validateResumeFile(file(pdfBytes, "cv.docx")), /\.pdf/);
  assert.match(await validateResumeFile(file(pdfBytes, "cv.pdf", "image/png")), /PDF/);
  assert.match(await validateResumeFile(file(Buffer.from("just text, not a pdf at all " + "y".repeat(200)))), /not a valid PDF/);
});
