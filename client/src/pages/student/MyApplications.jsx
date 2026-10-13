import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { applicationApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { STATUSES, fmtDate } from "../../utils/helpers";
import { openOfficialSite } from "../../utils/applyFlow";
import { getSafeApplyUrl } from "../../utils/url";

export default function MyApplications() {
  const { data, setData, loading, error } = useFetch(() => applicationApi.list(), []);

  const changeStatus = async (app, status) => {
    try {
      await applicationApi.update(app._id, status);
      setData(data.map((a) => (a._id === app._id ? { ...a, status } : a)));
      toast.success("Status updated");
    } catch (err) { toast.error(getError(err)); }
  };

  const remove = async (app) => {
    if (!window.confirm("Remove this tracked application? (This does not affect anything on the official website.)")) return;
    try {
      await applicationApi.remove(app._id);
      setData(data.filter((a) => a._id !== app._id));
    } catch (err) { toast.error(getError(err)); }
  };

  const openSite = (url) => {
    if (window.confirm("You are leaving CareerQuest. The official website will open in a new tab.")) openOfficialSite(url);
  };

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  return (
    <>
      <h1>📋 My Applications</h1>
      <div className="notice">
        <strong>External applications:</strong> opening an official website does not mean CareerQuest has confirmed that your application was submitted.
        Use <em>Mark as Applied</em> yourself after you apply there. <strong>Internal applications</strong> are submitted through CareerQuest, and their status is updated by the organization.
      </div>

      {data.length === 0 ? (
        <EmptyState icon="📋" title="No applications yet" text="Apply to an opportunity or start tracking one, and it will appear here." linkTo="/student/opportunities" linkText="Find opportunities" />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Opportunity</th><th>Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.map((a) => {
                const opp = a.opportunityId;
                const officialUrl = getSafeApplyUrl(opp.applicationLink);
                const internal = a.type === "Internal";
                return (
                  <tr key={a._id}>
                    <td><Link to={`/opportunities/${opp._id}`}><strong>{opp.title}</strong></Link><br /><small className="muted">{opp.organization}</small></td>
                    <td><span className={`chip ${internal ? "chip-skill" : "chip-type"}`}>{internal ? "Internal" : "External"}</span></td>
                    <td>{fmtDate(a.appliedAt)}</td>
                    <td>
                      {internal ? (
                        <span className={`status s-${a.status}`}>{a.status}</span>
                      ) : (
                        <select className={`status s-${a.status}`} value={a.status} onChange={(e) => changeStatus(a, e.target.value)}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="actions">
                      <Link to={`/student/applications/${a._id}`} className="btn btn-outline btn-sm">View details</Link>
                      {!internal && a.status === "Interested" && <button className="btn btn-primary btn-sm" onClick={() => changeStatus(a, "Applied")}>Mark as Applied</button>}
                      {!internal && officialUrl && <button className="link-btn" onClick={() => openSite(officialUrl)}>Official website ↗</button>}
                      {!internal && <button className="link-btn" onClick={() => remove(a)}>Remove</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
