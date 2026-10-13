import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { adminApi } from "../../services/services";
import { getError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/Loader";
import { fmtDate } from "../../utils/helpers";

export default function ManageUsers() {
  const { user: me } = useAuth();
  const { data, reload, loading, error } = useFetch(() => adminApi.users(), []);

  const changeRole = async (u, role) => {
    try { await adminApi.updateRole(u._id, role); toast.success("Role updated"); reload(); }
    catch (err) { toast.error(getError(err)); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? Their saves and applications will be removed.`)) return;
    try { await adminApi.deleteUser(u._id); toast.success("User deleted"); reload(); }
    catch (err) { toast.error(getError(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  return (
    <>
      <h1>Manage Users</h1>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Education</th><th>Joined</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u._id}>
                <td><strong>{u.name}</strong></td><td>{u.email}</td><td>{u.education || "-"}</td><td>{fmtDate(u.createdAt)}</td>
                <td>
                  <select value={u.role} disabled={u._id === me._id} onChange={(e) => changeRole(u, e.target.value)}>
                    <option value="student">student</option><option value="admin">admin</option>
                  </select>
                </td>
                <td>{u._id !== me._id && <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
