import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getError } from "../services/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", education: "", location: "", skills: "", interests: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "Use at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form); // server turns "React, Node" into an array
      toast.success("Account created!");
      navigate("/student");
    } catch (err) {
      toast.error(getError(err));
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card wide" onSubmit={submit} noValidate>
        <h2>Create your account</h2>
        <p className="muted">Tell us a little so we can match opportunities to you. You can edit this later.</p>
        <div className="form-row">
          <div className="form-group"><label>Full name</label><input name="name" value={form.name} onChange={set} />{errors.name && <small className="error">{errors.name}</small>}</div>
          <div className="form-group"><label>Email</label><input name="email" type="email" value={form.email} onChange={set} />{errors.email && <small className="error">{errors.email}</small>}</div>
        </div>
        <div className="form-group"><label>Password</label><input name="password" type="password" value={form.password} onChange={set} />{errors.password && <small className="error">{errors.password}</small>}</div>
        <div className="form-row">
          <div className="form-group"><label>Education</label><input name="education" value={form.education} onChange={set} placeholder="e.g. MCA" /></div>
          <div className="form-group"><label>Preferred location</label><input name="location" value={form.location} onChange={set} placeholder="e.g. Indore" /></div>
        </div>
        <div className="form-group"><label>Skills (comma separated)</label><input name="skills" value={form.skills} onChange={set} placeholder="React, JavaScript, Node.js" /></div>
        <div className="form-group"><label>Interests (comma separated)</label><input name="interests" value={form.interests} onChange={set} placeholder="Web Development" /></div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? "Creating..." : "Register"}</button>
        <p className="muted center">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
