import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { catalogApi } from "../../services/catalogService.js";
import { formatPrice, imgUrl } from "../../utils/format.js";
import { useCart } from "../../context/CartContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import ProductCard from "../../components/product/ProductCard.jsx";
import useTitle from "../../hooks/useTitle.js";
import ImageGallery from "../../components/product/ImageGallery.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
    useTitle(product ? product.Name : "Product");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setRelated([]);
    setQty(1);

    catalogApi
      .product(id)
      .then(async (p) => {
        if (cancelled) return;
        setProduct(p);
        try {
          const rel = await catalogApi.products({ categoryId: p.CategoryId, limit: 5 });
          if (!cancelled) setRelated(rel.items.filter((x) => x.Id !== p.Id).slice(0, 4));
        } catch {
          /* related products zaroori nahi */
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container center muted section">
        <span className="spinner" /> Loading...
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container section">
        <div className="empty box">
          <i className="fa-solid fa-circle-exclamation" />
          Ye product nahi mila ya website par available nahi hai.
          <div style={{ marginTop: 14 }}>
            <Link to="/products" className="btn primary">
              Products dekhein
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const p = product;
  const gallery = p.Images && p.Images.length ? p.Images.map((i) => i.ImageUrl) : p.ImageUrl ? [p.ImageUrl] : [];
  const hasDiscount = p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price);
  const percent = hasDiscount ? Math.round((1 - Number(p.DiscountPrice) / Number(p.Price)) * 100) : 0;
  const low = p.InStock && p.StockQuantity <= p.LowStockLimit;
  const stockClass = !p.InStock ? "off" : low ? "warn" : "ok";
  const stockText = !p.InStock ? "Out of Stock" : low ? `Sirf ${p.StockQuantity} bache hain` : "In Stock";

  const addToCart = () => {
    add(p, qty);
    toast.success("Cart me add ho gaya");
  };

  const buyNow = () => {
    add(p, qty);
    navigate("/checkout");
  };

  return (
    <div className="container detail">
      <nav className="crumbs">
        <Link to="/">Home</Link>
        <i className="fa-solid fa-chevron-right" />
        <Link to={`/products?category=${p.CategorySlug}`}>{p.CategoryName}</Link>
        <i className="fa-solid fa-chevron-right" />
        <span>{p.Name}</span>
      </nav>

      <div className="detail-grid">
        <div className="detail-img">
          {p.ImageUrl ? (
                    <ImageGallery images={gallery} alt={p.Name} />
          ) : (
            <div className="p-noimg big">
              <i className="fa-solid fa-image" />
            </div>
          )}
        </div>

        <div className="detail-info">
          {p.BrandName && (
            <Link to={`/products?brand=${p.BrandId}`} className="detail-brand">
              {p.BrandName}
              <em className={p.BrandIsLocal ? "tag-local" : "tag-intl"}>{p.BrandIsLocal ? "Local" : "International"}</em>
            </Link>
          )}

          <h1>{p.Name}</h1>

          <div className="detail-price">
            <strong>{formatPrice(hasDiscount ? p.DiscountPrice : p.Price)}</strong>
            {hasDiscount && (
              <>
                <del>{formatPrice(p.Price)}</del>
                <span className="detail-off">-{percent}%</span>
              </>
            )}
          </div>

          <div className="detail-meta">
            <span className={`badge ${stockClass}`}>{stockText}</span>
            {p.Sku && <span className="muted">SKU: {p.Sku}</span>}
          </div>

          {p.InStock && (
            <div className="buy-row">
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <i className="fa-solid fa-minus" />
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(p.StockQuantity, q + 1))}
                  disabled={qty >= p.StockQuantity}
                >
                  <i className="fa-solid fa-plus" />
                </button>
              </div>
              <button type="button" className="btn lg" onClick={addToCart}>
                <i className="fa-solid fa-cart-plus" /> Add to Cart
              </button>
              <button type="button" className="btn primary lg" onClick={buyNow}>
                <i className="fa-solid fa-bolt" /> Buy Now
              </button>
            </div>
          )}

          {p.Description && <p className="detail-desc">{p.Description}</p>}

          <ul className="detail-points">
            <li><i className="fa-solid fa-truck-fast" /> Cash on Delivery</li>
            <li><i className="fa-solid fa-layer-group" /> Category: {p.CategoryName}</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head">
            <h2>Milte julte products</h2>
          </div>
          <div className="p-grid">
            {related.map((r) => (
              <ProductCard key={r.Id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}