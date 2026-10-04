import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { errorMessage } from "../../config/api.js";
import logo from "../../assets/images/logo.jpeg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      // checkout wagera se aaye the to wahin wapas, warna admin ko panel aur customer ko home
      const fallback = user.role === "admin" ? "/admin" : user.role === "staff" ? "/management" : "/";
      navigate(location.state?.from || fallback, { replace: true });
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
        <h2>Welcome back</h2>
        <p className="auth-sub">Apne account me login karein</p>

        {error && (
          <div className="alert error">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <div className="input-wrap">
            <i className="fa-solid fa-envelope lead" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aapka@email.com"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="field">
          <label>Password</label>
          <div className="input-wrap">
            <i className="fa-solid fa-lock lead" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button
              type="button"
              className="trail"
              onClick={() => setShowPassword((s) => !s)}
              aria-label="Show or hide password"
            >
              <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
            </button>
          </div>
        </div>

        <button type="submit" className="btn primary block" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner dark" /> Please wait...
            </>
          ) : (
            <>
              <i className="fa-solid fa-right-to-bracket" /> Login
            </>
          )}
        </button>

        <p className="auth-switch">
          Naya customer? <Link to="/register" state={location.state}>Account banayen</Link>
        </p>

        <Link to="/" className="auth-back">
          <i className="fa-solid fa-arrow-left" /> Back to website
        </Link>
      </form>
    </div>
  );
}