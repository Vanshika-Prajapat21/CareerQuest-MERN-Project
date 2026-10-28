import "../../portfolio.css";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { portfolioApi } from "../../services/services";
import { getError } from "../../services/api";

const EMPTY = { type: "certificate", title: "", organization: "", date: "", description: "", skills: "", credentialUrl: "", githubUrl: "", demoUrl: "" };
const TABS = [
  ["all", "All items", "🗂️"], ["certificate", "Certificates", "📜"],
  ["achievement", "Achievements", "🏆"], ["project", "Projects", "💻"],
];
const labelFor = (type) => ({ certificate: "Certificate", achievement: "Achievement", project: "Project" }[type] || type);
const prettyDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";

export default function MyCareerPortfolio() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await portfolioApi.list(); setItems(data.items || []); }
    catch (e) { toast.error(getError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => tab === "all" ? items : items.filter(x => x.type === tab), [items, tab]);
  const counts = useMemo(() => ({ all: items.length, certificate: items.filter(x => x.type === "certificate").length, achievement: items.filter(x => x.type === "achievement").length, project: items.filter(x => x.type === "project").length }), [items]);
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const startNew = (type = tab === "all" ? "certificate" : tab) => { setEditing(null); setForm({ ...EMPTY, type }); setFile(null); setShowForm(true); };
  const startEdit = (item) => { setEditing(item._id); setForm({ ...EMPTY, ...item, date: item.date ? item.date.slice(0, 10) : "", skills: (item.skills || []).join(", ") }); setFile(null); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Please enter a title");
    const data = new FormData();
    ["type", "title", "organization", "date", "description", "skills", "credentialUrl", "githubUrl", "demoUrl"].forEach(k => data.append(k, form[k] || ""));
    if (file) data.append("file", file);
    setSaving(true);
    try {
      if (editing) await portfolioApi.update(editing, data); else await portfolioApi.create(data);
      toast.success(editing ? "Portfolio item updated" : "Portfolio item added");
      setShowForm(false); setEditing(null); setForm(EMPTY); setFile(null); await load();
    } catch (e) { toast.error(getError(e)); }
    finally { setSaving(false); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try { await portfolioApi.remove(item._id); setItems(old => old.filter(x => x._id !== item._id)); toast.success("Item deleted"); }
    catch (e) { toast.error(getError(e)); }
  };
  const openLink = (url) => url && window.open(url, "_blank", "noopener,noreferrer");

  return <div className="portfolio-page">
    <div className="portfolio-heading">
      <div><span className="portfolio-eyebrow">YOUR CAREER, ORGANIZED</span><h1>My Career Portfolio</h1><p className="muted">Keep your certificates, achievements and projects ready for your next opportunity.</p></div>
      <button className="btn btn-primary" onClick={() => startNew()}>＋ Add item</button>
    </div>
    <div className="portfolio-stats">
      {TABS.slice(1).map(([key, label, icon]) => <div className="portfolio-stat card" key={key}><span>{icon}</span><div><strong>{counts[key]}</strong><small>{label}</small></div></div>)}
    </div>
    <div className="portfolio-tabs">{TABS.map(([key, label, icon]) => <button key={key} className={tab === key ? "portfolio-tab active" : "portfolio-tab"} onClick={() => setTab(key)}>{icon} {label} <span>{counts[key]}</span></button>)}</div>

    {showForm && <form className="card portfolio-form" onSubmit={submit}>
      <div className="portfolio-form-head"><div><h2>{editing ? "Edit portfolio item" : "Add to your portfolio"}</h2><p className="muted">Only add real, verifiable information.</p></div><button type="button" className="link-btn" onClick={() => setShowForm(false)}>Cancel ✕</button></div>
      <div className="portfolio-form-grid">
        <label>Item type *<select value={form.type} onChange={e => update("type", e.target.value)}><option value="certificate">Certificate / Workshop</option><option value="achievement">Achievement</option><option value="project">Project</option></select></label>
        <label>Title *<input required maxLength="140" value={form.title} onChange={e => update("title", e.target.value)} placeholder={form.type === "project" ? "e.g. CareerQuest" : form.type === "achievement" ? "e.g. Inter-School Drawing Competition" : "e.g. Java Programming Certificate"}/></label>
        <label>{form.type === "project" ? "Organization / Role (optional)" : "Issuing organization / Institution"}<input maxLength="140" value={form.organization} onChange={e => update("organization", e.target.value)} placeholder="Organization, institute or role"/></label>
        <label>{form.type === "project" ? "Completion date" : "Issue / achievement date"}<input type="date" value={form.date} onChange={e => update("date", e.target.value)}/></label>
        <label className="portfolio-wide">Description<textarea rows="3" maxLength="2000" value={form.description} onChange={e => update("description", e.target.value)} placeholder="Briefly describe what you learned, achieved or built."/></label>
        <label className="portfolio-wide">Skills / Technologies <input value={form.skills} onChange={e => update("skills", e.target.value)} placeholder="Comma-separated, e.g. Java, OOP, MongoDB"/></label>
        {form.type === "certificate" && <label className="portfolio-wide">Certificate file (PDF, JPG, PNG, WEBP; max 5 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)}/>{editing && form.fileUrl && <small>Existing file saved. Upload a new file to replace the link.</small>}</label>}
        {form.type === "certificate" && <label className="portfolio-wide">Credential URL (optional)<input type="url" value={form.credentialUrl} onChange={e => update("credentialUrl", e.target.value)} placeholder="https://... (leave blank for offline certificates)"/></label>}
        {form.type === "project" && <><label>GitHub URL<input type="url" value={form.githubUrl} onChange={e => update("githubUrl", e.target.value)} placeholder="https://github.com/..."/></label><label>Live demo URL<input type="url" value={form.demoUrl} onChange={e => update("demoUrl", e.target.value)} placeholder="https://..."/></label></>}
      </div>
      <div className="portfolio-actions"><button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add to portfolio"}</button><button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button></div>
    </form>}

    {loading ? <div className="card portfolio-empty">Loading your portfolio…</div> : visible.length === 0 ? <div className="card portfolio-empty"><div className="portfolio-empty-icon">{tab === "project" ? "💻" : tab === "achievement" ? "🏆" : "📜"}</div><h2>Your portfolio starts here</h2><p className="muted">Add your real certificates, achievements and projects. Offline certificates are supported too.</p><button className="btn btn-primary" onClick={() => startNew(tab === "all" ? "certificate" : tab)}>＋ Add your first item</button></div> : <div className="portfolio-items">{visible.map(item => <article className="card portfolio-item" key={item._id}>
      <div className="portfolio-item-top"><span className={`portfolio-type type-${item.type}`}>{item.type === "certificate" ? "📜 Certificate" : item.type === "achievement" ? "🏆 Achievement" : "💻 Project"}</span><span className="muted portfolio-date">{prettyDate(item.date)}</span></div>
      <h3>{item.title}</h3>{item.organization && <p className="portfolio-org">{item.organization}</p>}{item.description && <p className="portfolio-description">{item.description}</p>}
      {!!item.skills?.length && <div className="chips portfolio-chips">{item.skills.map((skill, i) => <span className="chip" key={`${skill}-${i}`}>{skill}</span>)}</div>}
      <div className="portfolio-links">{item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer">View attachment ↗</a>}{item.credentialUrl && <a href={item.credentialUrl} target="_blank" rel="noreferrer">Verify certificate ↗</a>}{item.githubUrl && <a href={item.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}{item.demoUrl && <a href={item.demoUrl} target="_blank" rel="noreferrer">Live demo ↗</a>}</div>
      <div className="portfolio-item-actions"><button className="btn btn-outline btn-sm" onClick={() => startEdit(item)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => remove(item)}>Delete</button></div>
    </article>)}</div>}
    <section className="card portfolio-resume-note"><div><h2>Ready to build your resume?</h2><p className="muted">Use your saved information as the source. You can print this page or select your items when creating your resume.</p></div><button className="btn btn-outline" onClick={() => window.print()}>Print / Save PDF</button></section>
  </div>;
}
