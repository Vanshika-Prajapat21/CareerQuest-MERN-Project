import { Link } from "react-router-dom";

export default function EmptyState({ icon = "🔍", title, text, linkTo, linkText }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {linkTo && <Link to={linkTo} className="btn btn-primary">{linkText}</Link>}
    </div>
  );
}
