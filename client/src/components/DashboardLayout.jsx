import { useState } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STUDENT_LINKS = [
  ["/student", "🏠", "Dashboard", true],
  ["/student/recommended", "✨", "Recommended For You"],
  ["/student/opportunities", "🔎", "All Opportunities"],
  ["/student/saved", "🔖", "Saved"],
  ["/student/applications", "📋", "My Applications"],
  ["/student/notifications", "🔔", "Notifications"],
  ["/student/profile", "👤", "Profile"],
  ["/student/portfolio", "🗂️", "My Career Portfolio"],
  ["/student/settings", "⚙️", "Settings"],
];

const ADMIN_LINKS = [
  ["/admin", "📊", "Dashboard", true],
  ["/admin/opportunities", "🗂️", "Manage Opportunities"],
  ["/admin/opportunities/new", "➕", "Add Opportunity"],
  ["/admin/applications", "📨", "Applications"],
  ["/admin/users", "👥", "Manage Users"],
  ["/admin/categories", "🏷️", "Categories"],
  ["/admin/reports", "🚩", "Reports"],
];

// Sidebar + content area used by both student and admin pages
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = user.role === "admin" ? ADMIN_LINKS : STUDENT_LINKS;

  return (
    <div className="dash">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link to="/" className="brand">Career<span>Quest</span></Link>
        <div className="side-user">
          <div className="avatar">{user.name[0]}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === "admin" ? "Administrator" : user.education || "Student"}</small>
          </div>
        </div>
        <nav onClick={() => setOpen(false)}>
          {links.map(([to, icon, label, end]) => (
            <NavLink key={to} to={to} end={end}>{icon} {label}</NavLink>
          ))}
        </nav>
        <button className="btn btn-outline btn-sm side-logout" onClick={() => { logout(); navigate("/"); }}>Logout</button>
      </aside>
      <div className="dash-main">
        <div className="dash-top">
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <Link to="/explore" className="muted">Public site →</Link>
        </div>
        <div className="dash-content"><Outlet /></div>
      </div>
    </div>
  );
}
