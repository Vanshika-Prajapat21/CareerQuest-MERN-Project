import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { opportunityApi } from "../services/services";
import { getError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import OpportunityCard from "../components/OpportunityCard";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { TYPES, MODES } from "../utils/helpers";

const EMPTY = { q: "", type: "", skills: "", location: "", mode: "", organization: "", within: "", sort: "" };

export default function Explore() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  // Start with values from the URL (e.g. /explore?type=Hackathon)
  const [filters, setFilters] = useState({ ...EMPTY, q: params.get("q") || "", type: params.get("type") || "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ opportunities: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: meta } = useFetch(() => opportunityApi.meta(), []);

  // Re-fetch whenever a filter or the page changes
  useEffect(() => {
    const query = { page, limit: 9 };
    Object.entries(filters).forEach(([k, v]) => { if (v && k !== "within") query[k] = v; });
    if (filters.within) query.deadline = new Date(Date.now() + Number(filters.within) * 86400000).toISOString();

    setLoading(true);
    // wait 300ms after the last keystroke so we don't call the API on every letter
    const timer = setTimeout(() => {
      opportunityApi.list(query)
        .then((res) => { setResult(res.data); setError(""); })
        .catch((err) => setError(getError(err)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, page, user]);

  const change = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  return (
    <div className="container explore">
      <h1>Explore Opportunities</h1>
      <p className="muted">{result.total} opportunities found {user?.role === "student" && "· sorted by your best match"}</p>

      <div className="card filters">
        <input name="q" value={filters.q} onChange={change} placeholder="🔎 Search title, organization, skill..." className="filter-search" />
        <select name="type" value={filters.type} onChange={change}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select name="mode" value={filters.mode} onChange={change}>
          <option value="">Online / Offline / Hybrid</option>
          {MODES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select name="skills" value={filters.skills} onChange={change}>
          <option value="">Any skill</option>
          {meta?.skills.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="location" value={filters.location} onChange={change}>
          <option value="">Any location</option>
          {meta?.locations.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select name="organization" value={filters.organization} onChange={change}>
          <option value="">Any organization</option>
          {meta?.organizations.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select name="within" value={filters.within} onChange={change}>
          <option value="">Any deadline</option>
          <option value="7">Closing in 7 days</option>
          <option value="14">Closing in 14 days</option>
          <option value="30">Closing in 30 days</option>
        </select>
        <select name="sort" value={filters.sort} onChange={change}>
          <option value="">Default order</option>
          {user?.role === "student" && <option value="match">Best match</option>}
          <option value="deadline">Deadline (soonest)</option>
          <option value="newest">Newest</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => { setFilters(EMPTY); setPage(1); }}>Clear</button>
      </div>

      {loading && <Loader />}
      {error && <p className="error-box">{error}</p>}
      {!loading && !error && result.opportunities.length === 0 && (
        <EmptyState title="No opportunities found" text="Try removing some filters or searching with different words." />
      )}
      {!loading && result.opportunities.length > 0 && (
        <div className="grid">{result.opportunities.map((o) => <OpportunityCard key={o._id} opp={o} />)}</div>
      )}

      {result.pages > 1 && (
        <div className="pager">
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page} of {result.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page === result.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
