import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { formatPrice, imgUrl } from "../../utils/format.js";

export default function Cart() {
  const { items, count, subtotal, update, remove, clear } = useCart();

  if (items.length === 0) {
    return (
      <div className="container page">
        <div className="empty box">
          <i className="fa-solid fa-cart-shopping" />
          Aap ka cart khali hai.
          <div style={{ marginTop: 14 }}>
            <Link to="/products" className="btn primary">
              Shopping shuru karein
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Shopping Cart ({count})</h1>

      <div className="cart-layout">
        <div className="cart-list">
          {items.map((i) => (
            <div key={i.productId} className="cart-item">
              <Link to={`/product/${i.productId}`}>
                {i.image ? (
                  <img src={imgUrl(i.image)} alt={i.name} />
                ) : (
                  <div className="ci-noimg">
                    <i className="fa-solid fa-image" />
                  </div>
                )}
              </Link>

              <div className="ci-info">
                <Link to={`/product/${i.productId}`}>{i.name}</Link>
                {i.brand && <small>{i.brand}</small>}
                <span className="ci-price">{formatPrice(i.price)}</span>
              </div>

              <div className="ci-side">
                <div className="qty">
                  <button type="button" onClick={() => update(i.productId, i.quantity - 1)} disabled={i.quantity <= 1}>
                    <i className="fa-solid fa-minus" />
                  </button>
                  <span>{i.quantity}</span>
                  <button type="button" onClick={() => update(i.productId, i.quantity + 1)} disabled={i.quantity >= i.stock}>
                    <i className="fa-solid fa-plus" />
                  </button>
                </div>
                <strong className="ci-total">{formatPrice(i.price * i.quantity)}</strong>
                <button type="button" className="link-btn" onClick={() => remove(i.productId)}>
                  <i className="fa-solid fa-trash" /> Hatayen
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="link-btn" onClick={clear}>
            Poora cart khali karein
          </button>
        </div>

        <aside className="summary">
          <h3>Order Summary</h3>
          <div className="sum-row">
            <span>Items ({count})</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="sum-row total">
            <span>Total</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <p className="note">Payment: Cash on Delivery. Delivery ki tafseel order confirm hone par bataye ge.</p>
          <Link to="/checkout" className="btn primary block">
            Checkout <i className="fa-solid fa-arrow-right" />
          </Link>
          <Link to="/products" className="btn block">
            Shopping jari rakhein
          </Link>
        </aside>
      </div>
    </div>
  );
}