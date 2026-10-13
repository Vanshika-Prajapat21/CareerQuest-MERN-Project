import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { opportunityApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { fmtDate } from "../../utils/helpers";

export default function ManageOpportunities() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, reload, loading, error } = useFetch(() => opportunityApi.list({ q, status, limit: 50, sort: "newest" }), [q, status]);

  const expire = async (o) => {
    try { await opportunityApi.expire(o._id); toast.success("Marked as expired"); reload(); }
    catch (err) { toast.error(getError(err)); }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete "${o.title}"? This also removes saves and applications.`)) return;
    try { await opportunityApi.remove(o._id); toast.success("Deleted"); reload(); }
    catch (err) { toast.error(getError(err)); }
  };

  return (
    <>
      <div className="row-between">
        <h1>Manage Opportunities</h1>
        <Link to="/admin/opportunities/new" className="btn btn-primary">+ Add Opportunity</Link>
      </div>
      <div className="card filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="filter-search" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="expired">Expired</option>
        </select>
      </div>
      {loading && <Loader />}
      {error && <p className="error-box">{error}</p>}
      {data && data.opportunities.length === 0 && <EmptyState title="No opportunities" text="Add the first one." linkTo="/admin/opportunities/new" linkText="Add opportunity" />}
      {data && data.opportunities.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Title</th><th>Type</th><th>Deadline</th><th>Apply via</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.opportunities.map((o) => (
                <tr key={o._id}>
                  <td><strong>{o.title}</strong><br /><small className="muted">{o.organization}</small></td>
                  <td>{o.type}</td>
                  <td>{fmtDate(o.deadline)}</td>
                  <td><span className={`chip ${o.hasApplyLink ? "chip-type" : "chip-skill"}`}>{o.hasApplyLink ? "Official website" : "CareerQuest form"}</span></td>
                  <td><span className={`status s-${o.status}`}>{o.status}</span></td>
                  <td className="actions">
                    <Link to={`/admin/opportunities/${o._id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                    {o.status === "active" && <button className="btn btn-outline btn-sm" onClick={() => expire(o)}>Expire</button>}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(o)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
