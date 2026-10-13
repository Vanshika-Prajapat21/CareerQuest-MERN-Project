// Run with: npm test  (no database, browser or network needed)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "cq-resumes-"));
const db = require("./helpers/fakeDb"); // must load first: installs the fakes
const ctrl = require("../controllers/applicationController");
const oppCtrl = require("../controllers/opportunityController");
const auth = require("../middleware/auth");
const { validateApplicationForm, validateResumeFile } = require("../utils/applicationValidation");

const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
const files = () => fs.readdirSync(process.env.UPLOAD_DIR);
const UUID_PDF = /^[a-f0-9-]{36}\.pdf$/;

let s1, s2, admin, noLink, official, legacy, expired;

beforeEach(async () => {
  db.reset();
  files().forEach((f) => fs.unlinkSync(path.join(process.env.UPLOAD_DIR, f)));
  s1 = await db.add("User", { name: "Asha", email: "asha@test.dev", role: "student", password: "HASH" });
  s2 = await db.add("User", { name: "Ravi", email: "ravi@test.dev", role: "student", password: "HASH" });
  admin = await db.add("User", { name: "Admin", email: "admin@test.dev", role: "admin", password: "HASH" });
  const base = { description: "d", type: "Internship", organization: "Org", status: "active", deadline: day(20), skills: [] };
  noLink = await db.add("Opportunity", { ...base, title: "No Link Internship", applicationLink: "" });
  // test fixture only: a syntactically valid official-looking URL (never used in seed data)
  official = await db.add("Opportunity", { ...base, title: "Official Site Job", applicationLink: "https://careers.somecompany.com/jobs/1" });
  legacy = await db.add("Opportunity", { ...base, title: "Legacy Placeholder", applicationLink: "https://example.com/apply/x" });
  expired = await db.add("Opportunity", { ...base, title: "Old One", applicationLink: "", status: "expired", deadline: day(-3) });
});

const body = (o = {}) => ({
  fullName: "Asha Verma", email: "asha@college.edu", phone: "+91 98765 43210", college: "Sample City College",
  education: "MCA", yearSemester: "2nd year / Sem 3", city: "Indore", state: "Madhya Pradesh", skills: "React, Node.js",
  linkedin: "", portfolio: "", whyApply: "I want to learn from real projects and grow my skills.", experience: "Built a MERN project", ...o,
});
const pdf = (o = {}) => { const buffer = o.buffer || db.makePdf(); return { buffer, originalname: "asha-resume.pdf", mimetype: "application/pdf", size: buffer.length, ...o }; };
const req = (user, extra = {}) => ({ user, body: {}, params: {}, query: {}, headers: {}, ...extra });
const submit = (user, opp, o = {}) => db.runHandler(ctrl.submitInternalApplication, req(user, { params: { opportunityId: opp._id }, body: body(o.body), file: "file" in o ? o.file : pdf(), ...o.extra }));

/* ---------------- 1. successful internal submission ---------------- */
test("internal application is saved, userId comes from the login (not the body), resume stored safely", async () => {
  const res = await submit(s1, noLink, { body: { userId: s2._id, status: "Selected", type: "External", role: "admin" } });
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(db.store.Application.length, 1);
  const saved = db.store.Application[0];
  assert.strictEqual(saved.userId, s1._id, "owner is the authenticated student");
  assert.strictEqual(saved.opportunityId, noLink._id);
  assert.strictEqual(saved.type, "Internal");
  assert.strictEqual(saved.status, "Applied", "body.status = Selected must be ignored");
  assert.strictEqual(saved.applicant.email, "asha@college.edu");
  assert.deepStrictEqual(saved.applicant.skills, ["React", "Node.js"]);
  assert.match(saved.resume.storedName, UUID_PDF, "random server file name, not the student's file name");
  assert.ok(saved.appliedAt, "submission date stored");
  assert.ok(fs.readFileSync(path.join(process.env.UPLOAD_DIR, saved.resume.storedName)).equals(db.makePdf()), "file bytes saved");
  assert.strictEqual(res.body.application.resume.storedName, undefined, "server file name never sent to the browser");
  assert.strictEqual(db.store.Notification.length, 1);
  assert.strictEqual(db.store.Notification[0].userId, s1._id);
});

