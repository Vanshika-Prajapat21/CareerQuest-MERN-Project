// A tiny in-memory stand-in for MongoDB/Mongoose, express, multer and jsonwebtoken.
// It lets the REAL controllers, middleware and routes run without installing anything.
// It is NOT MongoDB: things like real unique indexes and schema validation are not exercised here.
const Module = require("node:module");

const store = {};
let counter = 0;
const clone = (o) => JSON.parse(JSON.stringify(o));
const sameId = (a, b) => String(a) === String(b);
const matches = (doc, filter) => Object.entries(filter).every(([k, v]) => sameId(doc[k], v));
const REFS = { userId: "User", opportunityId: "Opportunity" };

const wrap = (data) => {
  Object.defineProperty(data, "save", { value: async function () { return this; }, enumerable: false, writable: true });
  Object.defineProperty(data, "toObject", { value: function () { return clone(this); }, enumerable: false, writable: true });
  return data;
};

const pick = (doc, select) => {
  if (!select) return wrap(clone(doc));
  const out = { _id: doc._id };
  select.split(" ").forEach((f) => { if (f in doc) out[f] = doc[f]; });
  return wrap(out);
};

class Query {
  constructor(name, filter, one) { Object.assign(this, { name, filter, one, pops: [], sortSpec: null, isLean: false }); }
  populate(path, select) { this.pops.push({ path, select }); return this; }
  select() { return this; }
  sort(spec) { this.sortSpec = spec; return this; }
  lean() { this.isLean = true; return this; }
  then(res, rej) { return this.exec().then(res, rej); }
  async exec() {
    let rows = store[this.name].filter((d) => matches(d, this.filter));
    if (this.sortSpec) {
      const [k, dir] = Object.entries(this.sortSpec)[0];
      rows = [...rows].sort((a, b) => (a[k] < b[k] ? -dir : a[k] > b[k] ? dir : 0));
    }
    if (this.one) rows = rows.slice(0, 1);
    rows = rows.map((d) => {
      if (!this.pops.length) return this.isLean ? clone(d) : d; // un-populated docs are the stored objects, so edits persist
      const copy = wrap(clone(d));
      this.pops.forEach(({ path, select }) => {
        const ref = store[REFS[path]].find((x) => sameId(x._id, d[path]));
        copy[path] = ref ? pick(ref, select) : null;
      });
      return this.isLean ? clone(copy) : copy;
    });
    return this.one ? rows[0] || null : rows;
  }
}

const DEFAULTS = {
  Application: () => ({ type: "External", status: "Interested", appliedAt: new Date().toISOString() }),
  Notification: () => ({ isRead: false, createdAt: new Date().toISOString() }),
};

const makeModel = (name) => {
  store[name] = [];
  const del = (filter, limit) => {
    const keep = [], removed = [];
    store[name].forEach((d) => (matches(d, filter) && (!limit || removed.length < limit) ? removed.push(d) : keep.push(d)));
    store[name] = keep;
    return removed;
  };
  return {
    modelName: name,
    find: (filter = {}) => new Query(name, filter, false),
    findOne: (filter = {}) => new Query(name, filter, true),
    findById: (id) => new Query(name, { _id: id }, true),
    exists: async (filter) => (store[name].some((d) => matches(d, filter)) ? { _id: 1 } : null),
    create: async (data) => {
      if (name === "Application" && store[name].some((d) => sameId(d.userId, data.userId) && sameId(d.opportunityId, data.opportunityId))) {
        throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 }); // what MongoDB's unique index does
      }
      const doc = wrap({ ...(DEFAULTS[name] ? DEFAULTS[name]() : {}), ...clone(data), _id: data._id || `id${++counter}` });
      store[name].push(doc);
      return doc;
    },
    deleteMany: async (filter) => ({ deletedCount: del(filter).length }),
    deleteOne: async (filter) => ({ deletedCount: del(filter, 1).length }),
    findByIdAndDelete: async (id) => del({ _id: id }, 1)[0] || null,
  };
};

const Models = {};
["User", "Opportunity", "Application", "Notification", "SavedOpportunity", "Report", "Category"].forEach((name) => {
  Models[name] = makeModel(name);
  const file = require.resolve(`../../models/${name}`);
  require.cache[file] = { id: file, filename: file, loaded: true, exports: Models[name], children: [], paths: [] };
});

// fake express (records routes), multer (marker middleware) and jsonwebtoken
const makeRouter = () => {
  const r = { stack: [] };
  ["get", "post", "put", "delete"].forEach((m) => { r[m] = (p, ...h) => { r.stack.push({ method: m, path: p, handlers: h }); return r; }; });
  r.use = (...h) => { r.stack.push({ method: "use", handlers: h }); return r; };
  return r;
};
const fakeMulter = Object.assign(
  () => ({ single: (field) => { const mw = (req, res, next) => next(); mw.uploadField = field; return mw; } }),
  { memoryStorage: () => ({}) }
);
const fakeJwt = {
  sign: (p) => `tok-${p.id}`,
  verify: (t) => {
    if (!String(t).startsWith("tok-")) throw Object.assign(new Error("jwt malformed"), { name: "JsonWebTokenError" });
    return { id: t.slice(4) };
  },
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "express") return { Router: makeRouter };
  if (request === "multer") return fakeMulter;
  if (request === "jsonwebtoken") return fakeJwt;
  return origLoad.call(this, request, ...rest);
};

const { errorHandler } = require("../../middleware/errorHandler");

const makeRes = () => ({
  statusCode: 200, headers: {}, body: undefined, sent: null, headersSent: false,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
  setHeader(k, v) { this.headers[k] = v; },
  sendFile(p, cb) { this.sent = p; this.sendCb = cb; return this; },
});

// Run one controller the way Express would (errors go through the real error handler)
const runHandler = async (handler, req) => {
  const res = makeRes();
  let error = null;
  await handler(req, res, (err) => { error = err; });
  if (error) errorHandler(error, req, res, () => {});
  return res;
};

// Run a chain of middleware + handler (like a route) and say whether the final handler was reached
const runChain = async (handlers, req) => {
  const res = makeRes();
  const pending = [];
  let i = 0, error = null, reached = false;
  const next = (err) => {
    if (err) { error = err; return; }
    const h = handlers[i++];
    if (!h) { reached = true; return; }
    pending.push(Promise.resolve(h(req, res, next)));
  };
  next();
  while (pending.length) await pending.shift();
  if (error) errorHandler(error, req, res, () => {});
  return { res, reached };
};

const reset = () => Object.keys(store).forEach((k) => { store[k].length = 0; });
const add = async (model, data) => Models[model].create(data);
const makePdf = (extra = 900) => Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n${"x".repeat(extra)}\n%%EOF\n`);

module.exports = { store, Models, reset, add, makeRes, runHandler, runChain, makePdf };
