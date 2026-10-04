import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { errorMessage } from "../../config/api.js";
import logo from "../../assets/images/logo.jpeg";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Dono password ek jaise nahi hain");
      return;
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <img src={logo} alt="Ali Electronics" className="auth-logo" />
        <h2>Naya account</h2>
        <p className="auth-sub">Order dene ke liye account banayen</p>

        {error && (
          <div className="alert error">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </div>
        )}

        <div className="field">
          <label>Poora naam</label>
          <div className="input-wrap">
            <i className="fa-solid fa-user lead" />
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Aap ka naam" required autoFocus />
          </div>
        </div>

        <div className="field">
          <label>Email</label>
          <div className="input-wrap">
            <i className="fa-solid fa-envelope lead" />
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="aapka@email.com" required />
          </div>
        </div>

        <div className="field">
          <label>Phone number</label>
          <div className="input-wrap">
            <i className="fa-solid fa-phone lead" />
            <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX XXXXXXX" required />
          </div>
        </div>

        <div className="field">
         <label>Password (kam az kam 8 characters, harf aur number)</label>
          <div className="input-wrap">
            <i className="fa-solid fa-lock lead" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Password"
              minLength={8}
              required
            />
            <button type="button" className="trail" onClick={() => setShowPassword((s) => !s)} aria-label="Show or hide password">
              <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
            </button>
          </div>
        </div>

        <div className="field">
          <label>Password dobara likhein</label>
          <div className="input-wrap">
            <i className="fa-solid fa-lock lead" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Password dobara"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn primary block" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner dark" /> Please wait...
            </>
          ) : (
            <>
              <i className="fa-solid fa-user-plus" /> Account banayen
            </>
          )}
        </button>

        <p className="auth-switch">
          Pehle se account hai? <Link to="/login" state={location.state}>Login karein</Link>
        </p>

        <Link to="/" className="auth-back">
          <i className="fa-solid fa-arrow-left" /> Back to website
        </Link>
      </form>
    </div>
  );
}