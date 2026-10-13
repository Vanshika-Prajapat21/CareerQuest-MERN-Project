import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../services/services";
import { getError } from "../../services/api";
import { TYPES } from "../../utils/helpers";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name, email: user.email, education: user.education || "", college: user.college || "",
    location: user.location || "", profileImage: user.profileImage || "",
    skills: (user.skills || []).join(", "), interests: (user.interests || []).join(", "),
    preferredTypes: user.preferredTypes || [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleType = (t) =>
    setForm({ ...form, preferredTypes: form.preferredTypes.includes(t) ? form.preferredTypes.filter((x) => x !== t) : [...form.preferredTypes, t] });

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (form.name.trim().length < 2) e.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await userApi.updateProfile(form);
      setUser(res.data);
      toast.success("Profile updated. Your matches will refresh!");
    } catch (err) { toast.error(getError(err)); }
    setSaving(false);
  };

  return (
    <>
      <h1>👤 Your Profile</h1>
      <p className="muted">The more complete your profile, the better your match scores.</p>
      <form className="card form-card" onSubmit={submit} noValidate>
        <div className="form-row">
          <div className="form-group"><label>Name</label><input name="name" value={form.name} onChange={set} />{errors.name && <small className="error">{errors.name}</small>}</div>
          <div className="form-group"><label>Email</label><input name="email" value={form.email} onChange={set} />{errors.email && <small className="error">{errors.email}</small>}</div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Education</label><input name="education" value={form.education} onChange={set} placeholder="MCA, B.Tech, BCA..." /></div>
          <div className="form-group"><label>College</label><input name="college" value={form.college} onChange={set} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Preferred location</label><input name="location" value={form.location} onChange={set} placeholder="Indore" /></div>
          <div className="form-group"><label>Profile image URL (optional)</label><input name="profileImage" value={form.profileImage} onChange={set} /></div>
        </div>
        <div className="form-group"><label>Skills (comma separated)</label><input name="skills" value={form.skills} onChange={set} placeholder="React, JavaScript, Node.js" /></div>
        <div className="form-group"><label>Interests (comma separated)</label><input name="interests" value={form.interests} onChange={set} placeholder="Web Development, AI" /></div>
        <div className="form-group">
          <label>Preferred opportunity types</label>
          <div className="chips">
            {TYPES.map((t) => (
              <label key={t} className={`chip check ${form.preferredTypes.includes(t) ? "on" : ""}`}>
                <input type="checkbox" checked={form.preferredTypes.includes(t)} onChange={() => toggleType(t)} /> {t}
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>
    </>
  );
}
