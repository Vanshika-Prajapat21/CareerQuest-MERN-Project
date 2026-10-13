import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../hooks/useFetch";
import { applicationApi, opportunityApi, savedApi } from "../services/services";
import { getError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import MatchBadge from "../components/MatchBadge";
import Modal from "../components/Modal";
import { deadlineText, fmtDate, STATUSES } from "../utils/helpers";
import { getApplyAction, openOfficialSite } from "../utils/applyFlow";

// One row of the "why this match" explanation
function Reason({ label, part, detail }) {
  const pct = Math.round((part.score / part.max) * 100);
  return (
    <div className="reason">
      <div className="reason-head"><span>{label}</span><strong>{part.score}/{part.max}</strong></div>
      <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
      <small className="muted">{detail}</small>
    </div>
  );
}

export default function OpportunityDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: opp, setData, loading, error } = useFetch(() => opportunityApi.get(id), [id, user?._id]);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false); // "you are leaving CareerQuest" dialog

  if (loading) return <Loader />;
  if (error) return <div className="container"><p className="error-box">{error}</p><Link to="/explore">← Back to explore</Link></div>;

  const isStudent = user?.role === "student";
  const b = opp.match?.breakdown;
  const action = getApplyAction({ opp, user }); // what Apply Now should do right now
  const tracked = opp.application; // { _id, status, type } or null

  const requireStudent = () => {
    if (!user) { toast.error("Please log in first"); navigate("/login", { state: { from: `/opportunities/${opp._id}` } }); return false; }
    if (!isStudent) { toast.error("Only students can do this"); return false; }
    return true;
  };

  const toggleSave = async () => {
    if (!requireStudent()) return;
    try {
      if (opp.isSaved) await savedApi.unsave(opp._id); else await savedApi.save(opp._id);
      setData({ ...opp, isSaved: !opp.isSaved });
      toast.success(opp.isSaved ? "Removed from saved" : "Saved!");
    } catch (err) { toast.error(getError(err)); }
  };

  // Apply Now
  const onApplyClick = () => {
    if (action.kind === "login") return requireStudent();
    if (action.kind === "external") return setLeaving(true);                 // Case A: confirm first
    if (action.kind === "internal") return navigate(`/opportunities/${opp._id}/apply`); // Case B: CareerQuest form
  };

  // Case A, after the student confirms in the dialog
  const continueToOfficialSite = async () => {
    setLeaving(false);
    // opened straight from the click, so browsers do not block the new tab
    if (!openOfficialSite(action.url)) return toast.error("This application link is not valid");
    if (tracked) return toast("Opened the official website in a new tab");
    try {
      // Only records "Interested". It never marks the application as submitted.
      const res = await applicationApi.apply(opp._id, "Interested", true);
      setData({ ...opp, application: { _id: res.data._id, status: res.data.status, type: "External" } });
      toast.success("Opened in a new tab. Saved to My Applications as Interested. Mark it Applied after you submit there.");
    } catch (err) { toast.error(getError(err)); }
  };

  // Personal tracking (works with or without an external link)
  const track = async (status) => {
    if (!requireStudent() || !status) return;
    setBusy(true);
    try {
      const res = tracked ? await applicationApi.update(tracked._id, status) : await applicationApi.apply(opp._id, status);
      setData({ ...opp, application: { _id: res.data._id, status, type: "External" } });
      toast.success(`Tracking as "${status}"`);
    } catch (err) { toast.error(getError(err)); }
    setBusy(false);
  };

  const report = async () => {
    if (!requireStudent()) return;
    const reason = window.prompt("Why are you reporting this opportunity?");
    if (!reason) return;
    try {
      const res = await opportunityApi.report(opp._id, reason);
      toast.success(res.data.message);
    } catch (err) { toast.error(getError(err)); }
  };

  const LABELS = { external: "Apply Now ↗", internal: "Apply Now", login: "Apply Now", applied: "✓ Already Applied", closed: "Applications closed" };
  const HINTS = { external: "Opens the official website in a new tab", internal: "Apply with a quick form on CareerQuest", login: "Log in to apply" };

  return (
    <div className="container details">
      <Link to="/explore" className="muted">← Back to opportunities</Link>

      <div className="details-grid">
        <div className="card details-main">
          <div className="opp-top">
            {opp.logo ? <img className="logo big" src={opp.logo} alt="" /> : <div className="logo big">{opp.organization[0]}</div>}
            <div className="opp-title">
              <span className="chip chip-type">{opp.type}</span>
              <h1>{opp.title}</h1>
              <p className="muted">{opp.organization}</p>
            </div>
          </div>

          <h3>About this opportunity</h3>
          <p>{opp.description}</p>

          {opp.eligibility && (<><h3>Eligibility</h3><p>{opp.eligibility}</p></>)}
          {opp.education?.length > 0 && (<><h3>Education</h3><p>{opp.education.join(", ")}</p></>)}
          {opp.skills?.length > 0 && (
            <>
              <h3>Required skills</h3>
              <div className="chips">{opp.skills.map((s) => <span key={s} className="chip chip-skill">{s}</span>)}</div>
            </>
          )}
        </div>

        <aside className="details-side">
          <div className="card">
            <ul className="facts">
              <li><span>📍 Location</span><strong>{opp.location}</strong></li>
              <li><span>🖥️ Mode</span><strong>{opp.mode}</strong></li>
              {opp.stipend && <li><span>💵 Stipend</span><strong>{opp.stipend}</strong></li>}
              {opp.salary && <li><span>💰 Salary</span><strong>{opp.salary}</strong></li>}
              <li><span>⏰ Deadline</span><strong>{fmtDate(opp.deadline)}</strong></li>
              <li><span>Status</span><strong>{opp.status === "expired" ? "Expired" : deadlineText(opp.deadline)}</strong></li>
              <li><span>📅 Posted</span><strong>{fmtDate(opp.createdAt)}</strong></li>
            </ul>

            <div className="stack">
              {action.kind === "not-student" ? (
                <p className="notice small">Admin accounts cannot apply. Use a student account to apply.</p>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={onApplyClick} disabled={action.kind === "applied" || action.kind === "closed"}>
                    {LABELS[action.kind]}
                  </button>
                  {HINTS[action.kind] && <small className="muted">{HINTS[action.kind]}</small>}
                </>
              )}
              {action.kind === "applied" && (
                <>
                  <p className="status-note">Status: <span className={`status s-${tracked.status}`}>{tracked.status}</span></p>
                  <Link className="btn btn-outline" to={`/student/applications/${action.applicationId}`}>View my application</Link>
                </>
              )}

              <button className={`btn ${opp.isSaved ? "btn-saved" : "btn-outline"}`} onClick={toggleSave}>{opp.isSaved ? "🔖 Saved" : "🔖 Save"}</button>

              {isStudent && tracked?.type !== "Internal" && (
                <div className="form-group track">
                  <label>Track this opportunity</label>
                  <select value={tracked?.status || ""} disabled={busy} onChange={(e) => track(e.target.value)}>
                    {!tracked && <option value="">Not tracking</option>}
                    {STATUSES.map((st) => <option key={st}>{st}</option>)}
                  </select>
                </div>
              )}
              <button className="link-btn" onClick={report}>🚩 Report this opportunity</button>
            </div>
          </div>

          {b && (
            <div className="card">
              <h3>Your Match: {opp.match.score}%</h3>
              <MatchBadge match={opp.match} />
              <Reason label="Skill match" part={b.skills}
                detail={b.skills.matched.length ? `You have: ${b.skills.matched.join(", ")}${b.skills.missing.length ? `. Missing: ${b.skills.missing.join(", ")}` : ""}` : "None of the required skills are on your profile yet"} />
              <Reason label="Interest match" part={b.interests}
                detail={b.interests.matched.length ? `Matches your interest: ${b.interests.matched.join(", ")}` : "No interest matched. Add interests in your profile"} />
              <Reason label="Education match" part={b.education}
                detail={b.education.matched ? "Your education fits the eligibility" : "Your education is not in the listed courses"} />
              <Reason label="Location match" part={b.location}
                detail={b.location.matched ? "Online, remote or in your city" : "Different city from your preferred location"} />
              <Reason label="Type preference" part={b.type}
                detail={b.type.matched === null ? "Set preferred types in your profile" : b.type.matched ? "This is a type you prefer" : "Not one of your preferred types"} />
            </div>
          )}

          {!user && (
            <div className="card"><p>Log in to see how well this matches your profile.</p><Link to="/login" className="btn btn-primary btn-sm">Login</Link></div>
          )}
        </aside>
      </div>

      {leaving && action.kind === "external" && (
        <Modal
          title="You are leaving CareerQuest"
          onClose={() => setLeaving(false)}
          actions={(
            <>
              <button className="btn btn-outline" onClick={() => setLeaving(false)}>Stay on CareerQuest</button>
              <button className="btn btn-primary" onClick={continueToOfficialSite}>Continue to {action.host} ↗</button>
            </>
          )}
        >
          <p>The official application page for <strong>{opp.title}</strong> will open in a new tab:</p>
          <p className="host-box">{action.host}</p>
          <p className="muted">CareerQuest cannot confirm whether your application is submitted on another website. After you apply there, come back and mark it as Applied in My Applications.</p>
        </Modal>
      )}
    </div>
  );
}
