import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { adminApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { fmtDate } from "../../utils/helpers";

export default function Reports() {
  const { data, reload, loading, error } = useFetch(() => adminApi.reports(), []);

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); reload(); } catch (err) { toast.error(getError(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  return (
    <>
      <h1>🚩 Reported Opportunities</h1>
      {data.length === 0 ? (
        <EmptyState icon="✅" title="No reports" text="Students have not reported anything." />
      ) : (
        <div className="card list">
          {data.map((r) => (
            <div key={r._id} className="list-row">
              <div>
                <strong>{r.opportunityId.title}</strong> <small className="muted">· {r.opportunityId.organization}</small>
                <p>“{r.reason}”</p>
                <small className="muted">By {r.userId?.name || "deleted user"} on {fmtDate(r.createdAt)}</small>
              </div>
              <div className="actions">
                <span className={`status s-${r.status}`}>{r.status}</span>
                <Link to={`/admin/opportunities/${r.opportunityId._id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                {r.status === "open" && <button className="btn btn-outline btn-sm" onClick={() => act(() => adminApi.resolveReport(r._id), "Resolved")}>Resolve</button>}
                <button className="btn btn-danger btn-sm" onClick={() => act(() => adminApi.deleteReport(r._id), "Deleted")}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