/* ---------------- 2. duplicates ---------------- */
test("duplicate application is blocked (409), no second record, no extra file", async () => {
  const first = await submit(s1, noLink);
  const second = await submit(s1, noLink);
  assert.strictEqual(first.statusCode, 201);
  assert.strictEqual(second.statusCode, 409);
  assert.strictEqual(second.body.applicationId, db.store.Application[0]._id, "tells the student where their existing application is");
  assert.strictEqual(db.store.Application.length, 1);
  assert.strictEqual(files().length, 1);
  assert.strictEqual((await submit(s2, noLink)).statusCode, 201, "a different student can still apply");
});

test("double-click race: DB unique index error is reported as 409 and the file is cleaned up", async () => {
  await submit(s1, noLink);
  const realFindOne = db.Models.Application.findOne;
  db.Models.Application.findOne = () => ({ then: (r) => Promise.resolve(null).then(r) }); // duplicate check "misses" once
  const res = await submit(s1, noLink);
  db.Models.Application.findOne = realFindOne;
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(db.store.Application.length, 1);
  assert.strictEqual(files().length, 1, "the file saved for the losing request was deleted");
});

/* ---------------- 3. backend validation ---------------- */
test("required fields are validated on the server, nothing is saved", async () => {
  const res = await db.runHandler(ctrl.submitInternalApplication, req(s1, { params: { opportunityId: noLink._id }, body: {}, file: pdf() }));
  assert.strictEqual(res.statusCode, 400);
  ["fullName", "email", "phone", "college", "education", "yearSemester", "city", "state", "skills", "whyApply"].forEach((f) => assert.ok(res.body.errors[f], `error for ${f}`));
  assert.strictEqual(res.body.errors.linkedin, undefined, "optional fields are not required");
  assert.strictEqual(db.store.Application.length, 0);
  assert.strictEqual(files().length, 0);
});

test("object values in the body (NoSQL injection attempt) are rejected as invalid", async () => {
  const res = await submit(s1, noLink, { body: { fullName: { $gt: "" }, email: { $ne: null } } });
  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.body.errors.fullName && res.body.errors.email);
});

test("invalid LinkedIn / portfolio URLs are rejected; valid ones accepted", async () => {
  const bad = [
    ["linkedin", "javascript:alert(1)"], ["linkedin", "https://example.com/in/me"], ["linkedin", "https://github.com/asha"],
    ["linkedin", "www.linkedin.com/in/asha"], ["portfolio", "https://example.org/me"], ["portfolio", "ftp://files.me.dev/x"], ["portfolio", "not a url"],
  ];
  for (const [field, value] of bad) {
    const res = await submit(s1, noLink, { body: { [field]: value } });
    assert.strictEqual(res.statusCode, 400, `${field}=${value}`);
    assert.ok(res.body.errors[field], `error on ${field} for ${value}`);
  }
  const ok = await submit(s1, noLink, { body: { linkedin: "https://www.linkedin.com/in/asha-verma", portfolio: "https://github.com/asha-verma" } });
  assert.strictEqual(ok.statusCode, 201);
});

/* ---------------- 4. resume validation ---------------- */
test("resume validation (size, type, real PDF bytes) on the server", async () => {
  const cases = [
    ["missing file", undefined, /required/],
    ["empty file", pdf({ buffer: Buffer.alloc(0) }), /empty/],
    ["not a pdf (text renamed to .pdf)", pdf({ buffer: Buffer.from("hello, this is just text pretending to be a resume document, padded padded padded padded padded padded") }), /not a valid PDF/],
    ["wrong extension", pdf({ originalname: "resume.docx" }), /\.pdf/],
    ["wrong mime type", pdf({ mimetype: "text/plain" }), /PDF/],
    ["too large (3 MB)", pdf({ buffer: db.makePdf(3 * 1024 * 1024) }), /2 MB/],
    ["truncated pdf (no %%EOF)", pdf({ buffer: Buffer.from("%PDF-1.4\n" + "x".repeat(300)) }), /incomplete|corrupted/],
    ["script disguised as pdf", pdf({ buffer: Buffer.from("<script>alert(1)</script>" + " ".repeat(200)) }), /not a valid PDF/],
  ];
  for (const [name, file, pattern] of cases) {
    assert.match(validateResumeFile(file) || "", pattern, name);
    const res = await submit(s1, noLink, { file });
    assert.strictEqual(res.statusCode, 400, name);
    assert.match(res.body.errors.resume, pattern, `${name} via the API`);
  }
  assert.strictEqual(db.store.Application.length, 0);
  assert.strictEqual(files().length, 0, "no rejected file was written to disk");
  assert.strictEqual(validateResumeFile(pdf()), null, "a real PDF passes");
});

