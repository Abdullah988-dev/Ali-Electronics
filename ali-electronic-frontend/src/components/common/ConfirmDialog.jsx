import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  title = "Delete karna hai?",
  message,
  confirmText = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} icon="fa-triangle-exclamation" tone="danger" size="sm" onClose={onCancel}>
      <p className="confirm-text">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn danger-solid" onClick={onConfirm} disabled={busy}>
          <i className="fa-solid fa-trash" /> {busy ? "Deleting..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}