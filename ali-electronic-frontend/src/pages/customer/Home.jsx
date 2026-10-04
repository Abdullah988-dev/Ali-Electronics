import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../../services/catalogService.js";
import { errorMessage } from "../../config/api.js";
import { imgUrl } from "../../utils/format.js";
import ProductCard from "../../components/product/ProductCard.jsx";
import heroLogo from "../../assets/images/hero-logo.jpeg";

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    catalogApi
      .home()
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const noProducts = Boolean(data) && data.featured.length === 0 && data.sections.length === 0;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="home-hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <span className="eyebrow">
              <i className="fa-solid fa-bolt" /> Your Electronics Partner
            </span>
            <h1>
              Ghar ki har zarurat, <span className="grad-text">Ali Electronics</span> par
            </h1>
            <p>Fans, washing machines, stabilizers aur bohat kuch. Local aur international brands, asaan ordering aur Cash on Delivery.</p>

            <div className="hero-cta">
              <Link to="/products" className="btn primary lg">
                <i className="fa-solid fa-bag-shopping" /> Shop Now
              </Link>
              <a href="#categories" className="btn lg">
                <i className="fa-solid fa-layer-group" /> Categories
              </a>
            </div>

            <div className="hero-points">
              <span><i className="fa-solid fa-truck-fast" /> Cash on Delivery</span>
              <span><i className="fa-solid fa-tags" /> Local &amp; International brands</span>
              <span><i className="fa-solid fa-circle-check" /> Stock ki live maloomat</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hv-glow" />
            <div className="hv-ring" />
            <div className="hv-ring r2" />
            <img src={heroLogo} alt="Ali Electronics - Your Electronics Partner" className="hv-logo" />
          </div>
        </div>
      </section>

      {error && (
        <div className="container">
          <div className="alert error">{error}</div>
        </div>
      )}

      {!data && !error && (
        <div className="container center muted section">
          <span className="spinner" /> Loading...
        </div>
      )}

      {data && (
        <>
          {/* ---------- Categories ---------- */}
          <section className="section" id="categories">
            <div className="container">
              <div className="section-head">
                <div>
                  <h2>Shop by Category</h2>
                  <p className="muted">Apni zarurat ki category chunein</p>
                </div>
              </div>

              {data.categories.length === 0 ? (
                <div className="empty box">
                  <i className="fa-solid fa-layer-group" />
                  Abhi koi category nahi hai.
                </div>
              ) : (
                <div className="cat-grid">
                  {data.categories.map((c) => (
                    <Link key={c.Id} to={`/products?category=${c.Slug}`} className="cat-card">
                      {c.ImageUrl ? (
                        <img src={imgUrl(c.ImageUrl)} alt={c.Name} />
                      ) : (
                        <div className="cat-letter">{c.Name.charAt(0).toUpperCase()}</div>
                      )}
                      <h3>{c.Name}</h3>
                      <small>{c.ProductCount} products</small>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ---------- Featured (sirf tab jab koi product Featured ho) ---------- */}
          {data.featured.length > 0 && (
            <section className="section tight">
              <div className="container">
                <div className="section-head">
                  <div>
                    <h2>
                      <i className="fa-solid fa-star sec-icon" /> Featured Products
                    </h2>
                    <p className="muted">Hamare khaas products</p>
                  </div>
                </div>
                <div className="p-grid">
                  {data.featured.map((p) => (
                    <ProductCard key={p.Id} product={p} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ---------- Har category ka apna section ---------- */}
          {data.sections.map(({ category, products, total }) => (
            <section key={category.Id} className="section tight">
              <div className="container">
                <div className="section-head">
                  <div>
                    <h2>{category.Name}</h2>
                    <p className="muted">{total} products</p>
                  </div>
                  <Link to={`/products?category=${category.Slug}`} className="link-more">
                    Sab dekhein <i className="fa-solid fa-arrow-right" />
                  </Link>
                </div>
                <div className="p-grid">
                  {products.map((p) => (
                    <ProductCard key={p.Id} product={p} />
                  ))}
                </div>
              </div>
            </section>
          ))}

          {noProducts && (
            <section className="section">
              <div className="container">
                <div className="empty box">
                  <i className="fa-solid fa-box-open" />
                  Abhi koi product nahi hai. Admin panel se product add karein.
                </div>
              </div>
            </section>
          )}

          {/* ---------- Brands ---------- */}
          {data.brands.length > 0 && (
            <section className="section">
              <div className="container">
                <div className="section-head">
                  <div>
                    <h2>Our Brands</h2>
                    <p className="muted">Local aur international brands</p>
                  </div>
                </div>
                <div className="brand-row">
                  {data.brands.map((b) => (
                    <Link key={b.Id} to={`/products?brand=${b.Id}`} className="brand-chip">
                      {b.LogoUrl && <img src={imgUrl(b.LogoUrl)} alt={b.Name} />}
                      <span>
                        <strong>{b.Name}</strong>
                        <small>{b.CategoryName}</small>
                      </span>
                      <em className={b.IsLocal ? "tag-local" : "tag-intl"}>{b.IsLocal ? "Local" : "Intl"}</em>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}