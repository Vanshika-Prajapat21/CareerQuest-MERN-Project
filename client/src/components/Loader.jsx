export default function Loader({ text = "Loading..." }) {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
      <p className="muted">{text}</p>
    </div>
  );
}
