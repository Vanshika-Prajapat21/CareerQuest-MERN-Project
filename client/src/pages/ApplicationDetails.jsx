import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../hooks/useFetch";
import { adminApi, applicationApi } from "../services/services";
import { getError } from "../services/api";
import Loader from "../components/Loader";
import { fmtDate, STATUSES } from "../utils/helpers";
import { getSafeApplyUrl } from "../utils/url";
import { openOfficialSite } from "../utils/applyFlow";
import { saveBlob } from "../utils/applicationForm";

const ADMIN_STATUSES = ["Applied", "Shortlisted", "Rejected", "Selected"];

// A link is clickable only when it is a real http(s) link; otherwise it is shown as plain text
function SafeLink({ url }) {
  if (!url) return <span className="muted">Not provided</span>;
  const safe = getSafeApplyUrl(url);
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{safe}</a> : <span>{url}</span>;
}

// Used for BOTH /student/applications/:id and /admin/applications/:id
export default function ApplicationDetails({ admin = false }) {
  const { id } = useParams();
  const { data: app, setData, loading, error } = useFetch(() => (admin ? adminApi.application(id) : applicationApi.get(id)), [id, admin]);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  const opp = app.opportunityId;
  const a = app.applicant;
  const internal = app.type === "Internal";
  const officialUrl = getSafeApplyUrl(opp.applicationLink);
  const backTo = admin ? "/admin/applications" : "/student/applications";

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      if (admin) await adminApi.updateApplicationStatus(app._id, status);
      else await applicationApi.update(app._id, status);
      setData({ ...app, status });
      toast.success("Status updated");
    } catch (err) { toast.error(getError(err)); }
    setBusy(false);
  };

  const downloadResume = async () => {
    try {
      const res = await (admin ? adminApi.applicationResume(app._id) : applicationApi.resume(app._id));
      saveBlob(res.data, app.resume?.originalName || "resume.pdf");
    } catch (err) { toast.error("Could not download the resume"); }
  };

  return (
    <>
      <Link to={backTo} className="muted">← Back to applications</Link>
      <div className="card apply-head">
        <span className={`chip ${internal ? "chip-skill" : "chip-type"}`}>{internal ? "Internal application" : "External application (tracked by you)"}</span>
        <h1>{opp.title}</h1>
        <p className="muted">{opp.organization} · <Link to={`/opportunities/${opp._id}`}>View opportunity</Link></p>
        <ul className="facts">
          <li><span>{internal ? "Submitted on" : "Added on"}</span><strong>{fmtDate(app.appliedAt)}</strong></li>
          <li>
            <span>Status</span>
            {admin && internal ? (
              <select className={`status s-${app.status}`} value={app.status} disabled={busy} onChange={(e) => changeStatus(e.target.value)}>
                {ADMIN_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : !admin && !internal ? (
              <select className={`status s-${app.status}`} value={app.status} disabled={busy} onChange={(e) => changeStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <span className={`status s-${app.status}`}>{app.status}</span>
            )}
          </li>
          {admin && app.userId && <li><span>Student account</span><strong>{app.userId.name} · {app.userId.email}</strong></li>}
        </ul>
      </div>

      {!internal && (
        <div className="card">
          <h3>About this record</h3>
          <p>You applied (or plan to apply) on the official website. CareerQuest cannot confirm whether the application was submitted there, so this status is kept by you.</p>
          {app.status === "Interested" && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => changeStatus("Applied")}>Mark as Applied</button>}
          {officialUrl && (
            <p><button className="link-btn" onClick={() => window.confirm("You are leaving CareerQuest. The official website will open in a new tab.") && openOfficialSite(officialUrl)}>Open official website ↗</button></p>
          )}
        </div>
      )}

      {internal && a && (
        <>
          <div className="card">
            <h3>Applicant details</h3>
            <div className="detail-grid">
              <div><small>Full name</small><p>{a.fullName}</p></div>
              <div><small>Email</small><p>{a.email}</p></div>
              <div><small>Phone</small><p>{a.phone}</p></div>
              <div><small>College / university</small><p>{a.college}</p></div>
              <div><small>Education</small><p>{a.education}</p></div>
              <div><small>Year / semester</small><p>{a.yearSemester}</p></div>
              <div><small>City, state</small><p>{a.city}, {a.state}</p></div>
              <div><small>LinkedIn</small><p><SafeLink url={a.linkedin} /></p></div>
              <div><small>GitHub / portfolio</small><p><SafeLink url={a.portfolio} /></p></div>
            </div>
            <small>Skills</small>
            <div className="chips">{a.skills?.map((s) => <span key={s} className="chip chip-skill">{s}</span>)}</div>
          </div>

          <div className="card">
            <h3>Why they want to apply</h3>
            <p className="pre">{a.whyApply}</p>
            {a.experience && (<><h3>Relevant projects / experience</h3><p className="pre">{a.experience}</p></>)}
          </div>

          <div className="card">
            <h3>Resume</h3>
            {app.resume?.originalName ? (
              <div className="row-between">
                <span>📄 {app.resume.originalName} <small className="muted">({Math.round((app.resume.size || 0) / 1024)} KB)</small></span>
                <button className="btn btn-outline btn-sm" onClick={downloadResume}>Download PDF</button>
              </div>
            ) : <p className="muted">No resume on file.</p>}
          </div>
        </>
      )}
    </>
  );
}
