import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { savedApi } from "../services/services";
import { getError } from "../services/api";
import { deadlineText, daysLeft, fmtDate, TYPE_ICONS } from "../utils/helpers";
import MatchBadge from "./MatchBadge";

export default function OpportunityCard({ opp, onSavedChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(opp.isSaved));

  const toggleSave = async () => {
    if (!user) {
      toast.error("Please log in to save opportunities");
      return navigate("/login");
    }
    if (user.role !== "student") return toast.error("Only students can save opportunities");
    try {
      if (saved) await savedApi.unsave(opp._id);
      else await savedApi.save(opp._id);
      setSaved(!saved);
      toast.success(saved ? "Removed from saved" : "Saved!");
      onSavedChange?.(opp._id, !saved); // tell the parent page (optional)
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const urgent = daysLeft(opp.deadline) <= 3 && daysLeft(opp.deadline) >= 0;

  return (
    <div className="card opp-card">
      <div className="opp-top">
        {opp.logo ? <img className="logo" src={opp.logo} alt="" /> : <div className="logo">{opp.organization[0]}</div>}
        <div className="opp-title">
          <h3>{opp.title}</h3>
          <p className="muted">{opp.organization}</p>
        </div>
        <MatchBadge match={opp.match} />
      </div>

      <div className="chips">
        <span className="chip chip-type">{TYPE_ICONS[opp.type]} {opp.type}</span>
        <span className="chip">📍 {opp.location}</span>
        <span className="chip">{opp.mode}</span>
      </div>

      {opp.skills?.length > 0 && (
        <div className="chips">
          {opp.skills.slice(0, 4).map((s) => <span key={s} className="chip chip-skill">{s}</span>)}
          {opp.skills.length > 4 && <span className="chip">+{opp.skills.length - 4}</span>}
        </div>
      )}

      <div className="opp-meta">
        <span className={urgent ? "urgent" : ""}>⏰ {fmtDate(opp.deadline)} · {deadlineText(opp.deadline)}</span>
        {(opp.stipend || opp.salary) && <strong>{opp.stipend || opp.salary}</strong>}
      </div>

      <div className="opp-actions">
        <Link to={`/opportunities/${opp._id}`} className="btn btn-primary btn-sm">View Details</Link>
        <button className={`btn btn-sm ${saved ? "btn-saved" : "btn-outline"}`} onClick={toggleSave}>
          {saved ? "🔖 Saved" : "🔖 Save"}
        </button>
      </div>
    </div>
  );
}
