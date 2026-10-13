import { useEffect } from "react";

// A simple centered dialog. Esc or clicking the dark area closes it.
export default function Modal({ title, children, actions, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
        <div className="actions modal-actions">{actions}</div>
      </div>
    </div>
  );
}
