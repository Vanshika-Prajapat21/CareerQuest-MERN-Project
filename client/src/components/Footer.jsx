import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand">Career<span>Quest</span></div>
          <p>One place to discover internships, hackathons, scholarships and more, matched to your skills.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link to="/explore?type=Internship">Internships</Link>
          <Link to="/explore?type=Hackathon">Hackathons</Link>
          <Link to="/explore?type=Scholarship">Scholarships</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
      <div className="container copy">© {new Date().getFullYear()} CareerQuest. Built for students.</div>
    </footer>
  );
}
