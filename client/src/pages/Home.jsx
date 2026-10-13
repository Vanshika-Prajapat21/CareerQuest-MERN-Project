import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { opportunityApi } from "../services/services";
import OpportunityCard from "../components/OpportunityCard";
import Loader from "../components/Loader";
import { TYPE_ICONS } from "../utils/helpers";

const STEPS = [
  ["1", "Build your profile", "Add your skills, interests, education and preferred location."],
  ["2", "Get matched", "We score every opportunity against your profile from 0 to 100."],
  ["3", "Apply and track", "Apply on the official website or through CareerQuest, and track every application."],
];

const WHY = [
  ["🎯", "Personalized matches", "See a match percentage and exactly why an opportunity fits you."],
  ["📚", "Everything in one place", "Internships, hackathons, scholarships, workshops and more."],
  ["⏰", "Never miss a deadline", "Deadline reminders for the opportunities you saved."],
  ["📋", "Track your journey", "Move each application from Interested to Selected."],
];

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data, loading, error } = useFetch(() => opportunityApi.list({ featured: "true", limit: 6 }), []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="pill">🚀 Built for students</span>
          <h1>Discover Your Next Opportunity</h1>
          <p>Find internships, hackathons, scholarships, competitions and learning opportunities tailored to your skills.</p>
          <form className="search-bar" onSubmit={search}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search React internship, hackathon, scholarship..." />
            <button className="btn btn-primary">Search</button>
          </form>
          <Link to="/explore" className="btn btn-light">Explore Opportunities</Link>
        </div>
      </section>

      <section className="section container">
        <h2 className="section-title">Browse Categories</h2>
        <div className="cat-grid">
          {Object.entries(TYPE_ICONS).map(([type, icon]) => (
            <Link key={type} to={`/explore?type=${encodeURIComponent(type)}`} className="card cat-card">
              <span>{icon}</span>
              <strong>{type}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <h2 className="section-title">Featured Opportunities</h2>
        {loading && <Loader />}
        {error && <p className="error-box">{error}</p>}
        {data && <div className="grid">{data.opportunities.map((o) => <OpportunityCard key={o._id} opp={o} />)}</div>}
        {data && data.opportunities.length === 0 && <p className="muted">No featured opportunities yet. Run the seed script.</p>}
      </section>

      <section className="section alt">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="grid-3">
            {STEPS.map(([n, t, d]) => (
              <div key={n} className="card step"><div className="step-no">{n}</div><h3>{t}</h3><p className="muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <h2 className="section-title">Why CareerQuest</h2>
        <div className="grid-4">
          {WHY.map(([i, t, d]) => (
            <div key={t} className="card why"><div className="why-icon">{i}</div><h3>{t}</h3><p className="muted">{d}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}