/* ---------------- 5. which opportunities accept internal applications ---------------- */
test("internal form only for opportunities without a valid official link and still open", async () => {
  const withLink = await submit(s1, official);
  assert.strictEqual(withLink.statusCode, 400);
  assert.match(withLink.body.message, /official website/);
  assert.strictEqual((await submit(s1, expired)).statusCode, 400);
  assert.strictEqual((await submit(s1, { _id: "does-not-exist" })).statusCode, 404);
  assert.strictEqual((await submit(s1, legacy)).statusCode, 201, "an old placeholder link counts as 'no link'");
});

test("a student who was only tracking the opportunity is upgraded, not duplicated", async () => {
  await db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: noLink._id }, body: { status: "Interested" } }));
  const res = await submit(s1, noLink);
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(db.store.Application.length, 1);
  assert.strictEqual(db.store.Application[0].type, "Internal");
  assert.strictEqual(db.store.Application[0].status, "Applied");
});

/* ---------------- 6. external tracking never auto-submits ---------------- */
test("external tracking: opening the site records Interested only and never downgrades or overwrites", async () => {
  const open = (o) => db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: official._id }, body: o }));
  const first = await open({ status: "Interested", keepExisting: true });
  assert.strictEqual(first.statusCode, 201);
  assert.strictEqual(db.store.Application[0].status, "Interested");
  assert.strictEqual(db.store.Application[0].type, "External");
  await db.runHandler(ctrl.updateApplication, req(s1, { params: { id: db.store.Application[0]._id }, body: { status: "Applied" } }));
  assert.strictEqual(db.store.Application[0].status, "Applied", "student marks Applied manually");
  const again = await open({ status: "Interested", keepExisting: true });
  assert.strictEqual(again.statusCode, 200);
  assert.strictEqual(db.store.Application[0].status, "Applied", "opening the link again must not change the status");
  assert.strictEqual(db.store.Application.length, 1);
});

test("tracking endpoint cannot touch an internal application", async () => {
  await submit(s1, noLink);
  const res = await db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: noLink._id }, body: { status: "Selected" } }));
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(db.store.Application[0].status, "Applied");
});

/* ---------------- 7. student history ---------------- */
test("student history: own applications only, with type, no applicant data, no placeholder links", async () => {
  await submit(s1, noLink);
  await db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: official._id }, body: { status: "Interested" } }));
  await db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: legacy._id }, body: { status: "Interested" } }));
  await submit(s2, noLink);

  const res = await db.runHandler(ctrl.getApplications, req(s1));
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.length, 3, "only student 1's applications");
  assert.deepStrictEqual(res.body.map((a) => a.type).sort(), ["External", "External", "Internal"]);
  res.body.forEach((a) => {
    assert.strictEqual(a.applicant, undefined, "list has no applicant details");
    assert.strictEqual(a.resume?.storedName, undefined);
    assert.ok(a.opportunityId.title && a.appliedAt && a.status);
  });
  const leg = res.body.find((a) => a.opportunityId.title === "Legacy Placeholder");
  assert.strictEqual(leg.opportunityId.applicationLink, "", "example.com link is blanked");
  assert.strictEqual(leg.opportunityId.hasApplyLink, false);
  const off = res.body.find((a) => a.opportunityId.title === "Official Site Job");
  assert.strictEqual(off.opportunityId.applicationLink, "https://careers.somecompany.com/jobs/1", "a valid official link is kept");
});

test("application details and resume download are owner-only", async () => {
  await submit(s1, noLink);
  const id = db.store.Application[0]._id;
  const mine = await db.runHandler(ctrl.getApplicationById, req(s1, { params: { id } }));
  assert.strictEqual(mine.statusCode, 200);
  assert.strictEqual(mine.body.applicant.fullName, "Asha Verma");
  assert.strictEqual(mine.body.resume.storedName, undefined);

  assert.strictEqual((await db.runHandler(ctrl.getApplicationById, req(s2, { params: { id } }))).statusCode, 404, "other student cannot read it");
  assert.strictEqual((await db.runHandler(ctrl.downloadMyResume, req(s2, { params: { id } }))).statusCode, 404, "other student cannot download the resume");

  const dl = await db.runHandler(ctrl.downloadMyResume, req(s1, { params: { id } }));
  assert.strictEqual(dl.statusCode, 200);
  assert.ok(dl.sent.startsWith(process.env.UPLOAD_DIR) && fs.existsSync(dl.sent));
  assert.match(dl.headers["Content-Disposition"], /^attachment/);
  assert.strictEqual(dl.headers["Content-Type"], "application/pdf");

  await db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: official._id }, body: {} }));
  const ext = db.store.Application.find((a) => a.type === "External");
  assert.strictEqual((await db.runHandler(ctrl.downloadMyResume, req(s1, { params: { id: ext._id } }))).statusCode, 404, "external record has no resume");
});

