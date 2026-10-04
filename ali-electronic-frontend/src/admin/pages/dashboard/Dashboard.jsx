import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../../services/adminService.js";
import { errorMessage } from "../../../config/api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { formatPrice } from "../../../utils/format.js";

const STATUS_CLASS = { Pending: "warn", Confirmed: "intl", Shipped: "intl", Delivered: "ok", Cancelled: "off" };

const ORDER_CARDS = [
  { key: "pendingOrders", label: "Pending Orders", icon: "fa-bell", to: "/admin/orders", hot: true },
  { key: "todayOrders", label: "Aaj ke orders", icon: "fa-calendar-day", to: "/admin/orders" },
  { key: "totalOrders", label: "Total orders", icon: "fa-receipt", to: "/admin/orders" },
  { key: "revenue", label: "Delivered orders ki sale", icon: "fa-sack-dollar", to: "/admin/orders", money: true },
];

const SHOP_CARDS = [
  { key: "products", label: "Products", icon: "fa-box-open", to: "/admin/products" },
  { key: "categories", label: "Categories", icon: "fa-layer-group", to: "/admin/categories" },
  { key: "brands", label: "Brands", icon: "fa-tags", to: "/admin/brands" },
  { key: "lowStock", label: "Low stock", icon: "fa-triangle-exclamation", to: "/admin/products" },
  { key: "outOfStock", label: "Out of stock", icon: "fa-circle-xmark", to: "/admin/products" },
];

const fmtDate = (d) => new Date(d).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminApi
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

  const renderCard = (c) => (
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
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Welcome, {user?.name} 👋</h2>
          <p className="muted">Apni dukan ka saara data yahan se manage karein.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="stat-grid">{ORDER_CARDS.map(renderCard)}</div>

      <div className="dash-block">
        <h3>Dukan</h3>
        <div className="stat-grid small">{SHOP_CARDS.map(renderCard)}</div>
      </div>

      <div className="dash-block">
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 0 }}>Haal ke orders</h3>
          <Link to="/admin/orders" className="link-more">
            Sab orders dekhein <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats && stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="empty">
                      <i className="fa-solid fa-receipt" />
                      Abhi tak koi order nahi aaya.
                    </div>
                  </td>
                </tr>
              )}
              {stats?.recentOrders.map((o) => (
                <tr key={o.Id}>
                  <td>
                    <Link to="/admin/orders">
                      <strong>#{o.Id}</strong>
                    </Link>
                  </td>
                  <td>{o.CustomerName}</td>
                  <td>
                    <strong>{formatPrice(o.TotalAmount)}</strong>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[o.Status] || "off"}`}>{o.Status}</span>
                  </td>
                  <td className="muted">{fmtDate(o.CreatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}