// Shows "92% Excellent Match" in a colour that depends on the label
const COLORS = { "Excellent Match": "m-excellent", "Good Match": "m-good", Relevant: "m-relevant", Explore: "m-explore" };

export default function MatchBadge({ match }) {
  if (!match) return null;
  return (
    <div className={`match ${COLORS[match.label]}`}>
      <strong>{match.score}%</strong>
      <span>{match.label}</span>
    </div>
  );
}
