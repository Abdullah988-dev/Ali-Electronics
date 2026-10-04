import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.jpeg";

export default function Footer({ categories }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <div className="footer-brand">
            <img src={logo} alt="Ali Electronics" />
            <strong>Ali Electronics</strong>
          </div>
          <p>Your Electronics Partner. Fans, washing machines, stabilizers aur ghar ke baaki electronics, local aur international brands me.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">All Products</Link></li>
          </ul>
        </div>

        <div>
          <h4>Categories</h4>
          <ul>
            {categories.slice(0, 6).map((c) => (
              <li key={c.Id}>
                <Link to={`/products?category=${c.Slug}`}>{c.Name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">© {new Date().getFullYear()} Ali Electronics. All rights reserved.</div>
      </div>
    </footer>
  );
}