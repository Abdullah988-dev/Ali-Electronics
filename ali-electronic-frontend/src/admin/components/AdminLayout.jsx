import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { adminApi } from "../../services/adminService.js";
import logo from "../../assets/images/logo.jpeg";

const links = [
  { to: "/admin", label: "Dashboard", icon: "fa-gauge-high", end: true },
  { to: "/admin/orders", label: "Orders", icon: "fa-receipt", badge: true },
  { to: "/admin/categories", label: "Categories", icon: "fa-layer-group" },
  { to: "/admin/brands", label: "Brands", icon: "fa-tags" },
  { to: "/admin/products", label: "Products", icon: "fa-box-open" },
  { to: "/admin/users", label: "Users", icon: "fa-users" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [pending, setPending] = useState(0);
  const lastPending = useRef(null);

  // Har 30 second me pending orders check karo, naya aaye to batao
  useEffect(() => {
    let alive = true;

    const check = () =>
      adminApi
        .summary()
        .then((s) => {
          if (!alive) return;
          if (lastPending.current !== null && s.pendingOrders > lastPending.current) {
            toast.success(`Naya order aaya! (${s.pendingOrders} pending)`);
          }
          lastPending.current = s.pendingOrders;
          setPending(s.pendingOrders);
        })
        .catch(() => {});

    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [toast]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Ali Electronics" />
          <div>
            <strong>Ali Electronics</strong>
            <small>Admin Panel</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? "side-link active" : "side-link")}
            >
              <i className={`fa-solid ${l.icon}`} />
              <span>{l.label}</span>
              {l.badge && pending > 0 && <em className="side-badge">{pending}</em>}
            </NavLink>
          ))}

          <NavLink to="/management" className="side-link" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-warehouse" />
            <span>Management System</span>
          </NavLink>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <Link to="/" className="topbar-link">
            <i className="fa-solid fa-globe" /> View Website
          </Link>

          <div className="topbar-user">
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-text">
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
            <button type="button" className="btn small" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket" /> Logout
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}