import { useEffect, useState } from "react";
import { mgmtApi } from "../../../services/managementService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, dateInput } from "../../../utils/format.js";

const ago = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateInput(d);
};
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return dateInput(d);
};

const PRESETS = [
  { label: "Aaj", range: () => [dateInput(), dateInput()] },
  { label: "Pichle 7 din", range: () => [ago(6), dateInput()] },
  { label: "Pichle 30 din", range: () => [ago(29), dateInput()] },
  { label: "Is mahine", range: () => [monthStart(), dateInput()] },
];

const LABEL = {
  "Shop Sale": "Dukan par sale",
  "Online Order": "Online order",
  Damage: "Kharabi / toot phoot",
  "Return to Supplier": "Supplier ko wapsi",
  Other: "Aur wajah",
};

export default function Reports() {
  const [from, setFrom] = useState(ago(29));
  const [to, setTo] = useState(dateInput());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    mgmtApi
      .report({ from, to })
      .then((r) => alive && setData(r))
      .catch((err) => alive && setError(errorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to]);

  const applyPreset = (preset) => {
    const [f, t] = preset.range();
    setFrom(f);
    setTo(t);
  };

  const missingCost = data ? data.products.filter((p) => p.QtyOut > 0 && Number(p.AvgCost) === 0) : [];

  const downloadCsv = () => {
    if (!data) return;
    const head = ["Product", "Category", "Aaya", "Kharid lagat", "Gaya", "Sale", "Munafa (andaza)", "Baaki"];
    const rows = data.products.map((p) => [p.Name, p.CategoryName, p.QtyIn, p.CostIn, p.QtyOut, p.Revenue, p.Profit, p.Remaining]);
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${data.from}-to-${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Reports</h2>
          <p className="muted">Chuni hui muddat me kitna maal aaya, kitna gaya aur kitni sale hui.</p>
        </div>
        <button type="button" className="btn" onClick={downloadCsv} disabled={!data || data.products.length === 0}>
          <i className="fa-solid fa-file-csv" /> Excel (CSV) download
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="filters-row">
        <div className="field">
          <label>Se</label>
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>Tak</label>
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn small" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="center muted" style={{ padding: 30 }}>
          <span className="spinner" /> Loading...
        </div>
      )}

      {data && !loading && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon"><i className="fa-solid fa-circle-arrow-down" /></div>
              <div className="stat-info">
                <span className="stat-num">{data.totals.qtyIn} pcs</span>
                <span className="stat-label">Maal aaya ({formatPrice(data.totals.costIn)})</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fa-solid fa-circle-arrow-up" /></div>
              <div className="stat-info">
                <span className="stat-num">{data.totals.qtyOut} pcs</span>
                <span className="stat-label">Maal gaya</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fa-solid fa-sack-dollar" /></div>
              <div className="stat-info">
                <span className="stat-num money">{formatPrice(data.totals.revenue)}</span>
                <span className="stat-label">Kul sale</span>
              </div>
            </div>
            <div className="stat-card hot">
              <div className="stat-icon"><i className="fa-solid fa-chart-line" /></div>
              <div className="stat-info">
                <span className="stat-num money">{formatPrice(data.totals.profit)}</span>
                <span className="stat-label">Munafa (andaza)</span>
              </div>
            </div>
          </div>

          {missingCost.length > 0 && (
            <div className="hint">
              <i className="fa-solid fa-triangle-exclamation" />
              <span>
                In products ka kharid rate likha nahi, is liye un ka munafa zyada nazar aa raha hai:{" "}
                <strong>{missingCost.map((p) => p.Name).join(", ")}</strong>. Stock In me kharid rate likh dein.
              </span>
            </div>
          )}

          {data.byReason.length > 0 && (
            <div className="panel">
              <h3>
                <i className="fa-solid fa-list" /> Maal kis wajah se gaya
              </h3>
              <table className="mini-table">
                <tbody>
                  {data.byReason.map((r) => (
                    <tr key={r.Reason}>
                      <td>{LABEL[r.Reason] || r.Reason}</td>
                      <td>{r.Qty} pcs</td>
                      <td style={{ textAlign: "right" }}>{formatPrice(r.Revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-wrap">
            <table className="table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Aaya</th>
                  <th>Kharid lagat</th>
                  <th>Gaya</th>
                  <th>Sale</th>
                  <th>Munafa (andaza)</th>
                  <th>Baaki</th>
                </tr>
              </thead>
              <tbody>
                {data.products.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      <div className="empty">
                        <i className="fa-solid fa-chart-line" />
                        Is muddat me koi entry nahi hai.
                      </div>
                    </td>
                  </tr>
                )}
                {data.products.map((p) => (
                  <tr key={p.ProductId}>
                    <td>
                      <strong>{p.Name}</strong>
                    </td>
                    <td className="muted">{p.CategoryName}</td>
                    <td className="num-in">{p.QtyIn}</td>
                    <td>{p.CostIn > 0 ? formatPrice(p.CostIn) : <span className="muted">-</span>}</td>
                    <td className="num-out">{p.QtyOut}</td>
                    <td>{p.Revenue > 0 ? formatPrice(p.Revenue) : <span className="muted">-</span>}</td>
                    <td>
                      <strong className={p.Profit < 0 ? "num-out" : p.Profit > 0 ? "num-in" : ""}>
                        {p.QtyOut > 0 ? formatPrice(p.Profit) : "-"}
                      </strong>
                    </td>
                    <td>{p.Remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}