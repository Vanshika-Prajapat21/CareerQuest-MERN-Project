import { useState } from "react";
import toast from "react-hot-toast";
import { userApi } from "../../services/services";
import { getError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Settings() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (form.newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (form.newPassword !== form.confirm) return toast.error("Passwords do not match");
    setSaving(true);
    try {
      await userApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success("Password updated");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) { toast.error(getError(err)); }
    setSaving(false);
  };

  return (
    <>
      <h1>⚙️ Settings</h1>
      <div className="card form-card">
        <h3>Account</h3>
        <p className="muted">Signed in as <strong>{user.email}</strong></p>
        <h3>Change password</h3>
        <form onSubmit={submit}>
          <div className="form-group"><label>Current password</label><input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label>New password</label><input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></div>
            <div className="form-group"><label>Confirm new password</label><input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Updating..." : "Update password"}</button>
        </form>
        <hr />
        <button className="btn btn-outline" onClick={logout}>Logout</button>
      </div>
    </>
  );
}
