// Run with:  npm test     (Node 18+, needs no database)
// Checks the Apply-link rules on the REAL seed data, the REAL server/client validators and the REAL model.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const server = require("../utils/url");

// ---- load the seed data without touching MongoDB (stub the requires) ----
const loadSeedOpportunities = () => {
  const src = fs.readFileSync(path.join(__dirname, "../seed.js"), "utf8").split("const run = async")[0];
  const stubs = { dotenv: { config() {} }, mongoose: {}, "./models/User": {}, "./models/Opportunity": {}, "./models/Category": {}, "./utils/url": server };
  return new Function("require", `${src}; return opportunities;`)((name) => stubs[name]);
};

// ---- load the real Opportunity schema definition with a fake mongoose ----
const loadSchemaDefinition = () => {
  let def;
  class Schema { constructor(d) { def = d; this.statics = {}; } }
  const fake = { Schema, model: () => ({}) };
  const src = fs.readFileSync(path.join(__dirname, "../models/Opportunity.js"), "utf8");
  new Function("require", "module", src)((n) => (n === "mongoose" ? fake : server), {});
  return def;
};

// what the app used to generate (the bug)
const legacyLink = (title) => `https://example.com/apply/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

test("every sample opportunity: before vs after, and what the Apply button does", async () => {
  const client = await import("../../client/src/utils/url.js");
  const opps = loadSeedOpportunities();
  assert.strictEqual(opps.length, 20);

  console.log("\n#  | BEFORE (old seed)      | AFTER (seed)     | API says      | Apply button        | Opportunity");
  const tally = { valid: 0, missing: 0, placeholder: 0, invalid: 0 };
  let opened = 0;

  opps.forEach((o, i) => {
    const before = server.getLinkStatus(legacyLink(o.title));
    const after = server.getLinkStatus(o.applicationLink);
    const api = server.withSafeLink({ ...o });             // what GET /api/opportunities/:id returns
    const url = client.getSafeApplyUrl(api.applicationLink); // what the button checks before opening
    const button = url ? "OPENS " + url : "disabled + message";
    if (url) opened++;
    tally[after]++;
    console.log(`${String(i + 1).padStart(2)} | ${before.padEnd(22)} | ${after.padEnd(16)} | hasApplyLink=${String(api.hasApplyLink).padEnd(5)} | ${button.padEnd(19)} | ${o.title}`);

    assert.strictEqual(before, "placeholder", "old seed links were all placeholders");
    assert.ok(!/example\.(com|org|net)/.test(o.applicationLink), "no placeholder in seed data");
    assert.strictEqual(api.hasApplyLink, after === "valid");
    assert.strictEqual(Boolean(url), after === "valid", "button only opens verified links");
  });

  console.log(`\nSummary: real=${tally.valid}  placeholder=${tally.placeholder}  invalid=${tally.invalid}  unavailable(no link)=${tally.missing}  | links opened by Apply: ${opened}`);
  assert.strictEqual(tally.placeholder + tally.invalid, 0);
});

test("old bad records already in a database can never reach the Apply button", async () => {
  const client = await import("../../client/src/utils/url.js");
  for (const bad of ["https://example.com/apply/react-internship", "http://example.org/x", "https://sub.example.net/a", "javascript:alert(1)", "not a url", ""]) {
    const api = server.withSafeLink({ title: "legacy", applicationLink: bad });
    assert.strictEqual(api.applicationLink, "");
    assert.strictEqual(api.hasApplyLink, false);
    assert.strictEqual(client.getSafeApplyUrl(bad), "");
  }
});

test("validator: only valid http/https links pass, server and client agree", async () => {
  const client = await import("../../client/src/utils/url.js");
  const cases = [
    ["https://careers.somecompany.com/jobs/123?ref=cq", "valid"],
    ["HTTP://Some-Company.in/apply", "valid"],
    ["https://example.com/apply/x", "placeholder"],
    ["https://www.example.org", "placeholder"],
    ["https://app.test/apply", "placeholder"],
    ["http://localhost:3000/apply", "placeholder"],
    ["http://192.168.1.5/apply", "placeholder"],
    ["javascript:alert(1)", "invalid"],
    ["data:text/html,<script>alert(1)</script>", "invalid"],
    ["ftp://files.somecompany.com/form", "invalid"],
    ["file:///etc/passwd", "invalid"],
    ["https://trusted.com@evil.com/login", "invalid"],
    ["http://apply", "invalid"],
    ["https://bad host.com", "invalid"],
    ["www.somecompany.com/apply", "invalid"],
    ["", "missing"],
    ["   ", "missing"],
    [undefined, "missing"],
  ];
  cases.forEach(([input, expected]) => {
    assert.strictEqual(server.getLinkStatus(input), expected, `server: ${input}`);
    assert.strictEqual(client.getLinkStatus(input), expected, `client: ${input}`);
  });
  console.log(`\nValidator: ${cases.length} cases passed on both server and client`);
});

test("model: link is optional, bad links are rejected by the schema", () => {
  const def = loadSchemaDefinition().applicationLink;
  assert.strictEqual(def.required, undefined, "link must not be required");
  const ok = def.validate.validator;
  assert.ok(ok("") && ok(undefined), "empty is allowed");
  assert.ok(ok("https://careers.somecompany.com/apply"));
  assert.ok(!ok("https://example.com/apply") && !ok("javascript:alert(1)") && !ok("nonsense"));
});

test("Save and Track do not depend on applicationLink", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  // Saving never looks at the link
  ["controllers/savedController.js", "routes/savedRoutes.js", "models/SavedOpportunity.js", "models/Notification.js"].forEach((f) =>
    assert.ok(!/applicationLink/.test(read(f)), `${f} must not use applicationLink`));
  // Tracking (create / update / delete a tracked application) never looks at the link either.
  // Only the internal-form handler reads it, on purpose: to decide "official website" vs "CareerQuest form".
  const code = read("controllers/applicationController.js");
  const section = (from, to) => code.slice(code.indexOf(from), code.indexOf(to));
  assert.ok(!/applicationLink/.test(section("const createApplication", "// POST /api/applications/:opportunityId/internal")), "createApplication (Track) must not use applicationLink");
  assert.ok(!/applicationLink/.test(section("// PUT /api/applications/:id", "/* ===================== ADMIN")), "update/delete (Track) must not use applicationLink");
});
