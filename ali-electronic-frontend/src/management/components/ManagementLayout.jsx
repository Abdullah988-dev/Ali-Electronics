import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import logo from "../../assets/images/logo.jpeg";

const links = [
  { to: "/management", label: "Dashboard", icon: "fa-gauge-high", end: true },
  { to: "/management/inventory", label: "Inventory", icon: "fa-boxes-stacked" },
  { to: "/management/stock-in", label: "Stock In (maal aaya)", icon: "fa-circle-arrow-down" },
  { to: "/management/stock-out", label: "Stock Out (maal gaya)", icon: "fa-circle-arrow-up" },
  { to: "/management/suppliers", label: "Suppliers", icon: "fa-handshake" },
  { to: "/management/reports", label: "Reports", icon: "fa-chart-line" },
];

export default function ManagementLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <small>Management System</small>
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
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div style={{ display: "flex", gap: 20 }}>
            {user?.role === "admin" && (
              <Link to="/admin" className="topbar-link">
                <i className="fa-solid fa-user-shield" /> Admin Panel
              </Link>
            )}
            <Link to="/" className="topbar-link">
              <i className="fa-solid fa-globe" /> Website
            </Link>
          </div>

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