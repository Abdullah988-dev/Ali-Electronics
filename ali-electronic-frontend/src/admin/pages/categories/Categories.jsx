import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../services/adminService.js";
import { errorMessage } from "../../../config/api.js";
import { imgUrl } from "../../../utils/format.js";
import { useToast } from "../../../context/ToastContext.jsx";
import Modal from "../../../components/common/Modal.jsx";
import ImagePicker from "../../../components/common/ImagePicker.jsx";
import Switch from "../../../components/common/switch.jsx";
import ConfirmDialog from "../../../components/common/ConfirmDialog.jsx";

const emptyForm = { name: "", description: "", isActive: true, image: null };

export default function Categories() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null); // null = band, { category: null } = naya, { category } = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setError("");
      setItems(await adminApi.listCategories());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((c) => c.Name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ category: null });
  };

  const openEdit = (c) => {
    setForm({ name: c.Name, description: c.Description || "", isActive: c.IsActive, image: null });
    setFormError("");
    setModal({ category: c });
  };

  const close = () => setModal(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(modal.category);
    setSaving(true);
    setFormError("");
    try {
      await adminApi.saveCategory(modal.category?.Id, form);
      close();
      toast.success(isEdit ? "Category update ho gayi" : "Category add ho gayi");
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
      await adminApi.deleteCategory(toDelete.Id);
      toast.success("Category delete ho gayi");
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
          <h2>Categories</h2>
          <p className="muted">Fans, Washing Machines, Stabilizers jaisi categories yahan banayen.</p>
        </div>
        <button type="button" className="btn primary" onClick={openNew}>
          <i className="fa-solid fa-plus" /> Add Category
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Category dhundein..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="muted">{filtered.length} categories</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Brands</th>
              <th>Products</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="center muted">
                  <span className="spinner" /> Loading...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="7">
                  <div className="empty">
                    <i className="fa-solid fa-layer-group" />
                    {items.length === 0 ? "Abhi koi category nahi hai. \"Add Category\" dabayen." : "Is naam ki koi category nahi mili."}
                  </div>
                </td>
              </tr>
            )}

            {filtered.map((c) => (
              <tr key={c.Id}>
                <td>
                  {c.ImageUrl ? (
                    <img className="thumb" src={imgUrl(c.ImageUrl)} alt={c.Name} />
                  ) : (
                    <div className="thumb thumb-empty">{c.Name.charAt(0).toUpperCase()}</div>
                  )}
                </td>
                <td>
                  <strong>{c.Name}</strong>
                </td>
                <td className="muted">{c.Slug}</td>
                <td>
                  <span className="pill">{c.BrandCount}</span>
                </td>
                <td>
                  <span className="pill">{c.ProductCount}</span>
                </td>
                <td>
                  <span className={`badge ${c.IsActive ? "ok" : "off"}`}>{c.IsActive ? "Active" : "Inactive"}</span>
                </td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => openEdit(c)}>
                    <i className="fa-solid fa-pen" /> Edit
                  </button>
                  <button type="button" className="btn small danger" onClick={() => setToDelete(c)}>
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
          title={modal.category ? "Edit Category" : "Add Category"}
          subtitle={modal.category ? "Category ki details badlein" : "Nayi category banayen"}
          icon={modal.category ? "fa-pen-to-square" : "fa-layer-group"}
          onClose={close}
        >
          <form onSubmit={submit}>
            {formError && <div className="alert error">{formError}</div>}

            <div className="field">
              <label>
                Category ka naam <span className="req">*</span>
              </label>
              <div className="input-wrap">
                <i className="fa-solid fa-tag lead" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="jaise: Fans, Washing Machines, Stabilizers"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label>Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Is category ke baare me chhoti si detail"
              />
            </div>

            <ImagePicker
              label="Category image"
              currentUrl={modal.category?.ImageUrl}
              file={form.image}
              onChange={(file) => set("image", file)}
            />

            <Switch
              label="Active"
              hint="On ho to website par dikhe gi"
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
          title="Category delete karni hai?"
          message={`"${toDelete.Name}" hamesha ke liye delete ho jaye gi. Agar is me brands ya products hain to delete nahi hogi.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}