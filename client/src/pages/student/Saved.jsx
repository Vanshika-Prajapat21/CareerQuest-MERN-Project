import useFetch from "../../hooks/useFetch";
import { savedApi } from "../../services/services";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import OpportunityCard from "../../components/OpportunityCard";

export default function Saved() {
  const { data, setData, loading, error } = useFetch(() => savedApi.list(), []);

  // When a card is un-saved, remove it from this page right away
  const handleChange = (id, isSaved) => {
    if (!isSaved) setData(data.filter((o) => o._id !== id));
  };

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  return (
    <>
      <h1>🔖 Saved Opportunities</h1>
      {data.length === 0 ? (
        <EmptyState icon="🔖" title="Nothing saved yet" text="Tap Save on any opportunity to keep it here." linkTo="/student/opportunities" linkText="Browse opportunities" />
      ) : (
        <div className="grid">{data.map((o) => <OpportunityCard key={o._id} opp={o} onSavedChange={handleChange} />)}</div>
      )}
    </>
  );
}
