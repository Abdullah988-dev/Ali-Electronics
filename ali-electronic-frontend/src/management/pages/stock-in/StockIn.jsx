import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mgmtApi } from "../../../services/managementService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, formatDate } from "../../../utils/format.js";
import { useToast } from "../../../context/ToastContext.jsx";

const emptyForm = { productId: "", supplierId: "", quantity: "", costPrice: "", note: "" };

export default function StockIn() {
  const toast = useToast();
  const [params] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, productId: params.get("product") || "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ productId: "", supplierId: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLookups = useCallback(async () => {
    try {
      const [inv, sup] = await Promise.all([mgmtApi.inventory(), mgmtApi.suppliers()]);
      setProducts(inv.items);
      setSuppliers(sup.filter((s) => s.IsActive));
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
      setData(await mgmtApi.stockIn(query));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const selected = products.find((p) => String(p.Id) === String(form.productId));

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // product chunte hi pichla kharid rate bhar do (badal sakte hain)
  const pickProduct = (productId) => {
    const p = products.find((x) => String(x.Id) === String(productId));
    setForm((f) => ({
      ...f,
      productId,
      costPrice: p && Number(p.LastCost) > 0 ? String(p.LastCost) : f.costPrice,
    }));
  };

  // inventory se "In" dabane par product pehle se chuna hua aaye
  useEffect(() => {
    if (products.length && form.productId && form.costPrice === "") pickProduct(form.productId);
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
      const result = await mgmtApi.addStockIn({
        productId: Number(form.productId),
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        quantity: Number(form.quantity),
        costPrice: form.costPrice === "" ? 0 : Number(form.costPrice),
        note: form.note,
      });
      toast.success(`${result.productName}: ${result.quantity} pcs add ho gaye. Ab baaki ${result.remaining} pcs`);
      setForm((f) => ({ ...f, quantity: "", note: "" }));
      await Promise.all([loadLookups(), loadHistory()]);
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
          <h2>Stock In (maal aaya)</h2>
          <p className="muted">Jab bhi naya maal aaye, yahan entry karein. Website par stock khud barh jata hai.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="panel" onSubmit={submit}>
        <h3>
          <i className="fa-solid fa-circle-arrow-down" /> Naya maal add karein
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
                <option key={p.Id} value={p.Id}>
                  {p.Name}
                  {p.BrandName ? ` (${p.BrandName})` : ""} - baaki {p.Remaining}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Supplier (optional)</label>
            <select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
              <option value="">Supplier nahi / pata nahi</option>
              {suppliers.map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.Name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              Kitne pieces aaye <span className="req">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="10"
              required
            />
          </div>

          <div className="field">
            <label>Kharid rate (ek piece ka)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.costPrice}
              onChange={(e) => set("costPrice", e.target.value)}
              placeholder="9000"
            />
          </div>

          <div className="field full">
            <label>Note (optional)</label>
            <input type="text" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="jaise: bill number, gaari ka naam" />
          </div>
        </div>

        {selected && (
          <div className="pick-info">
            <span>
              Abhi baaki: <strong>{selected.Remaining} pcs</strong>
            </span>
            <span>
              Pichla kharid rate: <strong>{Number(selected.LastCost) > 0 ? formatPrice(selected.LastCost) : "likha nahi"}</strong>
            </span>
            {Number(form.quantity) > 0 && Number(form.costPrice) > 0 && (
              <span>
                Kul lagat: <strong>{formatPrice(Number(form.quantity) * Number(form.costPrice))}</strong>
              </span>
            )}
          </div>
        )}

        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 14 }}>
          Kharid rate zaroor likhein, taake reports me munafa sahi nazar aaye.
        </p>

        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner dark" /> Saving...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" /> Maal add karein
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
          <label>Supplier</label>
          <select value={filters.supplierId} onChange={(e) => setFilter("supplierId", e.target.value)}>
            <option value="">Sab</option>
            {suppliers.map((s) => (
              <option key={s.Id} value={s.Id}>
                {s.Name}
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
        <table className="table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Pieces</th>
              <th>Kharid rate</th>
              <th>Kul lagat</th>
              <th>Supplier</th>
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
                    <i className="fa-solid fa-circle-arrow-down" />
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
                <td className="num-in">+{r.Quantity}</td>
                <td>{Number(r.CostPrice) > 0 ? formatPrice(r.CostPrice) : <span className="muted">-</span>}</td>
                <td>{Number(r.CostPrice) > 0 ? formatPrice(r.Quantity * r.CostPrice) : <span className="muted">-</span>}</td>
                <td>{r.SupplierName || <span className="muted">-</span>}</td>
                <td className="muted">{r.Note || "-"}</td>
                <td className="muted">{r.CreatedByName || "-"}</td>
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