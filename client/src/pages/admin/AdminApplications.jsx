import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { adminApi, opportunityApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { fmtDate } from "../../utils/helpers";

const ADMIN_STATUSES = ["Applied", "Shortlisted", "Rejected", "Selected"];

export default function AdminApplications() {
  const [status, setStatus] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const { data, setData, loading, error } = useFetch(() => adminApi.applications({ status, opportunityId }), [status, opportunityId]);
  const { data: opps } = useFetch(() => opportunityApi.list({ status: "all", limit: 50, sort: "newest" }), []);

  const changeStatus = async (app, next) => {
    try {
      await adminApi.updateApplicationStatus(app._id, next);
      setData(data.map((x) => (x._id === app._id ? { ...x, status: next } : x)));
      toast.success("Status updated. The student was notified.");
    } catch (err) { toast.error(getError(err)); }
  };

  return (
    <>
      <h1>📨 Applications</h1>
      <p className="muted">Applications submitted through the CareerQuest form. Applications made on official websites are tracked by students only.</p>
      <div className="card filters">
        <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
          <option value="">All opportunities</option>
          {opps?.opportunities.map((o) => <option key={o._id} value={o._id}>{o.title}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {ADMIN_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading && <Loader />}
      {error && <p className="error-box">{error}</p>}
      {data && data.length === 0 && <EmptyState icon="📨" title="No applications" text="Nothing has been submitted for this filter yet." />}
      {data && data.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Applicant</th><th>Opportunity</th><th>College</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.applicant?.fullName}</strong><br /><small className="muted">{a.applicant?.email}</small></td>
                  <td>{a.opportunityId.title}<br /><small className="muted">{a.opportunityId.organization}</small></td>
                  <td>{a.applicant?.college}</td>
                  <td>{fmtDate(a.appliedAt)}</td>
                  <td>
                    <select className={`status s-${a.status}`} value={a.status} onChange={(e) => changeStatus(a, e.target.value)}>
                      {ADMIN_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><Link to={`/admin/applications/${a._id}`} className="btn btn-outline btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