test("students cannot change or delete internal applications; external ones they can", async () => {
  await submit(s1, noLink);
  await db.runHandler(ctrl.createApplication, req(s1, { params: { opportunityId: official._id }, body: {} }));
  const [internal, external] = [db.store.Application.find((a) => a.type === "Internal"), db.store.Application.find((a) => a.type === "External")];

  const up = (id, status, user = s1) => db.runHandler(ctrl.updateApplication, req(user, { params: { id }, body: { status } }));
  assert.strictEqual((await up(internal._id, "Selected")).statusCode, 403);
  assert.strictEqual(internal.status, "Applied");
  assert.strictEqual((await up(external._id, "Applied")).statusCode, 200);
  assert.strictEqual((await up(external._id, "Hired")).statusCode, 400);
  assert.strictEqual((await up(external._id, "Selected", s2)).statusCode, 404, "cannot edit another student's record");

  const del = (id) => db.runHandler(ctrl.deleteApplication, req(s1, { params: { id } }));
  assert.strictEqual((await del(internal._id)).statusCode, 403);
  assert.strictEqual((await del(external._id)).statusCode, 200);
  assert.strictEqual(db.store.Application.length, 1);
});

/* ---------------- 8. admin ---------------- */
test("admin can list internal applications, see applicant info, update status, download resume", async () => {
  await submit(s1, noLink);
  await db.runHandler(ctrl.createApplication, req(s2, { params: { opportunityId: official._id }, body: {} })); // external, must not appear
  const id = db.store.Application.find((a) => a.type === "Internal")._id;

  const list = await db.runHandler(ctrl.adminListApplications, req(admin));
  assert.strictEqual(list.body.length, 1, "only internal applications");
  assert.strictEqual(list.body[0].applicant.fullName, "Asha Verma");
  assert.strictEqual((await db.runHandler(ctrl.adminListApplications, req(admin, { query: { status: "Selected" } }))).body.length, 0);

  const one = await db.runHandler(ctrl.adminGetApplication, req(admin, { params: { id } }));
  assert.strictEqual(one.body.userId.email, "asha@test.dev");
  assert.strictEqual(one.body.userId.password, undefined, "password never exposed");
  assert.strictEqual(one.body.resume.storedName, undefined);

  for (const status of ["Shortlisted", "Rejected", "Selected"]) {
    const res = await db.runHandler(ctrl.adminUpdateApplicationStatus, req(admin, { params: { id }, body: { status } }));
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(db.store.Application.find((a) => a._id === id).status, status);
  }
  assert.strictEqual(db.store.Notification.filter((n) => n.userId === s1._id && n.title === "Application update").length, 3, "student notified");
  assert.strictEqual((await db.runHandler(ctrl.adminUpdateApplicationStatus, req(admin, { params: { id }, body: { status: "Interested" } }))).statusCode, 400);
  const extId = db.store.Application.find((a) => a.type === "External")._id;
  assert.strictEqual((await db.runHandler(ctrl.adminUpdateApplicationStatus, req(admin, { params: { id: extId }, body: { status: "Selected" } }))).statusCode, 404, "external records are not the admin's to change");

  const dl = await db.runHandler(ctrl.adminDownloadResume, req(admin, { params: { id } }));
  assert.strictEqual(dl.statusCode, 200);
  assert.ok(fs.existsSync(dl.sent));
});

test("deleting an opportunity also deletes its applications and resume files", async () => {
  await submit(s1, noLink);
  assert.strictEqual(files().length, 1);
  const res = await db.runHandler(oppCtrl.deleteOpportunity, req(admin, { params: { id: noLink._id } }));
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(db.store.Application.length, 0);
  assert.strictEqual(files().length, 0);
});

