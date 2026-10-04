import { useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice, imgUrl } from "../../utils/format.js";
import { useCart } from "../../context/CartContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function ProductCard({ product: p }) {
  const { add } = useCart();
  const toast = useToast();
  const [idx, setIdx] = useState(0);

  const gallery = p.Gallery && p.Gallery.length ? p.Gallery : p.ImageUrl ? [p.ImageUrl] : [];
  const hasDiscount = p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price);
  const percent = hasDiscount ? Math.round((1 - Number(p.DiscountPrice) / Number(p.Price)) * 100) : 0;
  const price = hasDiscount ? p.DiscountPrice : p.Price;

  // cursor tasveer par left se right ghumane se tasveer badalti hai
  const onMove = (e) => {
    if (gallery.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setIdx(Math.min(gallery.length - 1, Math.max(0, Math.floor(ratio * gallery.length))));
  };

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    add(p, 1);
    toast.success("Cart me add ho gaya");
  };

  return (
    <Link to={`/product/${p.Id}`} className={`p-card ${p.InStock ? "" : "out"}`}>
      <div className="p-img" onMouseMove={onMove} onMouseLeave={() => setIdx(0)}>
        {gallery.length ? (
          gallery.map((g, i) => (
            <img
              key={`${g}-${i}`}
              src={imgUrl(g)}
              alt={i === 0 ? p.Name : ""}
              loading="lazy"
              className={i === idx ? "show" : ""}
            />
          ))
        ) : (
          <div className="p-noimg">
            <i className="fa-solid fa-image" />
          </div>
        )}

        {hasDiscount && <span className="p-off">-{percent}%</span>}
        {!p.InStock && <span className="p-out">Out of Stock</span>}

        {gallery.length > 1 && (
          <div className="p-dots">
            {gallery.map((_, i) => (
              <span key={i} className={i === idx ? "on" : ""} />
            ))}
          </div>
        )}

        {p.InStock && (
          <button type="button" className="p-quick" onClick={quickAdd}>
            <i className="fa-solid fa-cart-plus" /> Cart me daalein
          </button>
        )}
      </div>

      <div className="p-body">
        {p.BrandName && (
          <span className="p-brand">
            {p.BrandName}
            {p.BrandIsLocal ? <em>Local</em> : null}
          </span>
        )}
        <h3 className="p-name">{p.Name}</h3>
        <div className="p-price">
          <strong>{formatPrice(price)}</strong>
          {hasDiscount && <del>{formatPrice(p.Price)}</del>}
        </div>
      </div>
    </Link>
  );
}