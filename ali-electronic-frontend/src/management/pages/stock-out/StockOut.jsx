import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mgmtApi } from "../../../services/managementService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, formatDate } from "../../../utils/format.js";
import { useToast } from "../../../context/ToastContext.jsx";

const ALL_REASONS = ["Shop Sale", "Online Order", "Damage", "Return to Supplier", "Other"];
const LABEL = {
  "Shop Sale": "Dukan par sale",
  "Online Order": "Online order",
  Damage: "Kharabi / toot phoot",
  "Return to Supplier": "Supplier ko wapsi",
  Other: "Aur wajah",
};
const BADGE = { "Shop Sale": "ok", "Online Order": "intl", Damage: "off", "Return to Supplier": "warn", Other: "off" };

const unitPrice = (p) =>
  p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price) ? Number(p.DiscountPrice) : Number(p.Price);

const defaultPrice = (p, reason) => (p && reason === "Shop Sale" ? String(unitPrice(p)) : "0");

const emptyForm = { productId: "", quantity: "", reason: "Shop Sale", salePrice: "", customerName: "", note: "" };

export default function StockOut() {
  const toast = useToast();
  const [params] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [reasons, setReasons] = useState(["Shop Sale", "Damage", "Return to Supplier", "Other"]);
  const [form, setForm] = useState({ ...emptyForm, productId: params.get("product") || "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ productId: "", reason: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const inv = await mgmtApi.inventory();
      setProducts(inv.items);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const query = { page, limit: 10 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) query[k] = v;
      });
      setData(await mgmtApi.stockOut(query));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadProducts();
    mgmtApi.meta().then((m) => setReasons(m.stockOutReasons)).catch(() => {});
  }, [loadProducts]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const selected = products.find((p) => String(p.Id) === String(form.productId));
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const pickProduct = (productId) => {
    const p = products.find((x) => String(x.Id) === String(productId));
    setForm((f) => ({ ...f, productId, quantity: "", salePrice: defaultPrice(p, f.reason) }));
  };

  const pickReason = (reason) => setForm((f) => ({ ...f, reason, salePrice: defaultPrice(selected, reason) }));

  // inventory se "Out" dabane par product pehle se chuna hua aaye
  useEffect(() => {
    if (products.length && form.productId && form.salePrice === "") pickProduct(form.productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const result = await mgmtApi.addStockOut({
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        reason: form.reason,
        salePrice: form.salePrice === "" ? undefined : Number(form.salePrice),
        customerName: form.customerName,
        note: form.note,
      });
      toast.success(`${result.productName}: ${result.quantity} pcs nikal diye. Ab baaki ${result.remaining} pcs`);
      setForm((f) => ({ ...f, quantity: "", customerName: "", note: "" }));
      await Promise.all([loadProducts(), loadHistory()]);
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
          <h2>Stock Out (maal gaya)</h2>
          <p className="muted">Dukan par sale, kharabi ya supplier ko wapsi, yahan entry karein. Online orders khud yahan aa jate hain.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="panel" onSubmit={submit}>
        <h3>
          <i className="fa-solid fa-circle-arrow-up" /> Maal nikalein
        </h3>

        {formError && (
          <div className="alert error">
            <i className="fa-solid fa-circle-exclamation" /> {formError}
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label>
              Product <span className="req">*</span>
            </label>
            <select value={form.productId} onChange={(e) => pickProduct(e.target.value)} required>
              <option value="">Product chunein</option>
              {products.map((p) => (
                <option key={p.Id} value={p.Id} disabled={p.Remaining <= 0}>
                  {p.Name}
                  {p.BrandName ? ` (${p.BrandName})` : ""} - {p.Remaining <= 0 ? "khatam" : `baaki ${p.Remaining}`}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              Wajah <span className="req">*</span>
            </label>
            <select value={form.reason} onChange={(e) => pickReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {LABEL[r] || r}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              Kitne pieces <span className="req">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selected ? selected.Remaining : undefined}
              step="1"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="1"
              required
            />
          </div>

          <div className="field">
            <label>Sale price (ek piece ki)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.salePrice}
              onChange={(e) => set("salePrice", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="field">
            <label>Customer ka naam (optional)</label>
            <input type="text" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="jaise: Ahmed sahab" />
          </div>

          <div className="field">
            <label>Note (optional)</label>
            <input type="text" value={form.note} onChange={(e) => set("note", e.target.value)} />
          </div>
        </div>

        {selected && (
          <div className="pick-info">
            <span>
              Abhi baaki: <strong>{selected.Remaining} pcs</strong>
            </span>
            <span>
              Product ki price: <strong>{formatPrice(unitPrice(selected))}</strong>
            </span>
            {Number(form.quantity) > 0 && Number(form.salePrice) > 0 && (
              <span>
                Kul sale: <strong>{formatPrice(Number(form.quantity) * Number(form.salePrice))}</strong>
              </span>
            )}
          </div>
        )}

        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 14 }}>
          Kharabi ya supplier ko wapsi me sale price 0 rehti hai, wo sale/munafe me nahi ginti jati.
        </p>

        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner dark" /> Saving...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" /> Maal nikalein
            </>
          )}
        </button>
      </form>

      <h3 style={{ marginBottom: 12 }}>Pichli entries</h3>

      <div className="filters-row">
        <div className="field">
          <label>Product</label>
          <select value={filters.productId} onChange={(e) => setFilter("productId", e.target.value)}>
            <option value="">Sab</option>
            {products.map((p) => (
              <option key={p.Id} value={p.Id}>
                {p.Name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Wajah</label>
          <select value={filters.reason} onChange={(e) => setFilter("reason", e.target.value)}>
            <option value="">Sab</option>
            {ALL_REASONS.map((r) => (
              <option key={r} value={r}>
                {LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Se</label>
          <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        </div>
        <div className="field">
          <label>Tak</label>
          <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
        </div>
        <span className="muted" style={{ marginLeft: "auto" }}>{data.total} entries</span>
      </div>

      <div className="table-wrap">
        <table className="table" style={{ minWidth: 880 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Pieces</th>
              <th>Sale price</th>
              <th>Wajah</th>
              <th>Customer</th>
              <th>Note</th>
              <th>Kis ne</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="8" className="center muted">
                  <span className="spinner" /> Loading...
                </td>
              </tr>
            )}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="8">
                  <div className="empty">
                    <i className="fa-solid fa-circle-arrow-up" />
                    Koi entry nahi mili.
                  </div>
                </td>
              </tr>
            )}
            {data.items.map((r) => (
              <tr key={r.Id}>
                <td className="muted">{formatDate(r.CreatedAt)}</td>
                <td>
                  <strong>{r.ProductName}</strong>
                </td>
                <td className="num-out">-{r.Quantity}</td>
                <td>{Number(r.SalePrice) > 0 ? formatPrice(r.SalePrice) : <span className="muted">-</span>}</td>
                <td>
                  <span className={`badge ${BADGE[r.Reason] || "off"}`}>{LABEL[r.Reason] || r.Reason}</span>
                  {r.OrderId && <small className="muted"> #{r.OrderId}</small>}
                </td>
                <td>{r.CustomerName || <span className="muted">-</span>}</td>
                <td className="muted">{r.Note || "-"}</td>
                <td className="muted">{r.CreatedByName || (r.OrderId ? "Website" : "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="pager">
          <button type="button" className="btn small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <i className="fa-solid fa-chevron-left" /> Prev
          </button>
          <span>
            Page {data.page} / {data.totalPages}
          </span>
          <button type="button" className="btn small" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}