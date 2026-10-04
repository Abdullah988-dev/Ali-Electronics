import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import logo from "../../assets/images/logo.jpeg";

export default function Navbar({ categories }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");

  const onProducts = location.pathname === "/products";
  const current = onProducts ? new URLSearchParams(location.search).get("category") : null;

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/products?search=${encodeURIComponent(term)}` : "/products");
  };

  return (
    <header className="nav">
      <div className="topnote">
        <i className="fa-solid fa-truck-fast" /> Cash on Delivery &nbsp;•&nbsp; Local aur International brands
      </div>

      <div className="container nav-row">
        <Link to="/" className="nav-logo">
          <img src={logo} alt="Ali Electronics" />
          <span>
            <strong>Ali Electronics</strong>
            <small>YOUR ELECTRONICS PARTNER</small>
          </span>
        </Link>

        <form className="nav-search" onSubmit={submit}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Fan, washing machine, stabilizer dhundein..."
          />
          <button type="submit" aria-label="Search">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
        </form>

        <div className="nav-actions">
          <Link to="/cart" className="nav-cart" aria-label="Cart">
            <i className="fa-solid fa-cart-shopping" />
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          {user ? (
            <>
              <Link to="/orders" className="nav-link-text">
                <i className="fa-solid fa-box" /> My Orders
              </Link>
              <span className="nav-user">
                <i className="fa-solid fa-user" /> {user.name.split(" ")[0]}
              </span>
              <button type="button" className="btn small" onClick={logout}>
                <i className="fa-solid fa-right-from-bracket" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn small">
                <i className="fa-solid fa-right-to-bracket" /> Login
              </Link>
              <Link to="/register" className="btn small primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="cat-strip">
        <div className="container cat-strip-row">
          <Link to="/products" className={onProducts && !current ? "active" : ""}>
            <i className="fa-solid fa-border-all" /> All Products
          </Link>
          {categories.map((c) => (
            <Link key={c.Id} to={`/products?category=${c.Slug}`} className={current === c.Slug ? "active" : ""}>
              {c.Name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}