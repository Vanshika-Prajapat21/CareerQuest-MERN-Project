import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { categoryApi, opportunityApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";
import { TYPES, MODES } from "../../utils/helpers";
import { getLinkStatus } from "../../utils/url";

const EMPTY = {
  title: "", organization: "", type: "Internship", category: "General", description: "", eligibility: "",
  education: "", skills: "", location: "", mode: "Online", stipend: "", salary: "", deadline: "",
  applicationLink: "", logo: "", featured: false,
};

// Same form for "Add" (no id in URL) and "Edit" (id in URL)
export default function OpportunityForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    categoryApi.list().then((res) => setCategories(res.data)).catch(() => {});
    if (id) {
      opportunityApi.get(id)
        .then((res) => {
          const o = res.data;
          setForm({
            ...EMPTY, ...o,
            education: (o.education || []).join(", "),
            skills: (o.skills || []).join(", "),
            deadline: o.deadline.slice(0, 10), // yyyy-mm-dd for the date input
          });
        })
        .catch((err) => toast.error(getError(err)))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.organization.trim()) e.organization = "Organization is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.deadline) e.deadline = "Deadline is required";
    const link = getLinkStatus(form.applicationLink);
    if (link === "invalid") e.applicationLink = "Enter a full http:// or https:// link";
    if (link === "placeholder") e.applicationLink = "This looks like a placeholder (example.com, localhost...). Use the real page or leave it empty";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (id) await opportunityApi.update(id, form);
      else await opportunityApi.create(form);
      toast.success(id ? "Opportunity updated" : "Opportunity added");
      navigate("/admin/opportunities");
    } catch (err) { toast.error(getError(err)); }
    setSaving(false);
  };

  if (loading) return <Loader />;

  const field = (name, label, props = {}) => (
    <div className="form-group">
      <label>{label}</label>
      <input name={name} value={form[name]} onChange={set} {...props} />
      {errors[name] && <small className="error">{errors[name]}</small>}
    </div>
  );

  return (
    <>
      <h1>{id ? "Edit Opportunity" : "Add Opportunity"}</h1>
      <form className="card form-card" onSubmit={submit} noValidate>
        <div className="form-row">{field("title", "Title")}{field("organization", "Organization")}</div>
        <div className="form-row">
          <div className="form-group"><label>Type</label><select name="type" value={form.type} onChange={set}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label>Category</label>
            <select name="category" value={form.category} onChange={set}>
              <option>General</option>
              {categories.filter((c) => c.name !== "General").map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label>Description</label><textarea name="description" rows="5" value={form.description} onChange={set} />{errors.description && <small className="error">{errors.description}</small>}</div>
        {field("eligibility", "Eligibility")}
        <div className="form-row">
          {field("skills", "Required skills (comma separated)", { placeholder: "React, Node.js" })}
          {field("education", "Education (comma separated, or Any)", { placeholder: "MCA, BCA" })}
        </div>
        <div className="form-row">
          {field("location", "Location", { placeholder: "Indore or Remote" })}
          <div className="form-group"><label>Mode</label><select name="mode" value={form.mode} onChange={set}>{MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <div className="form-row">{field("stipend", "Stipend (optional)")}{field("salary", "Salary (optional)")}</div>
        <div className="form-row">{field("deadline", "Deadline", { type: "date" })}{field("applicationLink", "Official application URL (optional)", { placeholder: "https://... leave empty to use the CareerQuest form" })}</div>
        {field("logo", "Logo URL (optional)")}
        <label className="check-line"><input type="checkbox" name="featured" checked={form.featured} onChange={set} /> Show in Featured on the home page</label>
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : id ? "Update" : "Add opportunity"}</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/admin/opportunities")}>Cancel</button>
        </div>
      </form>
    </>
  );
}
