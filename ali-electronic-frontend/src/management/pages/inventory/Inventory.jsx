import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { mgmtApi } from "../../../services/managementService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, imgUrl } from "../../../utils/format.js";

const TABS = ["All", "In Stock", "Low Stock", "Out of Stock"];
const BADGE = { "In Stock": "ok", "Low Stock": "warn", "Out of Stock": "off" };
const REM_CLASS = { "In Stock": "num-in", "Low Stock": "warn-text", "Out of Stock": "num-out" };

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("status")) ? params.get("status") : "All";

  const [data, setData] = useState({ items: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    mgmtApi
      .inventory()
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const map = new Map();
    data.items.forEach((i) => map.set(i.CategoryId, i.CategoryName));
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data.items]);

  const counts = useMemo(
    () => ({
      All: data.items.length,
      "In Stock": data.items.filter((i) => i.StockStatus === "In Stock").length,
      "Low Stock": data.items.filter((i) => i.StockStatus === "Low Stock").length,
      "Out of Stock": data.items.filter((i) => i.StockStatus === "Out of Stock").length,
    }),
    [data.items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.items.filter((i) => {
      if (tab !== "All" && i.StockStatus !== tab) return false;
      if (categoryId && String(i.CategoryId) !== categoryId) return false;
      if (!q) return true;
      return [i.Name, i.Sku, i.BrandName, i.CategoryName].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [data.items, tab, categoryId, search]);

  const changeTab = (t) => setParams(t === "All" ? {} : { status: t });
  const t = data.totals;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Inventory</h2>
          <p className="muted">Har product ka aaya, gaya aur baaki.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="stat-grid small" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-box-open" /></div>
          <div className="stat-info">
            <span className="stat-num">{t.products ?? "-"}</span>
            <span className="stat-label">Products</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-cubes" /></div>
          <div className="stat-info">
            <span className="stat-num">{t.units ?? "-"}</span>
            <span className="stat-label">Pieces maujood</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-sack-dollar" /></div>
          <div className="stat-info">
            <span className="stat-num money">{t.stockValue !== undefined ? formatPrice(t.stockValue) : "-"}</span>
            <span className="stat-label">Maal ki qeemat</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((x) => (
          <button key={x} type="button" className={`tab ${tab === x ? "active" : ""}`} onClick={() => changeTab(x)}>
            {x} <em>{counts[x]}</em>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Naam, SKU ya brand se dhundein..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Saari categories</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <span className="muted">{filtered.length} products</span>
      </div>

      <div className="table-wrap">
        <table className="table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category / Brand</th>
              <th>Aaya</th>
              <th>Gaya</th>
              <th>Baaki</th>
              <th>Halat</th>
              <th>Kharid rate</th>
              <th>Website</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="9" className="center muted">
                  <span className="spinner" /> Loading...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="9">
                  <div className="empty">
                    <i className="fa-solid fa-boxes-stacked" />
                    Koi product nahi mila.
                  </div>
                </td>
              </tr>
            )}

            {filtered.map((i) => (
              <tr key={i.Id}>
                <td>
                  <div className="prod-cell">
                    {i.ImageUrl ? (
                      <img className="thumb" src={imgUrl(i.ImageUrl)} alt={i.Name} />
                    ) : (
                      <div className="thumb thumb-empty">{i.Name.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="prod-info">
                      <strong>{i.Name}</strong>
                      {i.Sku && <small className="muted">SKU: {i.Sku}</small>}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="prod-info">
                    <span>{i.CategoryName}</span>
                    <small className="muted">{i.BrandName || "No brand"}</small>
                  </div>
                </td>
                <td className="num-in">{i.TotalIn}</td>
                <td className="num-out">{i.TotalOut}</td>
                <td>
                  <strong className={REM_CLASS[i.StockStatus]}>{i.Remaining}</strong>
                </td>
                <td>
                  <span className={`badge ${BADGE[i.StockStatus]}`}>{i.StockStatus}</span>
                </td>
                <td>{Number(i.LastCost) > 0 ? formatPrice(i.LastCost) : <span className="muted">likhi nahi</span>}</td>
                <td>
                  <span className={`badge ${i.IsPublished ? "ok" : "off"}`}>{i.IsPublished ? "Published" : "Hidden"}</span>
                </td>
                <td className="actions">
                  <Link to={`/management/stock-in?product=${i.Id}`} className="btn small" title="Maal aaya">
                    <i className="fa-solid fa-circle-arrow-down" /> In
                  </Link>
                  <Link to={`/management/stock-out?product=${i.Id}`} className="btn small" title="Maal gaya">
                    <i className="fa-solid fa-circle-arrow-up" /> Out
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}