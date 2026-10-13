import { useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { recommendationApi } from "../../services/services";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import OpportunityCard from "../../components/OpportunityCard";

const TABS = [["All", 0], ["Excellent 90+", 90], ["Good 75+", 75], ["Relevant 60+", 60]];

export default function Recommended() {
  const [min, setMin] = useState(0);
  const { data, loading, error } = useFetch(() => recommendationApi.list({ min }), [min]);

  return (
    <>
      <h1>✨ Recommended For You</h1>
      <p className="muted">Sorted from highest to lowest match. Better profile, better matches.</p>
      <div className="tabs">
        {TABS.map(([label, value]) => (
          <button key={label} className={min === value ? "tab active" : "tab"} onClick={() => setMin(value)}>{label}</button>
        ))}
      </div>
      {loading && <Loader />}
      {error && <p className="error-box">{error}</p>}
      {data && data.length === 0 && (
        <EmptyState icon="✨" title="No matches in this range" text="Add more skills and interests to your profile to improve matches." linkTo="/student/profile" linkText="Update profile" />
      )}
      {data && <div className="grid">{data.map((o) => <OpportunityCard key={o._id} opp={o} />)}</div>}
    </>
  );
}
