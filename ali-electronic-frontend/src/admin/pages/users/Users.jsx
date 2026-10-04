import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../services/adminService.js";
import { errorMessage } from "../../../config/api.js";
import { formatDate } from "../../../utils/format.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../context/ToastContext.jsx";
import Modal from "../../../components/common/Modal.jsx";
import Switch from "../../../components/common/switch.jsx";

const TABS = [
  { value: "", label: "Sab" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
  { value: "customer", label: "Customers" },
];
const ROLE_BADGE = { admin: "warn", staff: "intl", customer: "ok" };
const ROLE_LABEL = { admin: "Admin", staff: "Staff", customer: "Customer" };

const emptyCreate = { name: "", email: "", phone: "", password: "", role: "staff" };

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", user }
  const [form, setForm] = useState(emptyCreate);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    try {
      setError("");
      setUsers(await adminApi.listUsers());
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
    return users.filter(
      (u) =>
        (!tab || u.Role === tab) &&
        (!q || [u.Name, u.Email, u.Phone].some((v) => v && String(v).toLowerCase().includes(q)))
    );
  }, [users, tab, search]);

  const counts = useMemo(() => {
    const c = { "": users.length };
    users.forEach((u) => (c[u.Role] = (c[u.Role] || 0) + 1));
    return c;
  }, [users]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setForm(emptyCreate);
    setFormError("");
    setModal({ mode: "create" });
  };

  const openEdit = (u) => {
    setForm({ name: u.Name, phone: u.Phone || "", role: u.Role, isActive: u.IsActive, password: "" });
    setFormError("");
    setModal({ mode: "edit", user: u });
  };

  const close = () => setModal(null);
  const isSelf = modal?.mode === "edit" && modal.user.Id === me?.id;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (modal.mode === "create") {
        await adminApi.createUser(form);
        toast.success("Account ban gaya");
      } else {
        const payload = { name: form.name, phone: form.phone };
        if (!isSelf) {
          payload.role = form.role;
          payload.isActive = form.isActive;
        }
        if (form.password) payload.password = form.password;
        await adminApi.updateUser(modal.user.Id, payload);
        toast.success("Account update ho gaya");
      }
      close();
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Users</h2>
          <p className="muted">Staff (munshi/cashier) ke account yahan banayen. Staff sirf Management System chala sakta hai.</p>
        </div>
        <button type="button" className="btn primary" onClick={openCreate}>
          <i className="fa-solid fa-user-plus" /> Add Staff
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.value} type="button" className={`tab ${tab === t.value ? "active" : ""}`} onClick={() => setTab(t.value)}>
            {t.label} <em>{counts[t.value] || 0}</em>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input type="text" placeholder="Naam, email ya phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="muted">{filtered.length} users</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Bana</th>
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
                    <i className="fa-solid fa-users" />
                    Koi user nahi mila.
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.Id}>
                <td>
                  <strong>{u.Name}</strong>
                  {u.Id === me?.id && <small className="muted"> (aap)</small>}
                </td>
                <td className="muted">{u.Email}</td>
                <td>{u.Phone || <span className="muted">-</span>}</td>
                <td>
                  <span className={`badge ${ROLE_BADGE[u.Role] || "off"}`}>{ROLE_LABEL[u.Role] || u.Role}</span>
                </td>
                <td>
                  <span className={`badge ${u.IsActive ? "ok" : "off"}`}>{u.IsActive ? "Active" : "Band"}</span>
                </td>
                <td className="muted">{formatDate(u.CreatedAt)}</td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => openEdit(u)}>
                    <i className="fa-solid fa-pen" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Naya Staff / Admin" : "Edit User"}
          subtitle={modal.mode === "create" ? "Munshi ya cashier ka account banayen" : modal.user.Email}
          icon={modal.mode === "create" ? "fa-user-plus" : "fa-user-pen"}
          onClose={close}
        >
          <form onSubmit={submit}>
            {formError && <div className="alert error">{formError}</div>}

            <div className="field">
              <label>
                Poora naam <span className="req">*</span>
              </label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
            </div>

            {modal.mode === "create" && (
              <div className="field">
                <label>
                  Email <span className="req">*</span>
                </label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="munshi@alielectronic.com" required />
              </div>
            )}

            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX XXXXXXX" />
            </div>

            <div className="field">
              <label>
                {modal.mode === "create" ? "Password (kam az kam 8 characters)" : "Naya password (badalna ho to hi likhein)"}
                {modal.mode === "create" && <span className="req"> *</span>}
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                minLength={8}
                required={modal.mode === "create"}
                autoComplete="off"
              />
            </div>

            {modal.mode === "create" ? (
              <div className="field">
                <label>Role</label>
                <div className="seg">
                  <button type="button" className={form.role === "staff" ? "active" : ""} onClick={() => set("role", "staff")}>
                    <i className="fa-solid fa-user-tag" /> Staff
                  </button>
                  <button type="button" className={form.role === "admin" ? "active" : ""} onClick={() => set("role", "admin")}>
                    <i className="fa-solid fa-user-shield" /> Admin
                  </button>
                </div>
              </div>
            ) : isSelf ? (
              <div className="hint">
                <i className="fa-solid fa-circle-info" /> Ye aap ka apna account hai, is ka role aur status yahan se nahi badal sakte.
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => set("role", e.target.value)}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <Switch
                  label="Active"
                  hint="Band karne par ye banda login nahi kar sake ga"
                  checked={form.isActive}
                  onChange={(value) => set("isActive", value)}
                />
              </>
            )}

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
    </div>
  );
}