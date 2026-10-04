import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { orderApi } from "../../services/orderService.js";
import { errorMessage } from "../../config/api.js";
import { formatPrice } from "../../utils/format.js";

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: user?.name || "",
    phone: user?.phone || "",
    city: "",
    address: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  if (items.length === 0 && !saving) {
    return (
      <div className="container page">
        <div className="empty box">
          <i className="fa-solid fa-cart-shopping" />
          Cart khali hai, pehle koi product chunein.
          <div style={{ marginTop: 14 }}>
            <Link to="/products" className="btn primary">
              Products dekhein
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const order = await orderApi.place({
        ...form,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      clear();
      navigate(`/order-success/${order.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="container page">
      <h1>Checkout</h1>

      <div className="cart-layout">
        <form className="form-card" onSubmit={submit}>
          <h3>
            <i className="fa-solid fa-location-dot" /> Delivery ki tafseel
          </h3>

          {error && (
            <div className="alert error">
              <i className="fa-solid fa-circle-exclamation" /> {error}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>
                Poora naam <span className="req">*</span>
              </label>
              <input type="text" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
            </div>
            <div className="field">
              <label>
                Phone number <span className="req">*</span>
              </label>
              <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX XXXXXXX" required />
            </div>
          </div>

          <div className="field">
            <label>Shehar</label>
            <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Karachi" />
          </div>

          <div className="field">
            <label>
              Poora address <span className="req">*</span>
            </label>
            <textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Ghar / flat number, gali, area"
              required
            />
          </div>

          <div className="field">
            <label>Note (optional)</label>
            <input type="text" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Koi khaas hidayat" />
          </div>

          <div className="pay-box">
            <i className="fa-solid fa-money-bill-wave" />
            <div>
              <strong>Cash on Delivery</strong>
              <small>Maal milne par payment karein</small>
            </div>
          </div>

          <button type="submit" className="btn primary block" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner dark" /> Order ho raha hai...
              </>
            ) : (
              <>
                <i className="fa-solid fa-circle-check" /> Order place karein
              </>
            )}
          </button>
        </form>

        <aside className="summary">
          <h3>Aap ka order</h3>
          {items.map((i) => (
            <div key={i.productId} className="mini-item">
              <span>
                {i.name} <small>x {i.quantity}</small>
              </span>
              <span>{formatPrice(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="sum-row total">
            <span>Total</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <Link to="/cart" className="btn small block">
            Cart me tabdeeli
          </Link>
        </aside>
      </div>
    </div>
  );
}