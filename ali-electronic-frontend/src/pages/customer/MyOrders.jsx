import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { orderApi } from "../../services/orderService.js";
import { errorMessage } from "../../config/api.js";
import { formatPrice, imgUrl } from "../../utils/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";

const STATUS_CLASS = { Pending: "warn", Confirmed: "intl", Shipped: "intl", Delivered: "ok", Cancelled: "off" };

export default function MyOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toCancel, setToCancel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setError("");
      setOrders(await orderApi.mine());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await orderApi.cancel(toCancel.Id);
      toast.success("Order cancel ho gaya");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setToCancel(null);
    }
  };

  return (
    <div className="container page">
      <h1>My Orders</h1>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="center muted section">
          <span className="spinner" /> Loading...
        </div>
      ) : orders.length === 0 ? (
        <div className="empty box">
          <i className="fa-solid fa-box-open" />
          Aap ne abhi tak koi order nahi diya.
          <div style={{ marginTop: 14 }}>
            <Link to="/products" className="btn primary">
              Shopping shuru karein
            </Link>
          </div>
        </div>
      ) : (
        <div className="orders">
          {orders.map((o) => (
            <div key={o.Id} className="order-card">
              <div className="order-head">
                <div>
                  <strong>Order #{o.Id}</strong>
                  <small className="muted">
                    {" "}
                    • {new Date(o.CreatedAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </small>
                </div>
                <span className={`badge ${STATUS_CLASS[o.Status] || "off"}`}>{o.Status}</span>
              </div>

              <div className="order-items">
                {o.Items.map((i) => (
                  <div key={i.Id} className="oi-row">
                    {i.ImageUrl ? (
                      <img src={imgUrl(i.ImageUrl)} alt={i.ProductName} />
                    ) : (
                      <div className="oi-noimg">
                        <i className="fa-solid fa-image" />
                      </div>
                    )}
                    <div className="oi-info">
                      <span>{i.ProductName}</span>
                      <small className="muted">
                        {formatPrice(i.Price)} x {i.Quantity}
                      </small>
                    </div>
                    <strong>{formatPrice(i.Price * i.Quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="order-foot">
                <div>
                  <small className="muted">Total (Cash on Delivery)</small>
                  <br />
                  <strong className="order-total">{formatPrice(o.TotalAmount)}</strong>
                </div>
                {o.Status === "Pending" && (
                  <button type="button" className="btn small danger" onClick={() => setToCancel(o)}>
                    <i className="fa-solid fa-ban" /> Order cancel karein
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toCancel && (
        <ConfirmDialog
          title="Order cancel karna hai?"
          message={`Order #${toCancel.Id} cancel ho jaye ga aur maal wapas stock me chala jaye ga.`}
          confirmText="Haan, cancel karein"
          busy={busy}
          onConfirm={confirmCancel}
          onCancel={() => setToCancel(null)}
        />
      )}
    </div>
  );
}