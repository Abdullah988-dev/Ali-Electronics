import { useEffect, useState } from "react";
import { mgmtApi } from "../../../services/managementService.js";
import { errorMessage } from "../../../config/api.js";
import { useToast } from "../../../context/ToastContext.jsx";
import Modal from "../../../components/common/Modal.jsx";
import Switch from "../../../components/common/switch.jsx";
import ConfirmDialog from "../../../components/common/ConfirmDialog.jsx";

const emptyForm = { name: "", phone: "", address: "", isActive: true };

export default function Suppliers() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null); // null = band, { supplier: null } = naya, { supplier } = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setError("");
      setItems(await mgmtApi.suppliers());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ supplier: null });
  };

  const openEdit = (s) => {
    setForm({ name: s.Name, phone: s.Phone || "", address: s.Address || "", isActive: s.IsActive });
    setFormError("");
    setModal({ supplier: s });
  };

  const close = () => setModal(null);

  const submit = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(modal.supplier);
    setSaving(true);
    setFormError("");
    try {
      await mgmtApi.saveSupplier(modal.supplier?.Id, form);
      close();
      toast.success(isEdit ? "Supplier update ho gaya" : "Supplier add ho gaya");
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await mgmtApi.deleteSupplier(toDelete.Id);
      toast.success("Supplier delete ho gaya");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Suppliers</h2>
          <p className="muted">Jin se aap maal mangwate hain.</p>
        </div>
        <button type="button" className="btn primary" onClick={openNew}>
          <i className="fa-solid fa-plus" /> Add Supplier
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Ab tak maal (pcs)</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="center muted">
                  <span className="spinner" /> Loading...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan="6">
                  <div className="empty">
                    <i className="fa-solid fa-handshake" />
                    Abhi koi supplier nahi hai. "Add Supplier" dabayen.
                  </div>
                </td>
              </tr>
            )}
            {items.map((s) => (
              <tr key={s.Id}>
                <td>
                  <strong>{s.Name}</strong>
                </td>
                <td>{s.Phone || <span className="muted">-</span>}</td>
                <td className="muted">{s.Address || "-"}</td>
                <td>
                  <span className="pill">{s.TotalSupplied}</span>
                </td>
                <td>
                  <span className={`badge ${s.IsActive ? "ok" : "off"}`}>{s.IsActive ? "Active" : "Inactive"}</span>
                </td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => openEdit(s)}>
                    <i className="fa-solid fa-pen" /> Edit
                  </button>
                  <button type="button" className="btn small danger" onClick={() => setToDelete(s)}>
                    <i className="fa-solid fa-trash" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.supplier ? "Edit Supplier" : "Add Supplier"}
          subtitle={modal.supplier ? "Supplier ki details badlein" : "Naya supplier banayen"}
          icon={modal.supplier ? "fa-pen-to-square" : "fa-handshake"}
          onClose={close}
        >
          <form onSubmit={submit}>
            {formError && <div className="alert error">{formError}</div>}

            <div className="field">
              <label>
                Supplier ka naam <span className="req">*</span>
              </label>
              <div className="input-wrap">
                <i className="fa-solid fa-user-tie lead" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="jaise: Ali Traders"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX XXXXXXX" />
            </div>

            <div className="field">
              <label>Address</label>
              <textarea value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Dukan / godown ka address" />
            </div>

            <Switch
              label="Active"
              hint="Band karne par Stock In ki list me nahi aaye ga"
              checked={form.isActive}
              onChange={(value) => set("isActive", value)}
            />

            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner dark" /> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" /> Save
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Supplier delete karna hai?"
          message={`"${toDelete.Name}" delete ho jaye ga. Agar is se maal aane ki entries judi hain to delete nahi hoga, us surat me Inactive kar dein.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}