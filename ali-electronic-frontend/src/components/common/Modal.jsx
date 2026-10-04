import { useEffect } from "react";

export default function Modal({ title, subtitle, icon = "fa-pen-to-square", tone, size, onClose, children }) {
  // Esc dabane se band ho, aur modal khula ho to peeche ka page scroll na kare
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${size || ""} ${tone ? `tone-${tone}` : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-icon">
            <i className={`fa-solid ${icon}`} />
          </div>
          <div className="modal-titles">
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}