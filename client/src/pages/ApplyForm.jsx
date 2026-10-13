import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../hooks/useFetch";
import { applicationApi, opportunityApi } from "../services/services";
import { getError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { getApplyAction } from "../utils/applyFlow";
import { validateApplicationForm, validateResumeFile, MAX_RESUME_MB } from "../utils/applicationForm";

// One reusable form for internships, jobs, hackathons, scholarships, workshops...
export default function ApplyForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: opp, loading, error } = useFetch(() => opportunityApi.get(id), [id]);

  const [form, setForm] = useState({
    fullName: user.name || "", email: user.email || "", phone: "", college: user.college || "",
    education: user.education || "", yearSemester: "", city: user.location || "", state: "",
    skills: (user.skills || []).join(", "), linkedin: "", portfolio: "", whyApply: "", experience: "",
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader />;
  if (error) return <div className="container"><p className="error-box">{error}</p></div>;

  const action = getApplyAction({ opp, user });
  if (action.kind === "external") return <Navigate to={`/opportunities/${opp._id}`} replace />; // has an official site: use that
  if (action.kind === "applied") {
    return (
      <EmptyState icon="✅" title="Already Applied" text="You have already applied to this opportunity."
        linkTo={`/student/applications/${action.applicationId}`} linkText="View my application" />
    );
  }
  if (action.kind === "closed") return <EmptyState icon="⌛" title="Applications closed" text="The deadline for this opportunity has passed." linkTo="/explore" linkText="Browse opportunities" />;

  const set = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setErrors({ ...errors, [e.target.name]: undefined }); };

  const pickFile = async (e) => {
    const picked = e.target.files[0];
    setFile(null);
    if (!picked) return setErrors({ ...errors, resume: "Resume (PDF) is required" });
    const problem = await validateResumeFile(picked);
    setErrors({ ...errors, resume: problem || undefined });
    if (!problem) setFile(picked);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const found = validateApplicationForm(form);
    const resumeProblem = file ? await validateResumeFile(file) : "Resume (PDF) is required";
    if (resumeProblem) found.resume = resumeProblem;
    setErrors(found);
    if (Object.keys(found).length) return toast.error("Please fix the highlighted fields");

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v)); // no userId here: the server reads it from your login
    data.append("resume", file);

    setSubmitting(true);
    try {
      const res = await applicationApi.submitInternal(opp._id, data);
      toast.success(res.data.message); // shown only after the server confirmed the save
      navigate(`/student/applications/${res.data.application._id}`);
    } catch (err) {
      const body = err.response?.data;
      if (err.response?.status === 409 && body?.applicationId) {
        toast.error(body.message);
        return navigate(`/student/applications/${body.applicationId}`);
      }
      if (body?.errors) setErrors(body.errors);
      toast.error(getError(err));
    }
    setSubmitting(false);
  };

  const field = (name, label, props = {}) => (
    <div className="form-group">
      <label>{label}</label>
      <input name={name} value={form[name]} onChange={set} {...props} />
      {errors[name] && <small className="error">{errors[name]}</small>}
    </div>
  );

  return (
    <div className="container narrow section">
      <Link to={`/opportunities/${opp._id}`} className="muted">← Back to opportunity</Link>
      <div className="card apply-head">
        <span className="chip chip-type">{opp.type}</span>
        <h1>Apply: {opp.title}</h1>
        <p className="muted">{opp.organization}</p>
      </div>

      <form className="card form-card" onSubmit={submit} noValidate>
        <h3>Your details</h3>
        <div className="form-row">{field("fullName", "Full name *")}{field("email", "Email *", { type: "email" })}</div>
        <div className="form-row">{field("phone", "Phone number *", { placeholder: "+91 98765 43210" })}{field("college", "College / university *")}</div>
        <div className="form-row">{field("education", "Education *", { placeholder: "MCA, B.Tech..." })}{field("yearSemester", "Current year / semester *", { placeholder: "2nd year / Sem 3" })}</div>
        <div className="form-row">{field("city", "City *")}{field("state", "State *")}</div>
        {field("skills", "Skills * (comma separated)", { placeholder: "React, JavaScript, Node.js" })}

        <h3>Resume</h3>
        <div className="form-group">
          <label>Resume (PDF, up to {MAX_RESUME_MB} MB) *</label>
          <input type="file" accept="application/pdf,.pdf" onChange={pickFile} />
          {file && <small className="muted">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</small>}
          {errors.resume && <small className="error">{errors.resume}</small>}
        </div>

        <h3>Links (optional)</h3>
        <div className="form-row">
          {field("linkedin", "LinkedIn URL", { placeholder: "https://www.linkedin.com/in/..." })}
          {field("portfolio", "GitHub / portfolio URL", { placeholder: "https://github.com/..." })}
        </div>

        <h3>About your application</h3>
        <div className="form-group">
          <label>Why do you want to apply? *</label>
          <textarea name="whyApply" rows="5" value={form.whyApply} onChange={set} placeholder="At least 20 characters" />
          {errors.whyApply && <small className="error">{errors.whyApply}</small>}
        </div>
        <div className="form-group">
          <label>Relevant projects / experience</label>
          <textarea name="experience" rows="4" value={form.experience} onChange={set} />
          {errors.experience && <small className="error">{errors.experience}</small>}
        </div>

        <p className="muted small-print">Your resume and details are visible only to you and CareerQuest admins.</p>
        <div className="actions">
          <button className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit application"}</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/opportunities/${opp._id}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