/* ---------------- 9. login + role authorization (real middleware, real route wiring) ---------------- */
test("route wiring: student routes need login + student role, admin routes need login + admin role", async () => {
  const appRoutes = require("../routes/applicationRoutes");
  const adminRoutes = require("../routes/adminRoutes");

  assert.deepStrictEqual(appRoutes.stack[0].handlers, [auth.protect, auth.studentOnly], "all application routes sit behind protect + studentOnly");
  assert.deepStrictEqual(adminRoutes.stack[0].handlers, [auth.protect, auth.adminOnly], "all admin routes sit behind protect + adminOnly");

  const route = (r, method, p) => r.stack.find((x) => x.method === method && x.path === p);
  const internalRoute = route(appRoutes, "post", "/:opportunityId/internal");
  assert.ok(internalRoute.handlers.some((h) => h.uploadField === "resume"), "resume upload middleware is on the internal route");
  ["/applications", "/applications/:id", "/applications/:id/status", "/applications/:id/resume"].forEach((p) =>
    assert.ok(adminRoutes.stack.some((x) => x.path === p), `admin route ${p} exists`));

  // The last handler is a sentinel: if it runs, the guards let the request through
  let hit = false;
  const sentinel = (q, r) => { hit = true; r.json({ ok: true }); };
  const studentChain = [...appRoutes.stack[0].handlers, ...internalRoute.handlers.slice(0, -1), sentinel]; // protect, studentOnly, uploadResume, sentinel
  const adminChain = [...adminRoutes.stack[0].handlers, sentinel];
  const noToken = () => ({ headers: {}, body: {}, params: {}, query: {} });
  const withToken = (token) => ({ headers: { authorization: `Bearer ${token}` }, body: {}, params: {}, query: {} });
  const attempt = async (chain, request) => { hit = false; const { res } = await db.runChain(chain, request); return { res, hit }; };

  let r = await attempt(studentChain, noToken());
  assert.strictEqual(r.res.statusCode, 401, "no token -> 401 (login required)");
  assert.strictEqual(r.hit, false);
  r = await attempt(studentChain, withToken("garbage"));
  assert.strictEqual(r.res.statusCode, 401, "invalid token -> 401");
  assert.strictEqual(r.hit, false);
  r = await attempt(studentChain, withToken(`tok-${admin._id}`));
  assert.strictEqual(r.res.statusCode, 403, "admin cannot use student application routes");
  assert.strictEqual(r.hit, false);
  r = await attempt(studentChain, withToken(`tok-${s1._id}`));
  assert.strictEqual(r.hit, true, "positive control: a student passes the guards and the upload middleware");
  assert.strictEqual(r.res.statusCode, 200);

  r = await attempt(adminChain, noToken());
  assert.strictEqual(r.res.statusCode, 401);
  assert.strictEqual(r.hit, false);
  r = await attempt(adminChain, withToken(`tok-${s1._id}`));
  assert.strictEqual(r.res.statusCode, 403, "student cannot reach admin routes");
  assert.strictEqual(r.res.body.message, "Admin access only");
  assert.strictEqual(r.hit, false);
  r = await attempt(adminChain, withToken(`tok-${admin._id}`));
  assert.strictEqual(r.hit, true, "positive control: admin passes the admin guards");
  assert.strictEqual(r.res.statusCode, 200);
});

/* ---------------- 10. the Mongoose model definition ---------------- */
test("model: unique index, statuses, and the 'internal needs applicant + resume' rule", () => {
  const schemas = [];
  const hooks = {};
  class Schema { constructor(def) { this.def = def; this.idx = []; schemas.push(this); } index(spec, opts) { this.idx.push({ spec, opts }); } pre(name, fn) { hooks[name] = fn; } }
  Schema.Types = { ObjectId: "ObjectId" };
  const src = fs.readFileSync(path.join(__dirname, "../models/Application.js"), "utf8");
  new Function("require", "module", src)(() => ({ Schema, model: () => ({}) }), {});
  const main = schemas[schemas.length - 1];

  assert.deepStrictEqual(main.idx[0].spec, { userId: 1, opportunityId: 1 });
  assert.strictEqual(main.idx[0].opts.unique, true);
  assert.deepStrictEqual(main.def.type.enum, ["External", "Internal"]);
  assert.deepStrictEqual(main.def.status.enum, ["Interested", "Applied", "Shortlisted", "Rejected", "Selected"]);

  const run = (doc) => { const bad = []; hooks.validate.call({ ...doc, invalidate: (p) => bad.push(p) }); return bad; };
  assert.deepStrictEqual(run({ type: "External" }), []);
  assert.ok(run({ type: "Internal" }).includes("resume"));
  assert.ok(run({ type: "Internal", applicant: {}, resume: {} }).includes("applicant.fullName"));
  assert.deepStrictEqual(run({ type: "Internal", applicant: { fullName: "A", email: "a@b.co", phone: "1234567890", whyApply: "x" }, resume: { storedName: "f.pdf" } }), []);
});

test("sanity: server validator accepts a fully valid form", () => {
  const { errors, values } = validateApplicationForm(body());
  assert.deepStrictEqual(errors, {});
  assert.strictEqual(values.email, "asha@college.edu");
});
