import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mgmtApi } from "../../../services/managementService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, formatDate } from "../../../utils/format.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const BADGE = { "Low Stock": "warn", "Out of Stock": "off" };

const CARDS = [
  { key: "products", label: "Total products", icon: "fa-box-open", to: "/management/inventory" },
  { key: "units", label: "Maal maujood (pieces)", icon: "fa-cubes", to: "/management/inventory" },
  { key: "stockValue", label: "Maal ki qeemat (kharid rate par)", icon: "fa-sack-dollar", to: "/management/inventory", money: true },
  { key: "lowStock", label: "Low stock", icon: "fa-triangle-exclamation", to: "/management/inventory?status=Low%20Stock", hot: true },
  { key: "outOfStock", label: "Out of stock", icon: "fa-circle-xmark", to: "/management/inventory?status=Out%20of%20Stock", hot: true },
  { key: "todayIn", label: "Aaj maal aaya", icon: "fa-circle-arrow-down", to: "/management/stock-in" },
  { key: "todayOut", label: "Aaj maal gaya", icon: "fa-circle-arrow-up", to: "/management/stock-out" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      mgmtApi
        .summary()
        .then((s) => alive && setStats(s))
        .catch((err) => alive && setError(errorMessage(err)));

    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Welcome, {user?.name} 👋</h2>
          <p className="muted">Maal ka poora hisaab: kitna aaya, kitna gaya, kitna baaki.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/management/stock-in" className="btn primary">
            <i className="fa-solid fa-circle-arrow-down" /> Maal aaya
          </Link>
          <Link to="/management/stock-out" className="btn">
            <i className="fa-solid fa-circle-arrow-up" /> Maal gaya
          </Link>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="stat-grid">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.to} className={`stat-card ${c.hot && stats?.[c.key] > 0 ? "hot" : ""}`}>
            <div className="stat-icon">
              <i className={`fa-solid ${c.icon}`} />
            </div>
            <div className="stat-info">
              <span className={`stat-num ${c.money ? "money" : ""}`}>
                {stats ? (c.money ? formatPrice(stats[c.key]) : stats[c.key]) : "-"}
              </span>
              <span className="stat-label">{c.label}</span>
            </div>
            <i className="fa-solid fa-arrow-right stat-arrow" />
          </Link>
        ))}
      </div>

      <div className="two-col dash-block">
        <div className="panel" style={{ marginBottom: 0 }}>
          <h3>
            <i className="fa-solid fa-triangle-exclamation" /> Jin ka maal kam hai
          </h3>
          {stats && stats.lowItems.length === 0 ? (
            <p className="muted">Sab products ka maal theek hai.</p>
          ) : (
            <table className="mini-table">
              <tbody>
                {stats?.lowItems.map((i) => (
                  <tr key={i.Id}>
                    <td>
                      <strong>{i.Name}</strong>
                      <br />
                      <small className="muted">
                        Baaki {i.Remaining} (alert {i.LowStockLimit})
                      </small>
                    </td>
                    <td>
                      <span className={`badge ${BADGE[i.StockStatus] || "off"}`}>{i.StockStatus}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/management/stock-in?product=${i.Id}`} className="btn small">
                        <i className="fa-solid fa-plus" /> Maal add
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <h3>
            <i className="fa-solid fa-clock-rotate-left" /> Haal ki movements
          </h3>
          {stats && stats.recentMoves.length === 0 ? (
            <p className="muted">Abhi koi entry nahi hai.</p>
          ) : (
            <table className="mini-table">
              <tbody>
                {stats?.recentMoves.map((m) => (
                  <tr key={`${m.Type}-${m.Id}`}>
                    <td style={{ width: 40 }}>
                      <span className={`move-icon ${m.Type}`}>
                        <i className={`fa-solid ${m.Type === "in" ? "fa-arrow-down" : "fa-arrow-up"}`} />
                      </span>
                    </td>
                    <td>
                      {m.ProductName}
                      <br />
                      <small className="muted">
                        {m.Type === "out" && m.Reason ? `${m.Reason} • ` : ""}
                        {formatDate(m.CreatedAt)}
                      </small>
                    </td>
                    <td style={{ textAlign: "right" }} className={m.Type === "in" ? "num-in" : "num-out"}>
                      {m.Type === "in" ? "+" : "-"}
                      {m.Quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}