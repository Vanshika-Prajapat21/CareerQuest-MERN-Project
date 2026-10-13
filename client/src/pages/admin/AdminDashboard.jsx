import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { adminApi } from "../../services/services";
import Loader from "../../components/Loader";

// A simple bar chart made with plain HTML/CSS (no chart library needed)
function BarChart({ rows, title }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="card">
      <h3>{title}</h3>
      {rows.length === 0 && <p className="muted">No data yet</p>}
      {rows.map((r) => (
        <div key={r._id} className="reason">
          <div className="reason-head"><span>{r._id}</span><strong>{r.count}</strong></div>
          <div className="bar"><div className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, loading, error } = useFetch(() => adminApi.stats(), []);
  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  const cards = [
    ["👥", data.totalUsers, "Students"],
    ["🗂️", data.totalOpportunities, "Opportunities"],
    ["🟢", data.activeOpportunities, "Active"],
    ["⌛", data.expiredOpportunities, "Expired"],
    ["📋", data.totalApplications, "Applications"],
    ["🚩", data.openReports, "Open reports"],
  ];

  return (
    <>
      <div className="row-between">
        <h1>Admin Dashboard</h1>
        <Link to="/admin/opportunities/new" className="btn btn-primary">+ Add Opportunity</Link>
      </div>
      <div className="stat-grid six">
        {cards.map(([icon, value, label]) => (
          <div key={label} className="stat card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
        ))}
      </div>
      <div className="grid-2">
        <BarChart title="Most popular categories" rows={data.popularCategories} />
        <BarChart title="Opportunities by type" rows={data.byType} />
      </div>
    </>
  );
}
