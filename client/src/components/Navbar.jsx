import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile menu

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand">Career<span>Quest</span></Link>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        <nav className={`nav-links ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
          <NavLink to="/explore">Explore</NavLink>
          <NavLink to="/about">About</NavLink>
          {user ? (
            <>
              <Link className="btn btn-outline btn-sm" to={user.role === "admin" ? "/admin" : "/student"}>Dashboard</Link>
              <button className="btn btn-primary btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn btn-outline btn-sm" to="/login">Login</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
