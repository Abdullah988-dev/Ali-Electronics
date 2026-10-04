import { Link } from "react-router-dom";
import useTitle from "../hooks/useTitle.js";

export default function NotFound() {
  useTitle("Page nahi mila");

  return (
    <div className="container page">
      <div className="empty box">
        <i className="fa-solid fa-compass" />
        <h2 style={{ marginBottom: 6 }}>404 - Ye page nahi mila</h2>
        <p>Jo address aap ne likha hai wo maujood nahi hai.</p>
        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" className="btn primary">
            <i className="fa-solid fa-house" /> Home
          </Link>
          <Link to="/products" className="btn">
            Products dekhein
          </Link>
        </div>
      </div>
    </div>
  );
}