import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../services/adminService.js";
import { errorMessage } from "../../../config/api.js";
import { imgUrl } from "../../../utils/format.js";
import { useToast } from "../../../context/ToastContext.jsx";
import Modal from "../../../components/common/Modal.jsx";
import ImagePicker from "../../../components/common/ImagePicker.jsx";
import Switch from "../../../components/common/switch.jsx";
import ConfirmDialog from "../../../components/common/ConfirmDialog.jsx";

const emptyForm = { name: "", categoryId: "", isLocal: true, isActive: true, image: null };

export default function Brands() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [modal, setModal] = useState(null); // null = band, { brand: null } = naya, { brand } = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setError("");
      const [brands, cats] = await Promise.all([adminApi.listBrands(), adminApi.listCategories()]);
      setItems(brands);
      setCategories(cats);
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
    return items.filter(
      (b) =>
        (!categoryFilter || String(b.CategoryId) === categoryFilter) && (!q || b.Name.toLowerCase().includes(q))
    );
  }, [items, search, categoryFilter]);

  const openNew = () => {
    setForm({ ...emptyForm, categoryId: categoryFilter });
    setFormError("");
    setModal({ brand: null });
  };

  const openEdit = (b) => {
    setForm({
      name: b.Name,
      categoryId: String(b.CategoryId),
      isLocal: b.IsLocal,
      isActive: b.IsActive,
      image: null,
    });
    setFormError("");
    setModal({ brand: b });
  };

  const close = () => setModal(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(modal.brand);
    setSaving(true);
    setFormError("");
    try {
      await adminApi.saveBrand(modal.brand?.Id, form);
      close();
      toast.success(isEdit ? "Brand update ho gayi" : "Brand add ho gayi");
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
      await adminApi.deleteBrand(toDelete.Id);
      toast.success("Brand delete ho gayi");
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
          <h2>Brands</h2>
          <p className="muted">Local aur international brands, category ke hisaab se yahan banayen.</p>
        </div>
        <button type="button" className="btn primary" onClick={openNew}>
          <i className="fa-solid fa-plus" /> Add Brand
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Brand dhundein..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Saari categories</option>
            {categories.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.Name}
              </option>
            ))}
          </select>
        </div>
        <span className="muted">{filtered.length} brands</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Type</th>
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
                    <i className="fa-solid fa-tags" />
                    {items.length === 0 ? "Abhi koi brand nahi hai. \"Add Brand\" dabayen." : "Is filter me koi brand nahi mili."}
                  </div>
                </td>
              </tr>
            )}

            {filtered.map((b) => (
              <tr key={b.Id}>
                <td>
                  {b.LogoUrl ? (
                    <img className="thumb" src={imgUrl(b.LogoUrl)} alt={b.Name} />
                  ) : (
                    <div className="thumb thumb-empty">{b.Name.charAt(0).toUpperCase()}</div>
                  )}
                </td>
                <td>
                  <strong>{b.Name}</strong>
                </td>
                <td className="muted">{b.CategoryName}</td>
                <td>
                  <span className={`badge ${b.IsLocal ? "local" : "intl"}`}>{b.IsLocal ? "Local" : "International"}</span>
                </td>
                <td>
                  <span className="pill">{b.ProductCount}</span>
                </td>
                <td>
                  <span className={`badge ${b.IsActive ? "ok" : "off"}`}>{b.IsActive ? "Active" : "Inactive"}</span>
                </td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => openEdit(b)}>
                    <i className="fa-solid fa-pen" /> Edit
                  </button>
                  <button type="button" className="btn small danger" onClick={() => setToDelete(b)}>
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
          title={modal.brand ? "Edit Brand" : "Add Brand"}
          subtitle={modal.brand ? "Brand ki details badlein" : "Nayi brand banayen"}
          icon={modal.brand ? "fa-pen-to-square" : "fa-tags"}
          onClose={close}
        >
          <form onSubmit={submit}>
            {formError && <div className="alert error">{formError}</div>}

            {categories.length === 0 && (
              <div className="alert error">Pehle Categories me koi category banayen, phir brand add hogi.</div>
            )}

            <div className="field">
              <label>
                Brand ka naam <span className="req">*</span>
              </label>
              <div className="input-wrap">
                <i className="fa-solid fa-tag lead" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="jaise: GFC, Pak Fans, Dawlance"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label>
                Category <span className="req">*</span>
              </label>
              <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
                <option value="">Category select karein</option>
                {categories.map((c) => (
                  <option key={c.Id} value={c.Id}>
                    {c.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Brand ki type</label>
              <div className="seg">
                <button type="button" className={form.isLocal ? "active" : ""} onClick={() => set("isLocal", true)}>
                  <i className="fa-solid fa-house-flag" /> Local
                </button>
                <button type="button" className={!form.isLocal ? "active" : ""} onClick={() => set("isLocal", false)}>
                  <i className="fa-solid fa-globe" /> International
                </button>
              </div>
            </div>

            <ImagePicker
              label="Brand logo"
              currentUrl={modal.brand?.LogoUrl}
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
          title="Brand delete karni hai?"
          message={`"${toDelete.Name}" delete ho jaye gi. Agar is brand ke products bane hue hain to delete nahi hogi.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}