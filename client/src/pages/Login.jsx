import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getError } from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      e.email = "Enter a valid email";
    }

    if (!form.password) {
      e.password = "Password is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const user = await login(form.email, form.password, role);

      toast.success(`Welcome back, ${user.name}!`);

      const dashboard = user.role === "admin" ? "/admin" : "/student";
      const requestedPath = location.state?.from;

      // Don't redirect a user to a page belonging to the wrong role.
      const validRequestedPath =
        typeof requestedPath === "string" &&
        (user.role === "admin"
          ? requestedPath.startsWith("/admin")
          : requestedPath.startsWith("/student"));

      navigate(validRequestedPath ? requestedPath : dashboard, {
        replace: true,
      });
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h2>Welcome back</h2>
        <p className="muted">Log in to continue to CareerQuest.</p>

        <div className="form-group">
          <label>Login as</label>
          <div className="role-selector">
            <button
              type="button"
              className={`btn ${role === "student" ? "btn-primary" : "btn-outline"}`}
              aria-pressed={role === "student"}
              onClick={() => setRole("student")}
              disabled={loading}
            >
              Student
            </button>

            <button
              type="button"
              className={`btn ${role === "admin" ? "btn-primary" : "btn-outline"}`}
              aria-pressed={role === "admin"}
              onClick={() => setRole("admin")}
              disabled={loading}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
          {errors.email && <small className="error">{errors.email}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
          {errors.password && (
            <small className="error">{errors.password}</small>
          )}
        </div>

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading
            ? "Logging in..."
            : `Login as ${role === "admin" ? "Admin" : "Student"}`}
        </button>

        {role === "student" && (
          <p className="muted center">
            New here? <Link to="/register">Create an account</Link>
          </p>
        )}

        {role === "admin" && (
          <p className="muted center">
            Admin access is available only to an existing admin account.
          </p>
        )}
      </form>
    </div>
  );
}