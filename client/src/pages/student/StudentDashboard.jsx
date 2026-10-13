import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { userApi } from "../../services/services";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/Loader";
import OpportunityCard from "../../components/OpportunityCard";
import { deadlineText, fmtDate } from "../../utils/helpers";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch(() => userApi.dashboard(), []);

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;
  const { stats, topPicks, upcomingDeadlines } = data;
  const profileIncomplete = !user.skills?.length || !user.interests?.length;

  return (
    <>
      <h1>Hi {user.name.split(" ")[0]} 👋</h1>
      <p className="muted">Here is what is happening with your opportunities.</p>

      {profileIncomplete && (
        <div className="notice">Add your skills and interests to get better matches. <Link to="/student/profile">Complete profile →</Link></div>
      )}

      <div className="stat-grid">
        <Link to="/student/saved" className="stat card"><span>🔖</span><strong>{stats.saved}</strong><small>Saved</small></Link>
        <Link to="/student/applications" className="stat card"><span>📋</span><strong>{stats.applications}</strong><small>Applications</small></Link>
        <Link to="/student/notifications" className="stat card"><span>🔔</span><strong>{stats.unread}</strong><small>Unread alerts</small></Link>
        <div className="stat card"><span>🎉</span><strong>{stats.byStatus.Selected || 0}</strong><small>Selected</small></div>
      </div>

      <div className="row-between"><h2>Top matches for you</h2><Link to="/student/recommended">See all →</Link></div>
      <div className="grid">{topPicks.map((o) => <OpportunityCard key={o._id} opp={o} />)}</div>

      <h2>Upcoming deadlines</h2>
      {upcomingDeadlines.length === 0 ? (
        <p className="muted">Nothing closing in the next 14 days. Save opportunities to track their deadlines.</p>
      ) : (
        <div className="card list">
          {upcomingDeadlines.map((o) => (
            <Link key={o._id} to={`/opportunities/${o._id}`} className="list-row">
              <div><strong>{o.title}</strong><small className="muted"> · {o.organization}</small></div>
              <span className="urgent">{fmtDate(o.deadline)} · {deadlineText(o.deadline)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
